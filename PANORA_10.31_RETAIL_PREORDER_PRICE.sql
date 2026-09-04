-- Panora 10.32 · retail pre-order discount for full online prepayment
-- Run once in Supabase SQL editor.
-- Discount is calculated ONCE from the goods total. Item unit prices and delivery fee are not discounted.

alter table if exists public.retail_settings
  add column if not exists preorder_online_discount_enabled boolean not null default false,
  add column if not exists preorder_online_discount_percent numeric(5,2) not null default 5,
  add column if not exists preorder_online_discount_min_days integer not null default 2;

alter table if exists public.retail_settings
  drop constraint if exists retail_settings_preorder_online_discount_percent_check;
alter table if exists public.retail_settings
  add constraint retail_settings_preorder_online_discount_percent_check
  check (preorder_online_discount_percent >= 0 and preorder_online_discount_percent <= 30);

alter table if exists public.retail_settings
  drop constraint if exists retail_settings_preorder_online_discount_min_days_check;
alter table if exists public.retail_settings
  add constraint retail_settings_preorder_online_discount_min_days_check
  check (preorder_online_discount_min_days between 1 and 14);

-- Keep the financial breakdown on the order so refunds/analytics can see how total was formed.
alter table if exists public.retail_orders
  add column if not exists goods_subtotal numeric(12,2),
  add column if not exists prepayment_discount_percent numeric(5,2) not null default 0,
  add column if not exists prepayment_discount_amount numeric(12,2) not null default 0;

create or replace function public.panora_retail_confirm_order_v1031(
  p_reservation_token text,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text default null,
  p_comment text default null,
  p_delivery_address text default null,
  p_delivery_note text default null,
  p_payment_method text default 'pickup'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_order_id text;
  v_enabled boolean := false;
  v_percent numeric := 0;
  v_min_days integer := 2;
  v_source text;
  v_bake_date date;
  v_payment_method text;
  v_goods numeric := 0;
  v_discount numeric := 0;
  v_delivery numeric := 0;
begin
  -- Existing proven RPC remains responsible for reservation/stock/slot/customer validation.
  select to_jsonb(x)
    into v_result
    from public.panora_retail_confirm_order(
      p_reservation_token => p_reservation_token,
      p_customer_name => p_customer_name,
      p_customer_phone => p_customer_phone,
      p_customer_email => p_customer_email,
      p_comment => p_comment,
      p_delivery_address => p_delivery_address,
      p_delivery_note => p_delivery_note,
      p_payment_method => p_payment_method
    ) x
    limit 1;

  if v_result is null then return null; end if;

  v_order_id := nullif(v_result->>'id','');
  if v_order_id is null then
    select id::text into v_order_id
      from public.retail_orders
     where public_token::text = nullif(v_result->>'public_token','')
     order by created_at desc
     limit 1;
  end if;
  if v_order_id is null then return v_result; end if;

  select coalesce(preorder_online_discount_enabled,false),
         greatest(0,least(30,coalesce(preorder_online_discount_percent,0))),
         greatest(1,least(14,coalesce(preorder_online_discount_min_days,2)))
    into v_enabled,v_percent,v_min_days
    from public.retail_settings
   where id=1;

  select source, bake_date::date, payment_method, coalesce(delivery_fee,0)
    into v_source,v_bake_date,v_payment_method,v_delivery
    from public.retail_orders
   where id::text=v_order_id
   limit 1;

  select coalesce(sum(i.unit_price::numeric * i.quantity),0)
    into v_goods
    from public.retail_order_items i
   where i.order_id::text=v_order_id;

  -- "online" means the order is offered at the full-prepayment amount.
  -- payment_status remains the source of truth for whether the payment actually completed.
  if v_enabled
     and v_percent > 0
     and v_source='bake_preorder'
     and coalesce(v_payment_method,p_payment_method)='online'
     and v_bake_date is not null
     and (v_bake_date-current_date) >= v_min_days then
    v_discount := round(v_goods * v_percent / 100,2);
  else
    v_percent := 0;
    v_discount := 0;
  end if;

  update public.retail_orders o
     set goods_subtotal = round(v_goods,2),
         prepayment_discount_percent = v_percent,
         prepayment_discount_amount = v_discount,
         total = greatest(0,round(v_goods-v_discount,2)) + v_delivery,
         updated_at = now()
   where o.id::text=v_order_id;

  select to_jsonb(o) into v_result
    from public.retail_orders o
   where o.id::text=v_order_id
   limit 1;
  return v_result;
end;
$$;

grant execute on function public.panora_retail_confirm_order_v1031(text,text,text,text,text,text,text,text) to anon, authenticated;
