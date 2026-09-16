-- Panora 10.73 — partner quality cases / complaints / returns.
-- Backward-compatible: adds one table and RLS policies only.

create table if not exists public.partner_quality_cases (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  delivery_note_id uuid references public.delivery_notes(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  product_id text references public.products(id) on delete set null,
  lot_number text not null default '',
  case_type text not null default 'complaint'
    check (case_type in ('complaint','return','quality')),
  description text not null check (length(trim(description)) between 3 and 4000),
  requested_action text not null default '',
  status text not null default 'open'
    check (status in ('open','fixing','closed')),
  bakery_response text not null default '',
  responsible text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partner_quality_cases_restaurant_created_idx
  on public.partner_quality_cases (restaurant_id, created_at desc);
create index if not exists partner_quality_cases_delivery_note_idx
  on public.partner_quality_cases (delivery_note_id);
create index if not exists partner_quality_cases_status_idx
  on public.partner_quality_cases (status, updated_at desc);

alter table public.partner_quality_cases enable row level security;

drop policy if exists partner_quality_cases_admin_all on public.partner_quality_cases;
create policy partner_quality_cases_admin_all on public.partner_quality_cases
for all to authenticated
using (public.panora_is_admin())
with check (public.panora_is_admin());

drop policy if exists partner_quality_cases_restaurant_read on public.partner_quality_cases;
create policy partner_quality_cases_restaurant_read on public.partner_quality_cases
for select to authenticated
using (restaurant_id = public.panora_restaurant_id());

drop policy if exists partner_quality_cases_restaurant_insert on public.partner_quality_cases;
create policy partner_quality_cases_restaurant_insert on public.partner_quality_cases
for insert to authenticated
with check (
  restaurant_id = public.panora_restaurant_id()
  and created_by = auth.uid()
  and (
    delivery_note_id is null
    or exists (
      select 1 from public.delivery_notes dn
      where dn.id = delivery_note_id
        and dn.restaurant_id = public.panora_restaurant_id()
    )
  )
  and (
    order_id is null
    or exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.restaurant_id = public.panora_restaurant_id()
    )
  )
);

revoke all on public.partner_quality_cases from anon;
grant select, insert, update on public.partner_quality_cases to authenticated;

notify pgrst, 'reload schema';
