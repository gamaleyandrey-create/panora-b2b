-- Panora 9.45 — Traffic Optimization X
-- Run once in Supabase SQL Editor after publishing Panora 9.45.
-- Extends the lightweight reference revision gate to recipes and raw-material prices.
-- The browser can now check four rarely-changing reference groups with one tiny RPC
-- and download the corresponding rows only when that component actually changed.

begin;

drop function if exists public.panora_admin_reference_revision();
create function public.panora_admin_reference_revision()
returns table(
  revision text,
  products_revision text,
  restaurants_revision text,
  recipes_revision text,
  ingredient_costs_revision text
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_role text;
  v_products text;
  v_restaurants text;
  v_recipes text;
  v_ingredient_costs text;
begin
  select p.role into v_role from public.profiles p where p.id=auth.uid();
  if v_role <> 'admin' then raise exception 'PANORA_FORBIDDEN'; end if;

  select md5(concat_ws('|',coalesce(max(p.updated_at)::text,''),count(*)::text))
    into v_products from public.products p;

  select md5(concat_ws('|',
    coalesce(max(r.updated_at)::text,''),count(distinct r.id)::text,
    coalesce(max(rp.updated_at)::text,''),count(rp.product_id)::text
  )) into v_restaurants
  from public.restaurants r
  left join public.restaurant_prices rp on rp.restaurant_id=r.id;

  -- recipe_items may be small, but the payload contains every ingredient row.
  -- Hash only fields used by Panora so unchanged recipes never need downloading.
  select md5(coalesce(string_agg(md5(concat_ws('|',
    ri.product_id::text,ri.position::text,coalesce(ri.ingredient_name,''),
    coalesce(ri.quantity::text,''),coalesce(ri.unit,''),coalesce(ri.stock::text,''),
    coalesce(ri.margin::text,''),coalesce(ri.source_ingredient_name,''),
    coalesce(ri.source_unit,''),coalesce(ri.source_yield_pct::text,'')
  )),'' order by ri.product_id::text,ri.position::text),''))
    into v_recipes from public.recipe_items ri;

  select md5(concat_ws('|',coalesce(max(rmp.updated_at)::text,''),count(*)::text))
    into v_ingredient_costs from public.raw_material_prices rmp;

  return query select
    md5(concat_ws('|',v_products,v_restaurants,v_recipes,v_ingredient_costs)),
    v_products,v_restaurants,v_recipes,v_ingredient_costs;
end;
$$;

revoke all on function public.panora_admin_reference_revision() from public;
grant execute on function public.panora_admin_reference_revision() to authenticated;
comment on function public.panora_admin_reference_revision() is
  'Panora 9.45: one lightweight revision gate for products, partners/prices, recipes and raw-material prices.';

-- Support the delta/revision paths already used by Panora as reference history grows.
create index if not exists raw_material_prices_updated_at_idx
  on public.raw_material_prices(updated_at);
create index if not exists recipe_items_product_position_idx
  on public.recipe_items(product_id,position);

notify pgrst,'reload schema';
commit;

-- Diagnostic: authenticated admin should receive one row with five short hashes.
select * from public.panora_admin_reference_revision();
