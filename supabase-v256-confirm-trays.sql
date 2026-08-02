-- Panora v256: the restaurant confirms received and returned trays.
-- Run the ENTIRE file once in Supabase SQL Editor.
-- Safe for existing orders, invoices and payments.

alter table public.delivery_notes
  add column if not exists customer_trays_received integer,
  add column if not exists customer_trays_returned integer;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'delivery_notes_customer_trays_received_nonnegative') then
    alter table public.delivery_notes add constraint delivery_notes_customer_trays_received_nonnegative
      check (customer_trays_received is null or customer_trays_received >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'delivery_notes_customer_trays_returned_nonnegative') then
    alter table public.delivery_notes add constraint delivery_notes_customer_trays_returned_nonnegative
      check (customer_trays_returned is null or customer_trays_returned >= 0);
  end if;
end $$;

drop function if exists public.panora_delivery_confirmation(uuid);

create function public.panora_delivery_confirmation(p_token uuid)
returns table (
  note_id uuid,
  note_number bigint,
  order_id uuid,
  order_number bigint,
  delivered_at timestamptz,
  delivery_date date,
  customer_confirmed_at timestamptz,
  customer_receiver text,
  trays_delivered integer,
  trays_returned integer,
  tray_balance_after integer,
  customer_trays_received integer,
  customer_trays_returned integer,
  items jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    dn.id, dn.note_number, dn.order_id, o.order_number, dn.delivered_at,
    bd.delivery_date, dn.customer_confirmed_at, dn.customer_receiver,
    dn.trays_delivered, dn.trays_returned, dn.tray_balance_after,
    dn.customer_trays_received, dn.customer_trays_returned,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'product_id', oi.product_id,
          'name_ru', p.name_ru,
          'name_en', p.name_en,
          'name_es', p.name_es,
          'quantity', oi.quantity
        ) order by oi.product_id
      ) filter (where oi.product_id is not null),
      '[]'::jsonb
    )
  from public.delivery_notes dn
  join public.orders o on o.id = dn.order_id
  join public.profiles profile
    on profile.id = auth.uid()
   and profile.role = 'restaurant'
   and profile.restaurant_id = dn.restaurant_id
  left join public.bake_days bd on bd.id = o.bake_day_id
  left join public.order_items oi on oi.order_id = o.id
  left join public.products p on p.id = oi.product_id
  where dn.qr_token = p_token
    and (dn.customer_confirmed_at is not null or dn.delivered_at >= now() - interval '48 hours')
  group by dn.id, dn.note_number, dn.order_id, o.order_number, dn.delivered_at,
    bd.delivery_date, dn.customer_confirmed_at, dn.customer_receiver,
    dn.trays_delivered, dn.trays_returned, dn.tray_balance_after,
    dn.customer_trays_received, dn.customer_trays_returned;
$$;

drop function if exists public.panora_confirm_delivery(uuid, text);
drop function if exists public.panora_confirm_delivery(uuid, text, integer, integer);

create function public.panora_confirm_delivery(
  p_token uuid,
  p_receiver text,
  p_trays_received integer,
  p_trays_returned integer
)
returns table (
  note_id uuid,
  customer_confirmed_at timestamptz,
  customer_receiver text,
  customer_trays_received integer,
  customer_trays_returned integer,
  tray_balance_after integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_restaurant uuid;
  target_note public.delivery_notes%rowtype;
  previous_balance integer;
begin
  select profile.restaurant_id into current_restaurant
  from public.profiles profile
  where profile.id = auth.uid() and profile.role = 'restaurant';

  if current_restaurant is null then return; end if;
  if length(trim(coalesce(p_receiver, ''))) < 2 or length(trim(p_receiver)) > 120 then
    raise exception 'Invalid receiver';
  end if;

  select dn.* into target_note
  from public.delivery_notes dn
  where dn.qr_token = p_token
    and dn.restaurant_id = current_restaurant
    and (dn.customer_confirmed_at is not null or dn.delivered_at >= now() - interval '48 hours')
  for update;

  if target_note.id is null then return; end if;

  select coalesce(sum(
    coalesce(dn.customer_trays_received, dn.trays_delivered)
    - coalesce(dn.customer_trays_returned, dn.trays_returned)
  ), 0)::integer into previous_balance
  from public.delivery_notes dn
  where dn.restaurant_id = current_restaurant
    and (dn.delivered_at, dn.note_number, dn.id) <
        (target_note.delivered_at, target_note.note_number, target_note.id);

  previous_balance := greatest(0, previous_balance);
  if p_trays_received is null or p_trays_received < 0 or p_trays_received > target_note.trays_delivered then
    raise exception 'Invalid received tray quantity';
  end if;
  if p_trays_returned is null or p_trays_returned < 0 or p_trays_returned > previous_balance + p_trays_received then
    raise exception 'Invalid returned tray quantity';
  end if;

  update public.delivery_notes dn
  set customer_confirmed_at = coalesce(dn.customer_confirmed_at, now()),
      customer_receiver = case when dn.customer_confirmed_at is null then trim(p_receiver) else dn.customer_receiver end,
      customer_trays_received = coalesce(dn.customer_trays_received, p_trays_received),
      customer_trays_returned = coalesce(dn.customer_trays_returned, p_trays_returned)
  where dn.id = target_note.id;

  with running as (
    select dn.id,
      greatest(0, sum(
        coalesce(dn.customer_trays_received, dn.trays_delivered)
        - coalesce(dn.customer_trays_returned, dn.trays_returned)
      ) over (partition by dn.restaurant_id order by dn.delivered_at, dn.note_number, dn.id))::integer as balance
    from public.delivery_notes dn
    where dn.restaurant_id = current_restaurant
  )
  update public.delivery_notes dn set tray_balance_after = running.balance
  from running where dn.id = running.id;

  return query
  select dn.id, dn.customer_confirmed_at, dn.customer_receiver,
    dn.customer_trays_received, dn.customer_trays_returned, dn.tray_balance_after
  from public.delivery_notes dn where dn.id = target_note.id;
end;
$$;

revoke all on function public.panora_delivery_confirmation(uuid) from public, anon;
revoke all on function public.panora_confirm_delivery(uuid, text, integer, integer) from public, anon;
grant execute on function public.panora_delivery_confirmation(uuid) to authenticated;
grant execute on function public.panora_confirm_delivery(uuid, text, integer, integer) to authenticated;

notify pgrst, 'reload schema';
