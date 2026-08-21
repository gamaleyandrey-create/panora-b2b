-- Panora 9.31 — partner orders are NOT capped by bake-plan quantity.
-- Run once in Supabase SQL Editor after uploading Panora 9.31.
--
-- Contract:
-- * an open bake day is still required;
-- * every ordered product must be scheduled for that bake day;
-- * planned_quantity is schedule information only and NEVER limits partner quantity;
-- * requested quantities are stored exactly as submitted.
--
-- This restores the canonical 6.76 order RPC after the archived 9.11
-- capacity migration overwrote it with PANORA_PLAN_CAPACITY checks.

begin;

create or replace function public.panora_create_order(
  p_order_id uuid,
  p_bake_date date,
  p_delivery_date date,
  p_items jsonb,
  p_comment text default ''
)
returns table(id uuid,order_number bigint)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_restaurant uuid;
  v_bake_day uuid;
  v_calendar_delivery_date date;
  v_order_number bigint;
  v_item jsonb;
  v_product text;
  v_quantity integer;
  v_retail numeric(10,2);
  v_wholesale numeric(10,2);
  v_threshold integer;
  v_price numeric(10,2);
  v_names jsonb;
  v_image text;
  v_seen text[]:=array[]::text[];
  v_existing_restaurant uuid;
  v_existing_day uuid;
  v_existing_status text;
begin
  select p.restaurant_id into v_restaurant
  from public.profiles p
  where p.id=auth.uid() and p.role='restaurant';

  if v_restaurant is null then raise exception 'PANORA_PARTNER_NOT_LINKED'; end if;

  select b.id,coalesce(b.delivery_date,b.bake_date)
    into v_bake_day,v_calendar_delivery_date
  from public.bake_days b
  where b.bake_date=p_bake_date
    and b.accepting_orders=true
    and b.bake_date >= (now() at time zone 'Europe/Madrid')::date
    and b.cutoff_at is not null
    and b.cutoff_at>now()
  limit 1;

  if v_bake_day is null then raise exception 'PANORA_BAKE_DAY_UNAVAILABLE'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then
    raise exception 'PANORA_ORDER_HAS_NO_ITEMS';
  end if;

  -- Validate product/date compatibility only. Deliberately do NOT read
  -- bake_items.planned_quantity and do NOT compare ordered quantity to plan.
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_product:=nullif(btrim(v_item->>'product'),'');
    begin
      v_quantity:=greatest(0,coalesce((v_item->>'quantity')::integer,0));
    exception when invalid_text_representation then
      raise exception 'PANORA_INVALID_QUANTITY';
    end;
    if v_product is null or v_quantity<=0 then raise exception 'PANORA_INVALID_ORDER_ITEM'; end if;
    if v_product=any(v_seen) then raise exception 'PANORA_DUPLICATE_ORDER_PRODUCT: %',v_product; end if;
    v_seen:=array_append(v_seen,v_product);

    if not exists(
      select 1 from public.products pr
      where pr.id=v_product
        and pr.active=true
        and coalesce(pr.storefront_visible,true)=true
    ) then raise exception 'PANORA_PRODUCT_UNAVAILABLE: %',v_product; end if;

    if not exists(
      select 1 from public.bake_items bi
      where bi.bake_day_id=v_bake_day and bi.product_id=v_product
    ) then raise exception 'PANORA_PRODUCT_NOT_SCHEDULED: %',v_product; end if;
  end loop;

  if exists(select 1 from public.orders o where o.id=p_order_id) then
    select o.restaurant_id,o.bake_day_id,o.status::text,o.order_number
      into v_existing_restaurant,v_existing_day,v_existing_status,v_order_number
    from public.orders o where o.id=p_order_id for update;

    if v_existing_restaurant<>v_restaurant or v_existing_day<>v_bake_day then
      raise exception 'PANORA_ORDER_ID_COLLISION';
    end if;
    if v_existing_status<>'submitted' then
      raise exception 'PANORA_EXISTING_ORDER_NOT_REPAIRABLE';
    end if;
  else
    insert into public.orders(id,restaurant_id,bake_day_id,status,comment,created_by)
    values(
      p_order_id,v_restaurant,v_bake_day,'submitted',
      jsonb_build_object(
        'deliveryDate',v_calendar_delivery_date,
        'taxRate',0,
        'comment',left(coalesce(p_comment,''),2000)
      )::text,
      auth.uid()
    );
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_product:=btrim(v_item->>'product');
    v_quantity:=(v_item->>'quantity')::integer;

    select
      pr.base_price,
      rp.price,
      greatest(1,coalesce(pr.wholesale_min_qty,8)),
      jsonb_build_object(
        'ru',coalesce(nullif(pr.name_ru,''),pr.id),
        'en',coalesce(nullif(pr.name_en,''),nullif(pr.name_ru,''),pr.id),
        'es',coalesce(nullif(pr.name_es,''),nullif(pr.name_ru,''),pr.id)
      ),
      nullif(pr.image_url,'')
    into v_retail,v_wholesale,v_threshold,v_names,v_image
    from public.products pr
    left join public.restaurant_prices rp
      on rp.product_id=pr.id and rp.restaurant_id=v_restaurant
    where pr.id=v_product
      and pr.active=true
      and coalesce(pr.storefront_visible,true)=true;

    if v_retail is null then raise exception 'PANORA_PRODUCT_UNAVAILABLE: %',v_product; end if;
    v_price:=case when v_quantity>=v_threshold then coalesce(v_wholesale,v_retail) else v_retail end;

    insert into public.order_items(
      order_id,product_id,quantity,unit_price,product_names_snapshot,product_image_snapshot
    )
    values(p_order_id,v_product,v_quantity,v_price,v_names,v_image)
    on conflict(order_id,product_id) do update
      set quantity=excluded.quantity,
          unit_price=excluded.unit_price,
          product_names_snapshot=coalesce(public.order_items.product_names_snapshot,excluded.product_names_snapshot),
          product_image_snapshot=coalesce(nullif(public.order_items.product_image_snapshot,''),excluded.product_image_snapshot);
  end loop;

  if (select count(*) from public.order_items oi where oi.order_id=p_order_id)<>jsonb_array_length(p_items) then
    raise exception 'PANORA_ORDER_ITEM_VERIFICATION_FAILED';
  end if;

  select o.order_number into v_order_number from public.orders o where o.id=p_order_id;
  return query select p_order_id,v_order_number;
end;
$$;

revoke all on function public.panora_create_order(uuid,date,date,jsonb,text) from public;
grant execute on function public.panora_create_order(uuid,date,date,jsonb,text) to authenticated;
comment on function public.panora_create_order(uuid,date,date,jsonb,text) is
  'Panora 9.31 partner order creation: scheduled bake day required; planned quantity does not cap partner order quantity.';

notify pgrst,'reload schema';
commit;

-- Expected result: TRUE.
select
  position(
    'PANORA_PLAN_CAPACITY' in
    pg_get_functiondef('public.panora_create_order(uuid,date,date,jsonb,text)'::regprocedure)
  ) = 0 as partner_plan_quantity_cap_removed;
