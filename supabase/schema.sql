-- Panora B2B secure database for Supabase/PostgreSQL
-- Run once in Supabase SQL Editor on a new project.

create extension if not exists pgcrypto;

create type public.panora_role as enum ('admin', 'restaurant');
create type public.order_status as enum ('draft', 'submitted', 'confirmed', 'shipped', 'cancelled');
create type public.inventory_movement_type as enum ('produced', 'shipped', 'returned', 'written_off', 'adjustment');
create type public.ledger_entry_type as enum ('shipment', 'payment', 'credit', 'adjustment');

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tax_id text,
  billing_address text,
  delivery_address text,
  email text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  restaurant_id uuid references public.restaurants(id) on delete restrict,
  role public.panora_role not null default 'restaurant',
  display_name text,
  created_at timestamptz not null default now(),
  constraint restaurant_user_has_restaurant check (role = 'admin' or restaurant_id is not null)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  category text not null default 'yeast_free',
  name_ru text not null,
  name_en text not null,
  name_es text not null,
  box_size_pieces integer not null default 12 check (box_size_pieces > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.restaurant_prices (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  unit_price_eur numeric(12,4) not null check (unit_price_eur >= 0),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  check (valid_until is null or valid_until > valid_from)
);
create unique index restaurant_prices_current_unique
  on public.restaurant_prices (restaurant_id, product_id) where valid_until is null;

create table public.bake_days (
  id uuid primary key default gen_random_uuid(),
  bake_date date not null unique,
  order_cutoff timestamptz not null,
  accepting_orders boolean not null default true,
  notes text
);

create table public.production_schedule (
  id uuid primary key default gen_random_uuid(),
  bake_day_id uuid not null references public.bake_days(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  planned_pieces integer not null default 0 check (planned_pieces >= 0),
  delivery_date date not null,
  accepting_orders boolean not null default true,
  created_at timestamptz not null default now(),
  unique (bake_day_id, product_id)
);

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  unit text not null check (unit in ('g', 'ml', 'pcs')),
  current_stock numeric(14,3) not null default 0,
  reorder_margin_percent numeric(7,3) not null default 5 check (reorder_margin_percent >= 0),
  active boolean not null default true
);

create table public.recipe_items (
  product_id uuid not null references public.products(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  quantity_per_piece numeric(14,4) not null check (quantity_per_piece > 0),
  primary key (product_id, ingredient_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  bake_day_id uuid references public.bake_days(id) on delete restrict,
  status public.order_status not null default 'submitted',
  fulfillment text not null default 'delivery' check (fulfillment in ('delivery', 'pickup')),
  delivery_address text,
  contact_name text,
  contact_phone text,
  comment text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  shipped_at timestamptz
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity_pieces integer not null check (quantity_pieces > 0),
  unit_price_eur numeric(12,4) not null check (unit_price_eur >= 0),
  product_name_snapshot text not null,
  box_size_snapshot integer not null check (box_size_snapshot > 0),
  unique (order_id, product_id)
);

create table public.delivery_notes (
  id uuid primary key default gen_random_uuid(),
  note_number bigint generated always as identity unique,
  order_id uuid unique references public.orders(id) on delete restrict,
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  issued_at timestamptz not null default now(),
  bake_date date,
  restaurant_name_snapshot text not null,
  restaurant_tax_id_snapshot text,
  billing_address_snapshot text,
  delivery_address_snapshot text,
  subtotal_eur numeric(12,2) not null default 0,
  tax_rate numeric(7,4) not null default 0 check (tax_rate >= 0),
  tax_eur numeric(12,2) not null default 0,
  total_eur numeric(12,2) not null default 0,
  paid_at_shipment_eur numeric(12,2) not null default 0 check (paid_at_shipment_eur >= 0),
  balance_after_eur numeric(12,2) not null default 0,
  created_by uuid references auth.users(id) on delete set null
);

create table public.delivery_note_items (
  id uuid primary key default gen_random_uuid(),
  delivery_note_id uuid not null references public.delivery_notes(id) on delete cascade,
  product_id uuid references public.products(id) on delete restrict,
  sku_snapshot text not null,
  product_name_snapshot text not null,
  quantity_pieces integer not null check (quantity_pieces > 0),
  box_size_snapshot integer not null check (box_size_snapshot > 0),
  unit_price_eur numeric(12,4) not null check (unit_price_eur >= 0),
  line_total_eur numeric(12,2) not null check (line_total_eur >= 0)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  delivery_note_id uuid references public.delivery_notes(id) on delete restrict,
  amount_eur numeric(12,2) not null check (amount_eur > 0),
  method text not null default 'bank',
  paid_at timestamptz not null default now(),
  reference text,
  created_by uuid references auth.users(id) on delete set null
);

create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  entry_type public.ledger_entry_type not null,
  amount_eur numeric(12,2) not null check (amount_eur <> 0),
  delivery_note_id uuid references public.delivery_notes(id) on delete restrict,
  payment_id uuid references public.payments(id) on delete restrict,
  note text,
  occurred_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  movement_type public.inventory_movement_type not null,
  quantity_pieces integer not null check (quantity_pieces <> 0),
  delivery_note_id uuid references public.delivery_notes(id) on delete restrict,
  occurred_at timestamptz not null default now(),
  note text,
  created_by uuid references auth.users(id) on delete set null
);

create schema if not exists private;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  );
$$;

create or replace function private.current_restaurant_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select p.restaurant_id from public.profiles p where p.user_id = auth.uid();
$$;

revoke all on function private.is_admin() from public;
revoke all on function private.current_restaurant_id() from public;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.current_restaurant_id() to authenticated;

alter table public.restaurants enable row level security;
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.restaurant_prices enable row level security;
alter table public.bake_days enable row level security;
alter table public.production_schedule enable row level security;
alter table public.ingredients enable row level security;
alter table public.recipe_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.delivery_notes enable row level security;
alter table public.delivery_note_items enable row level security;
alter table public.payments enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.inventory_movements enable row level security;

create policy restaurants_own_or_admin on public.restaurants for select to authenticated
  using (auth.uid() is not null and (id = private.current_restaurant_id() or private.is_admin()));
create policy profiles_own_or_admin on public.profiles for select to authenticated
  using (auth.uid() is not null and (user_id = auth.uid() or private.is_admin()));
create policy products_authenticated on public.products for select to authenticated
  using (auth.uid() is not null and (active or private.is_admin()));
create policy prices_own_or_admin on public.restaurant_prices for select to authenticated
  using (auth.uid() is not null and (restaurant_id = private.current_restaurant_id() or private.is_admin()));
create policy bake_days_authenticated on public.bake_days for select to authenticated
  using (auth.uid() is not null);
create policy schedule_authenticated on public.production_schedule for select to authenticated
  using (auth.uid() is not null);
create policy ingredients_admin_only on public.ingredients for select to authenticated
  using (auth.uid() is not null and private.is_admin());
create policy recipes_admin_only on public.recipe_items for select to authenticated
  using (auth.uid() is not null and private.is_admin());

create policy orders_own_or_admin_select on public.orders for select to authenticated
  using (auth.uid() is not null and (restaurant_id = private.current_restaurant_id() or private.is_admin()));
create policy orders_own_insert on public.orders for insert to authenticated
  with check (auth.uid() is not null and restaurant_id = private.current_restaurant_id() and created_by = auth.uid());
create policy order_items_own_or_admin_select on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.restaurant_id = private.current_restaurant_id() or private.is_admin())));

