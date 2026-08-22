-- Panora 9.72 CLEAN START — BACKUP + APPLY
-- Creates a reversible database snapshot BEFORE deleting demo/teaching data.
-- Backup schema: panora_demo_backup_970
-- Run PREVIEW first. Run this file only when you are ready to reset the demo history.

begin;

-- Never overwrite an existing backup.
do $$
begin
  if exists(select 1 from pg_namespace where nspname='panora_demo_backup_970') then
    raise exception 'PANORA_970_BACKUP_ALREADY_EXISTS: stop. Do not overwrite the existing rollback snapshot.';
  end if;
end $$;

create schema panora_demo_backup_970;

create table panora_demo_backup_970._manifest as
select
  now() as backed_up_at,
  'Panora 9.72 CLEAN START'::text as release,
  current_database()::text as database_name;

-- Full operational tables. Missing optional tables are skipped safely.
do $$
declare
  t text;
begin
  foreach t in array array[
    'restaurants','restaurant_prices',
    'orders','order_items','order_status_events','order_messages',
    'delivery_notes','payments','panora_spanish_documents',
    'finance_expenses','bake_days','bake_items','bake_completions',
    'raw_material_movements','finished_stock_movements',
    'retail_orders','retail_order_items','retail_order_events',
    'retail_order_messages','retail_notifications'
  ] loop
    if to_regclass('public.'||t) is not null then
      execute format('create table panora_demo_backup_970.%I as table public.%I',t,t);
    end if;
  end loop;
end $$;

-- Only partner profiles are demo data; bakery/admin profile is preserved.
create table panora_demo_backup_970.profiles as
select * from public.profiles where role='restaurant';

-- Delete children before parents to avoid FK/cascade surprises.
do $$
begin
  if to_regclass('public.retail_order_messages') is not null then delete from public.retail_order_messages; end if;
  if to_regclass('public.retail_order_events') is not null then delete from public.retail_order_events; end if;
  if to_regclass('public.retail_notifications') is not null then delete from public.retail_notifications; end if;
  if to_regclass('public.retail_order_items') is not null then delete from public.retail_order_items; end if;
  if to_regclass('public.retail_orders') is not null then delete from public.retail_orders; end if;

  if to_regclass('public.panora_spanish_documents') is not null then delete from public.panora_spanish_documents; end if;
  if to_regclass('public.order_messages') is not null then delete from public.order_messages; end if;
  if to_regclass('public.order_status_events') is not null then delete from public.order_status_events; end if;
  if to_regclass('public.order_items') is not null then delete from public.order_items; end if;
  if to_regclass('public.delivery_notes') is not null then delete from public.delivery_notes; end if;
  if to_regclass('public.payments') is not null then delete from public.payments; end if;
  if to_regclass('public.orders') is not null then delete from public.orders; end if;

  if to_regclass('public.restaurant_prices') is not null then delete from public.restaurant_prices; end if;
  if to_regclass('public.profiles') is not null then delete from public.profiles where role='restaurant'; end if;
  if to_regclass('public.restaurants') is not null then delete from public.restaurants; end if;

  if to_regclass('public.finance_expenses') is not null then delete from public.finance_expenses; end if;
  if to_regclass('public.bake_completions') is not null then delete from public.bake_completions; end if;
  if to_regclass('public.bake_items') is not null then delete from public.bake_items; end if;
  if to_regclass('public.bake_days') is not null then delete from public.bake_days; end if;
  if to_regclass('public.raw_material_movements') is not null then delete from public.raw_material_movements; end if;
  if to_regclass('public.finished_stock_movements') is not null then delete from public.finished_stock_movements; end if;
end $$;

commit;

-- Verification: these should be zero after a successful clean start.
select
  (select count(*) from public.restaurants) as partners_remaining,
  (select count(*) from public.profiles where role='restaurant') as partner_profiles_remaining,
  (select count(*) from public.orders) as b2b_orders_remaining,
  (select count(*) from public.delivery_notes) as delivery_notes_remaining,
  (select count(*) from public.payments) as payments_remaining;
