-- Panora · надёжное создание заказа рестораном одной транзакцией.
-- Выполните один раз в Supabase SQL Editor.

create or replace function public.panora_create_order(
  p_order_id uuid,
  p_bake_date date,
  p_delivery_date date,
  p_items jsonb,
  p_comment text default ''
)
returns table(id uuid, order_number bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant uuid;
  v_bake_day uuid;
  v_order_number bigint;
  v_item jsonb;
  v_product text;
  v_quantity integer;
  v_price numeric(10,2);
  v_total_quantity integer := 0;
begin
  select p.restaurant_id into v_restaurant
  from public.profiles p
  where p.id = auth.uid() and p.role = 'restaurant';

  if v_restaurant is null then
    raise exception 'Restaurant account is not linked';
  end if;

  select b.id into v_bake_day
  from public.bake_days b
  where b.bake_date = p_bake_date and b.accepting_orders = true;

  if v_bake_day is null then
    raise exception 'Bake day is unavailable';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Order has no items';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := greatest(0, coalesce((v_item->>'quantity')::integer, 0));
    v_total_quantity := v_total_quantity + v_quantity;
  end loop;
  if v_total_quantity < 12 then
    raise exception 'Minimum order is 12 pieces';
  end if;

  insert into public.orders (id, restaurant_id, bake_day_id, status, comment, created_by)
  values (
    p_order_id,
    v_restaurant,
    v_bake_day,
    'submitted',
    jsonb_build_object('deliveryDate', coalesce(p_delivery_date,p_bake_date), 'taxRate', 0, 'comment', coalesce(p_comment,''))::text,
    auth.uid()
  )
  on conflict (id) do nothing;

  if not exists(select 1 from public.orders o where o.id=p_order_id and o.restaurant_id=v_restaurant) then
    raise exception 'Order identifier belongs to another restaurant';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_product := v_item->>'product';
    v_quantity := greatest(0, coalesce((v_item->>'quantity')::integer, 0));
    if v_quantity > 0 then
      select coalesce(rp.price, pr.base_price) into v_price
      from public.products pr
      left join public.restaurant_prices rp
        on rp.product_id=pr.id and rp.restaurant_id=v_restaurant
      where pr.id=v_product and pr.active=true;
      if v_price is null then raise exception 'Unknown product: %', v_product; end if;
      insert into public.order_items(order_id,product_id,quantity,unit_price)
      values(p_order_id,v_product,v_quantity,v_price)
      on conflict(order_id,product_id) do update
      set quantity=excluded.quantity,unit_price=excluded.unit_price;
    end if;
  end loop;

  select o.order_number into v_order_number from public.orders o where o.id=p_order_id;
  return query select p_order_id, v_order_number;
end;
$$;

revoke all on function public.panora_create_order(uuid,date,date,jsonb,text) from public;
grant execute on function public.panora_create_order(uuid,date,date,jsonb,text) to authenticated;
