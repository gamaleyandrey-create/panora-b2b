-- Panora 10.36 · B2B delivery logistics
-- Safe additive migration. Existing delivery notes keep their current totals.

alter table public.delivery_notes
  add column if not exists goods_total numeric(12,2),
  add column if not exists delivery_method text,
  add column if not exists delivery_distance_km numeric(12,2) not null default 0,
  add column if not exists delivery_rate_per_km numeric(12,4) not null default 0,
  add column if not exists delivery_extra_cost numeric(12,2) not null default 0,
  add column if not exists transport_cost numeric(12,2) not null default 0,
  add column if not exists delivery_charge numeric(12,2) not null default 0;

update public.delivery_notes
set goods_total = total
where goods_total is null;

alter table public.delivery_notes
  alter column goods_total set default 0;

comment on column public.delivery_notes.goods_total is 'Gross value of bread/items before B2B delivery charge';
comment on column public.delivery_notes.delivery_method is 'bakery_vehicle, courier, or partner_pickup';
comment on column public.delivery_notes.transport_cost is 'Internal bakery transport cost; does not increase partner debt';
comment on column public.delivery_notes.delivery_charge is 'Charge billed to partner; included in delivery_notes.total by Panora 10.36';
