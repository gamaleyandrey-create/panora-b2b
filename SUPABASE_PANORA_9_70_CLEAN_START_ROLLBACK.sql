-- Panora 9.70 CLEAN START — ROLLBACK
-- Restores the exact demo snapshot created by SUPABASE_PANORA_9_70_CLEAN_START_APPLY.sql.
-- SAFETY: refuses to run if new post-reset operational data already exists.

begin;

do $$
declare
  n bigint;
  t text;
begin
  if not exists(select 1 from pg_namespace where nspname='panora_demo_backup_970') then
    raise exception 'PANORA_970_BACKUP_NOT_FOUND: rollback snapshot does not exist.';
  end if;

  -- Refuse to mix the old demo snapshot with newly created real data.
  foreach t in array array[
    'restaurants','orders','delivery_notes','payments','retail_orders',
    'finance_expenses','bake_days','bake_completions',
    'raw_material_movements','finished_stock_movements'
  ] loop
    if to_regclass('public.'||t) is not null then
      execute format('select count(*) from public.%I',t) into n;
      if n > 0 then
        raise exception 'PANORA_970_ROLLBACK_STOP: public.% contains % new row(s). Export/review them before rollback.',t,n;
      end if;
    end if;
  end loop;

  if exists(select 1 from public.profiles where role='restaurant') then
    raise exception 'PANORA_970_ROLLBACK_STOP: new partner profiles exist. Export/review them before rollback.';
  end if;
end $$;

-- Restore parents/reference rows first, then dependent operational history.
do $$
declare
  t text;
  cols text;
begin
  foreach t in array array[
    'restaurants','profiles','restaurant_prices',
    'bake_days','bake_items',
    'orders','order_items','order_status_events','delivery_notes','payments','order_messages','panora_spanish_documents',
    'finance_expenses','bake_completions','raw_material_movements','finished_stock_movements',
    'retail_orders','retail_order_items','retail_order_events','retail_order_messages','retail_notifications'
  ] loop
    if to_regclass('panora_demo_backup_970.'||t) is not null and to_regclass('public.'||t) is not null then
      select string_agg(quote_ident(a.attname),', ' order by a.attnum) into cols
      from pg_attribute a
      where a.attrelid=to_regclass('public.'||t) and a.attnum>0 and not a.attisdropped and a.attgenerated='';
      execute format('insert into public.%I (%s) overriding system value select %s from panora_demo_backup_970.%I on conflict do nothing',t,cols,cols,t);
    end if;
  end loop;
end $$;

commit;

select
  (select count(*) from public.restaurants) as restored_partners,
  (select count(*) from public.profiles where role='restaurant') as restored_partner_profiles,
  (select count(*) from public.orders) as restored_orders,
  (select count(*) from public.delivery_notes) as restored_delivery_notes,
  (select count(*) from public.payments) as restored_payments;

-- Keep schema panora_demo_backup_970 after rollback as an audit copy.
-- Drop it manually only after you are completely satisfied:
-- drop schema panora_demo_backup_970 cascade;
