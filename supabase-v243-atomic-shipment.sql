-- Panora v243
-- Atomic shipment: order, actual quantities, delivery note and payment
-- are committed in one database transaction.

alter table public.delivery_notes
  add column if not exists payment_due_date date,
  add column if not exists offline_received_at timestamptz,
  add column if not exists offline_receiver text,
  add column if not exists offline_signature text;

-- Keep the delivery-note number sequence ahead of existing documents.
do $$
declare
  v_sequence text;
  v_max_number bigint;
begin
  v_sequence := pg_get_serial_sequence('public.delivery_notes', 'note_number');

  if v_sequence is null then
    raise exception 'Sequence for delivery_notes.note_number was not found';
  end if;

  select coalesce(max(note_number), 0)
    into v_max_number
  from public.delivery_notes;

  if v_max_number = 0 then
    perform setval(v_sequence, 1, false);
  else
    perform setval(v_sequence, v_max_number, true);
  end if;
end
$$;

-- Restore delivery notes for older shipped orders that lost their document
-- during a partial client-side shipment. The unique order_id constraint makes
-- this safe to run more than once.
insert into public.delivery_notes (
  order_id,
  restaurant_id,
  delivered_at,
  payment_due_date,
  total
)
select
  o.id,
  o.restaurant_id,
  coalesce(bd.delivery_date, bd.bake_date) + time '12:00',
  null,
  round(coalesce(sum(oi.quantity * oi.unit_price), 0), 2)
from public.orders o
join public.bake_days bd on bd.id = o.bake_day_id
join public.order_items oi on oi.order_id = o.id
where o.status = 'shipped'
  and not exists (
    select 1
    from public.delivery_notes dn
    where dn.order_id = o.id
  )
group by o.id, o.restaurant_id, bd.delivery_date, bd.bake_date
having coalesce(sum(oi.quantity * oi.unit_price), 0) > 0
on conflict (order_id) do nothing;

create or replace function public.panora_ship_order(
  p_order_id uuid,
  p_items jsonb,
  p_payment_amount numeric default 0,
  p_payment_method text default 'Наличные',
  p_payment_due_date date default null
)
returns table (
  delivery_note_id uuid,
  note_number bigint,
  qr_token uuid,
  total numeric,
  order_status public.order_status
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_restaurant_id uuid;
  v_order_status public.order_status;
  v_delivery_note_id uuid;
  v_note_number bigint;
  v_qr_token uuid;
  v_total numeric(12,2);
  v_payment numeric(12,2) := coalesce(p_payment_amount, 0);
begin
  if not public.panora_is_admin() then
    raise exception using
      errcode = '42501',
      message = 'Only a Panora administrator can ship an order';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'Shipment must contain at least one product';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) item
    where nullif(btrim(item->>'product_id'), '') is null
       or coalesce(item->>'quantity', '') !~ '^[1-9][0-9]*$'
  ) then
    raise exception 'Every product must have a valid id and a positive whole quantity';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) item
    group by item->>'product_id'
    having count(*) > 1
  ) then
    raise exception 'The shipment contains duplicate products';
  end if;

  select o.restaurant_id, o.status
    into v_restaurant_id, v_order_status
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'Order was not found';
  end if;

  if v_order_status = 'cancelled' then
    raise exception 'A cancelled order cannot be shipped';
  end if;

  -- Safe retry: return the already-created document without duplicating it.
  select dn.id, dn.note_number, dn.qr_token, dn.total
    into v_delivery_note_id, v_note_number, v_qr_token, v_total
  from public.delivery_notes dn
  where dn.order_id = p_order_id;

  if found then
    return query
      select v_delivery_note_id,
             v_note_number,
             v_qr_token,
             v_total,
             'shipped'::public.order_status;
    return;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) item
    left join public.order_items oi
      on oi.order_id = p_order_id
     and oi.product_id = item->>'product_id'
    where oi.id is null
       or (item->>'quantity')::integer > oi.quantity
  ) then
    raise exception 'Actual quantity cannot exceed the ordered quantity';
  end if;

  -- Products omitted from the actual shipment are removed.
  delete from public.order_items oi
  where oi.order_id = p_order_id
    and not exists (
      select 1
      from jsonb_array_elements(p_items) item
      where item->>'product_id' = oi.product_id
    );

  update public.order_items oi
  set quantity = (item->>'quantity')::integer
  from jsonb_array_elements(p_items) item
  where oi.order_id = p_order_id
    and oi.product_id = item->>'product_id';

  select round(coalesce(sum(oi.quantity * oi.unit_price), 0), 2)
    into v_total
  from public.order_items oi
  where oi.order_id = p_order_id;

  if v_total <= 0 then
    raise exception 'Shipment total must be greater than zero';
  end if;

  if v_payment < 0 or v_payment > v_total then
    raise exception 'Payment must be between zero and the shipment total';
  end if;

  insert into public.delivery_notes (
    order_id,
    restaurant_id,
    delivered_at,
    payment_due_date,
    total
  )
  values (
    p_order_id,
    v_restaurant_id,
    now(),
    p_payment_due_date,
    v_total
  )
  returning id, public.delivery_notes.note_number, public.delivery_notes.qr_token
    into v_delivery_note_id, v_note_number, v_qr_token;

  update public.orders
  set status = 'shipped',
      updated_at = now()
  where id = p_order_id;

  if v_payment > 0 then
    insert into public.payments (
      restaurant_id,
      delivery_note_id,
      amount,
      method,
      note,
      status,
      received_at,
      confirmed_at,
      confirmed_by
    )
    values (
      v_restaurant_id,
      v_delivery_note_id,
      v_payment,
      coalesce(nullif(btrim(p_payment_method), ''), 'Наличные'),
      'Оплата при отгрузке',
      'confirmed',
      now(),
      now(),
      auth.uid()
    );
  end if;

  return query
    select v_delivery_note_id,
           v_note_number,
           v_qr_token,
           v_total,
           'shipped'::public.order_status;
end;
$$;

revoke all on function public.panora_ship_order(uuid, jsonb, numeric, text, date)
  from public, anon;
grant execute on function public.panora_ship_order(uuid, jsonb, numeric, text, date)
  to authenticated;

notify pgrst, 'reload schema';
