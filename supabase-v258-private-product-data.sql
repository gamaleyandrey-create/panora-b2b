-- Panora v258: restaurants receive only public card data and their own price.
-- Run this entire file once in Supabase SQL Editor as postgres.

drop function if exists public.panora_restaurant_catalog();

create or replace function public.panora_restaurant_catalog()
returns table (
  id text,
  active boolean,
  weight_g integer,
  image_url text,
  name_ru text,
  name_en text,
  name_es text,
  description_ru text,
  description_en text,
  description_es text,
  price numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.active,
    p.weight_g,
    p.image_url,
    p.name_ru,
    p.name_en,
    p.name_es,
    p.description_ru,
    p.description_en,
    p.description_es,
    rp.price
  from public.products p
  join public.restaurant_prices rp
    on rp.product_id = p.id
   and rp.restaurant_id = public.panora_restaurant_id()
  where p.active is true
    and public.panora_restaurant_id() is not null
  order by p.created_at asc;
$$;

revoke all on function public.panora_restaurant_catalog() from public;
revoke all on function public.panora_restaurant_catalog() from anon;
grant execute on function public.panora_restaurant_catalog() to authenticated;

-- The products table contains Panora's internal base price. Restaurants must
-- use the safe function above instead of selecting this table directly.
drop policy if exists products_read_authenticated on public.products;
drop policy if exists products_admin_read on public.products;
create policy products_admin_read on public.products
for select to authenticated
using (public.panora_is_admin());

-- Defence in depth: recipes and production costs remain admin-only.
drop policy if exists recipe_items_admin_read on public.recipe_items;
create policy recipe_items_admin_read on public.recipe_items
for select to authenticated
using (public.panora_is_admin());

notify pgrst, 'reload schema';
