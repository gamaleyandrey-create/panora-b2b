-- Panora 9.35 — Traffic Optimization V
-- Run once in Supabase SQL Editor after publishing Panora 9.35.
-- Adds lightweight revision RPCs so unchanged commerce tables are not downloaded repeatedly.

begin;

-- Keep the public catalogue revision helper for fresh installations.
create or replace function public.panora_public_catalog_revision()
returns table(revision text)
language sql
security definer
set search_path = public
stable
as $$
  select md5(
    coalesce(max(p.updated_at)::text, '') || ':' || count(*)::text
  )::text as revision
  from public.products p
  where coalesce(p.active, true) = true
    and coalesce(p.storefront_visible, true) = true;
$$;

revoke all on function public.panora_public_catalog_revision() from public;
grant execute on function public.panora_public_catalog_revision() to anon, authenticated;

create or replace function public.panora_admin_commerce_revision()
returns table(revision text, submitted_count bigint)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_role text;
begin
  select p.role into v_role from public.profiles p where p.id=auth.uid();
  if v_role <> 'admin' then raise exception 'PANORA_FORBIDDEN'; end if;

  return query
  select md5(concat_ws('|',
      coalesce((select max(o.updated_at)::text from public.orders o),''),
      (select count(*)::text from public.orders),
      coalesce((select max(p.updated_at)::text from public.payments p),''),
      (select count(*)::text from public.payments),
      coalesce((select max(d.delivered_at)::text from public.delivery_notes d),''),
      coalesce((select max(d.customer_confirmed_at)::text from public.delivery_notes d),''),
      coalesce((select max(d.offline_received_at)::text from public.delivery_notes d),''),
      (select count(*)::text from public.delivery_notes)
    )),
    (select count(*) from public.orders o where o.status='submitted');
end;
$$;

revoke all on function public.panora_admin_commerce_revision() from public;
grant execute on function public.panora_admin_commerce_revision() to authenticated;

create or replace function public.panora_partner_commerce_revision()
returns table(revision text)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_restaurant uuid;
begin
  select p.restaurant_id into v_restaurant
  from public.profiles p
  where p.id=auth.uid() and p.role='restaurant';
  if v_restaurant is null then raise exception 'PANORA_PARTNER_NOT_LINKED'; end if;

  return query
  select md5(concat_ws('|',
      coalesce((select max(o.updated_at)::text from public.orders o where o.restaurant_id=v_restaurant),''),
      (select count(*)::text from public.orders o where o.restaurant_id=v_restaurant),
      coalesce((select max(p.updated_at)::text from public.payments p where p.restaurant_id=v_restaurant),''),
      (select count(*)::text from public.payments p where p.restaurant_id=v_restaurant),
      coalesce((select max(d.delivered_at)::text from public.delivery_notes d where d.restaurant_id=v_restaurant),''),
      coalesce((select max(d.customer_confirmed_at)::text from public.delivery_notes d where d.restaurant_id=v_restaurant),''),
      coalesce((select max(d.offline_received_at)::text from public.delivery_notes d where d.restaurant_id=v_restaurant),''),
      (select count(*)::text from public.delivery_notes d where d.restaurant_id=v_restaurant)
    ));
end;
$$;

revoke all on function public.panora_partner_commerce_revision() from public;
grant execute on function public.panora_partner_commerce_revision() to authenticated;

comment on function public.panora_admin_commerce_revision() is
  'Panora 9.35: lightweight admin commerce revision gate for orders/payments/delivery notes.';
comment on function public.panora_partner_commerce_revision() is
  'Panora 9.35: lightweight partner-scoped commerce revision gate.';
comment on function public.panora_public_catalog_revision() is
  'Panora 9.35: lightweight public catalogue revision.';

notify pgrst, 'reload schema';
commit;

-- Diagnostics: admin call works only while logged in as an admin through the app API.
select * from public.panora_public_catalog_revision();
