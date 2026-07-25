-- Panora v240: repair missing delivery notes for orders already marked as shipped.
-- Safe to run more than once. It never deletes orders, notes, or payments.

alter table public.delivery_notes
  add column if not exists payment_due_date date,
  add column if not exists offline_received_at timestamptz,
  add column if not exists offline_receiver text,
  add column if not exists offline_signature text;

-- Align the identity sequence with imported delivery-note numbers.
select setval(
  pg_get_serial_sequence('public.delivery_notes', 'note_number'),
  greatest(
    coalesce((select max(note_number) from public.delivery_notes), 0) + 1,
    1
  ),
  false
);

with missing_notes as (
  select
    o.id as order_id,
    o.restaurant_id,
    coalesce(bd.delivery_date, bd.bake_date, current_date) + time '12:00'
      as delivered_at,
    coalesce(sum(oi.quantity * oi.unit_price), 0) as total
  from public.orders o
  join public.bake_days bd on bd.id = o.bake_day_id
  left join public.order_items oi on oi.order_id = o.id
  where o.status = 'shipped'
    and not exists (
      select 1
      from public.delivery_notes dn
      where dn.order_id = o.id
    )
  group by o.id, o.restaurant_id, bd.delivery_date, bd.bake_date
),
numbered_notes as (
  select
    missing_notes.*,
    coalesce((select max(note_number) from public.delivery_notes), 0)
      + row_number() over (order by order_id) as note_number
  from missing_notes
)
insert into public.delivery_notes (
  note_number,
  order_id,
  restaurant_id,
  delivered_at,
  total
)
select
  note_number,
  order_id,
  restaurant_id,
  delivered_at,
  total
from numbered_notes
on conflict (order_id) do nothing;

select setval(
  pg_get_serial_sequence('public.delivery_notes', 'note_number'),
  greatest(
    coalesce((select max(note_number) from public.delivery_notes), 0),
    1
  ),
  true
);

notify pgrst, 'reload schema';