create policy notes_own_or_admin on public.delivery_notes for select to authenticated
  using (auth.uid() is not null and (restaurant_id = private.current_restaurant_id() or private.is_admin()));
create policy note_items_own_or_admin on public.delivery_note_items for select to authenticated
  using (exists (select 1 from public.delivery_notes n where n.id = delivery_note_id and (n.restaurant_id = private.current_restaurant_id() or private.is_admin())));
create policy payments_own_or_admin on public.payments for select to authenticated
  using (auth.uid() is not null and (restaurant_id = private.current_restaurant_id() or private.is_admin()));
create policy ledger_own_or_admin on public.ledger_entries for select to authenticated
  using (auth.uid() is not null and (restaurant_id = private.current_restaurant_id() or private.is_admin()));
create policy inventory_admin_only on public.inventory_movements for select to authenticated
  using (auth.uid() is not null and private.is_admin());

-- Only admins write commercial data directly. Restaurant order creation should use submit_order().
create policy admin_restaurants_all on public.restaurants for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy admin_profiles_all on public.profiles for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy admin_products_all on public.products for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy admin_prices_all on public.restaurant_prices for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy admin_bake_days_all on public.bake_days for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy admin_schedule_all on public.production_schedule for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy admin_ingredients_all on public.ingredients for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy admin_recipes_all on public.recipe_items for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy admin_orders_all on public.orders for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy admin_order_items_all on public.order_items for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy admin_notes_all on public.delivery_notes for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy admin_note_items_all on public.delivery_note_items for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy admin_payments_all on public.payments for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy admin_ledger_all on public.ledger_entries for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy admin_inventory_all on public.inventory_movements for all to authenticated using (private.is_admin()) with check (private.is_admin());

