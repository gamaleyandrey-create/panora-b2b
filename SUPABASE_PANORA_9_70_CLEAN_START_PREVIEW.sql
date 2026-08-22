-- Panora 9.72 CLEAN START — PREVIEW ONLY
-- Safe: this script does not change any data.
-- Run first in Supabase SQL Editor to see what will be backed up and removed.

with targets(table_name) as (
  values
    ('restaurants'),('restaurant_prices'),('profiles'),
    ('orders'),('order_items'),('order_status_events'),('order_messages'),
    ('delivery_notes'),('payments'),('panora_spanish_documents'),
    ('finance_expenses'),('bake_days'),('bake_items'),('bake_completions'),
    ('raw_material_movements'),('finished_stock_movements'),
    ('retail_orders'),('retail_order_items'),('retail_order_events'),
    ('retail_order_messages'),('retail_notifications')
)
select
  t.table_name,
  case when to_regclass('public.' || t.table_name) is null then 'not present'
       when t.table_name='profiles' then 'partner profiles only'
       else 'all rows' end as clean_scope,
  case
    when to_regclass('public.' || t.table_name) is null then null
    when t.table_name='profiles' then
      (select count(*) from public.profiles p where p.role='restaurant')
    else
      (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I',t.table_name),false,true,'')))[1]::text::bigint
  end as rows_to_backup_and_remove
from targets t
order by t.table_name;

-- IMPORTANT:
-- Products, recipes, raw-material prices, retail settings, bakery settings,
-- Supabase functions and the bakery/admin profile are NOT removed.
