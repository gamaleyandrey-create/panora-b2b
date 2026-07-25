-- Panora v240: repair missing delivery notes for orders already marked as shipped.
-- Safe to run more than once. It never deletes orders, notes, or payments.

alter table public.delivery_notes
  add column if not exists payment_due_date date,
  add column if not exists offline_received_at timestamptz,
  add column if not exists offline_receiver text,
  add column if not exists offline_signature text;

insert into public.delivery_notes (
  order_id,
  restaurant_id,
  delivered_at,
  total
)
select
  o.id,
  o.restaurant_id,
  coalesce(bd.delivery_date, bd.bake_date, current_date) + time '12:00',
  coalesce(sum(oi.quantity * oi.unit_price), 0)
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
on conflict (order_id) do nothing;

notify pgrst, 'reload schema';