create or replace view public.restaurant_balances
with (security_invoker = true) as
select r.id as restaurant_id, r.name,
       coalesce(sum(l.amount_eur), 0)::numeric(12,2) as balance_eur
from public.restaurants r
left join public.ledger_entries l on l.restaurant_id = r.id
group by r.id, r.name;

create or replace view public.inventory_balances
with (security_invoker = true) as
select p.id as product_id, p.sku, p.name_ru,
       coalesce(sum(m.quantity_pieces), 0)::bigint as stock_pieces,
       p.box_size_pieces,
       floor(coalesce(sum(m.quantity_pieces), 0)::numeric / p.box_size_pieces)::bigint as full_boxes,
       mod(coalesce(sum(m.quantity_pieces), 0)::bigint, p.box_size_pieces::bigint) as loose_pieces
from public.products p
left join public.inventory_movements m on m.product_id = p.id
group by p.id, p.sku, p.name_ru, p.box_size_pieces;

create or replace view public.ingredient_purchase_plan
with (security_invoker = true) as
select i.id as ingredient_id, i.name, i.unit,
       sum(ps.planned_pieces * ri.quantity_per_piece)::numeric(14,3) as required_quantity,
       i.current_stock,
       greatest(0, sum(ps.planned_pieces * ri.quantity_per_piece) * (1 + i.reorder_margin_percent / 100) - i.current_stock)::numeric(14,3) as quantity_to_buy
from public.production_schedule ps
join public.bake_days bd on bd.id = ps.bake_day_id
join public.recipe_items ri on ri.product_id = ps.product_id
join public.ingredients i on i.id = ri.ingredient_id
where bd.bake_date >= current_date and ps.planned_pieces > 0
group by i.id, i.name, i.unit, i.current_stock, i.reorder_margin_percent;

-- Positive ledger amount increases debt; a payment is negative.
create or replace function public.record_payment(
  p_restaurant_id uuid, p_amount_eur numeric, p_delivery_note_id uuid default null,
  p_method text default 'bank', p_reference text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_payment_id uuid;
begin
  if not private.is_admin() then raise exception 'Admin access required'; end if;
  if p_amount_eur <= 0 then raise exception 'Payment must be positive'; end if;
  insert into public.payments(restaurant_id, delivery_note_id, amount_eur, method, reference, created_by)
  values(p_restaurant_id, p_delivery_note_id, p_amount_eur, p_method, p_reference, auth.uid()) returning id into v_payment_id;
  insert into public.ledger_entries(restaurant_id, entry_type, amount_eur, delivery_note_id, payment_id, note, created_by)
  values(p_restaurant_id, 'payment', -p_amount_eur, p_delivery_note_id, v_payment_id, p_reference, auth.uid());
  return v_payment_id;
end;
$$;

revoke all on function public.record_payment(uuid,numeric,uuid,text,text) from public;
grant execute on function public.record_payment(uuid,numeric,uuid,text,text) to authenticated;

insert into public.products(sku, category, name_ru, name_en, name_es, box_size_pieces)
values
  ('BREAD-PLAIN', 'yeast_free', 'Обычный хлеб', 'Plain bread', 'Pan clásico', 12),
  ('BREAD-PUMPKIN', 'yeast_free', 'Хлеб из тыквы', 'Pumpkin bread', 'Pan de calabaza', 12)
on conflict (sku) do nothing;

create index orders_restaurant_date_idx on public.orders (restaurant_id, created_at desc);
create index notes_restaurant_date_idx on public.delivery_notes (restaurant_id, issued_at desc);
create index ledger_restaurant_date_idx on public.ledger_entries (restaurant_id, occurred_at desc);
create index inventory_product_date_idx on public.inventory_movements (product_id, occurred_at desc);

-- Bootstrap the first admin after creating that user in Authentication > Users:
-- insert into public.profiles(user_id, role, display_name)
-- values ('AUTH-USER-UUID-HERE', 'admin', 'Panora administrator');
