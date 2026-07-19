-- Panora v219: единые рецептуры на всех устройствах.
-- Выполните этот файл один раз в Supabase SQL Editor.

create table if not exists public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete cascade,
  position integer not null default 0 check (position >= 0),
  ingredient_name text not null,
  quantity numeric(12,3) not null default 0 check (quantity >= 0),
  unit text not null default 'g' check (unit in ('g','ml','pcs')),
  stock numeric(14,3) not null default 0 check (stock >= 0),
  margin numeric(7,2) not null default 5 check (margin >= 0),
  updated_at timestamptz not null default now(),
  unique (product_id, position)
);

alter table public.recipe_items enable row level security;

drop policy if exists recipe_items_admin_read on public.recipe_items;
create policy recipe_items_admin_read on public.recipe_items
for select to authenticated using (public.panora_is_admin());

drop policy if exists recipe_items_admin_write on public.recipe_items;
create policy recipe_items_admin_write on public.recipe_items
for all to authenticated
using (public.panora_is_admin())
with check (public.panora_is_admin());
