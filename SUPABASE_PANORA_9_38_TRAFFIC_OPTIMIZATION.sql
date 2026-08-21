-- Panora 9.38 — Traffic Optimization VIII
-- Run once in Supabase SQL Editor after publishing Panora 9.38.
-- Splits commerce revisions by component, exposes authoritative order counters,
-- and adds a tiny finance-expense revision gate.

begin;

-- Public catalogue helper retained for fresh installations.
create or replace function public.panora_public_catalog_revision()
returns table(revision text)
language sql
security definer
set search_path = public
stable
as $$
  select md5(coalesce(max(p.updated_at)::text, '') || ':' || count(*)::text)::text
  from public.products p
  where coalesce(p.active, true)=true and coalesce(p.storefront_visible, true)=true;
$$;
revoke all on function public.panora_public_catalog_revision() from public;
grant execute on function public.panora_public_catalog_revision() to anon, authenticated;

-- Return shape changed in 9.38, so recreate explicitly.
drop function if exists public.panora_admin_commerce_revision();
create function public.panora_admin_commerce_revision()
returns table(
  revision text,
  orders_revision text,
  payments_revision text,
  notes_revision text,
  active_count bigint,
  archive_count bigint,
  submitted_count bigint
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_role text;
  v_orders text;
  v_payments text;
  v_notes text;
begin
  select p.role into v_role from public.profiles p where p.id=auth.uid();
  if v_role <> 'admin' then raise exception 'PANORA_FORBIDDEN'; end if;

  select md5(concat_ws('|',coalesce(max(o.updated_at)::text,''),count(*)::text))
    into v_orders from public.orders o;
  select md5(concat_ws('|',coalesce(max(p.updated_at)::text,''),count(*)::text))
    into v_payments from public.payments p;
  -- delivery_notes has legacy installations without updated_at. Hash only the fields
  -- used by Panora so a note-only change does not force orders/payments to reload.
  select md5(coalesce(string_agg(md5(concat_ws('|',
      d.id::text,d.note_number::text,d.order_id::text,d.restaurant_id::text,
      coalesce(d.delivered_at::text,''),coalesce(d.payment_due_date::text,''),coalesce(d.total::text,''),
      coalesce(d.trays_delivered::text,''),coalesce(d.trays_returned::text,''),coalesce(d.tray_balance_after::text,''),
      coalesce(d.customer_trays_received::text,''),coalesce(d.customer_trays_returned::text,''),
      coalesce(d.customer_confirmed_at::text,''),coalesce(d.customer_receiver,''),
      coalesce(d.offline_received_at::text,''),coalesce(d.offline_receiver,''),coalesce(d.qr_token::text,'')
    )),'' order by d.id::text),'')) into v_notes from public.delivery_notes d;

  return query
  select md5(concat_ws('|',v_orders,v_payments,v_notes)),v_orders,v_payments,v_notes,
    (select count(*) from public.orders o where coalesce(o.status,'') not in ('shipped','cancelled')),
    (select count(*) from public.orders o where coalesce(o.status,'') in ('shipped','cancelled')),
    (select count(*) from public.orders o where o.status='submitted');
end;
$$;
revoke all on function public.panora_admin_commerce_revision() from public;
grant execute on function public.panora_admin_commerce_revision() to authenticated;

-- Partner-scoped component revisions.
drop function if exists public.panora_partner_commerce_revision();
create function public.panora_partner_commerce_revision()
returns table(revision text,orders_revision text,payments_revision text,notes_revision text)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_restaurant uuid;
  v_orders text;
  v_payments text;
  v_notes text;
begin
  select p.restaurant_id into v_restaurant from public.profiles p
   where p.id=auth.uid() and p.role='restaurant';
  if v_restaurant is null then raise exception 'PANORA_PARTNER_NOT_LINKED'; end if;

  select md5(concat_ws('|',coalesce(max(o.updated_at)::text,''),count(*)::text))
    into v_orders from public.orders o where o.restaurant_id=v_restaurant;
  select md5(concat_ws('|',coalesce(max(p.updated_at)::text,''),count(*)::text))
    into v_payments from public.payments p where p.restaurant_id=v_restaurant;
  select md5(coalesce(string_agg(md5(concat_ws('|',
      d.id::text,d.note_number::text,d.order_id::text,
      coalesce(d.delivered_at::text,''),coalesce(d.payment_due_date::text,''),coalesce(d.total::text,''),
      coalesce(d.trays_delivered::text,''),coalesce(d.trays_returned::text,''),coalesce(d.tray_balance_after::text,''),
      coalesce(d.customer_trays_received::text,''),coalesce(d.customer_trays_returned::text,''),
      coalesce(d.customer_confirmed_at::text,''),coalesce(d.customer_receiver,''),
      coalesce(d.offline_received_at::text,''),coalesce(d.offline_receiver,''),coalesce(d.qr_token::text,'')
    )),'' order by d.id::text),'')) into v_notes
    from public.delivery_notes d where d.restaurant_id=v_restaurant;

  return query select md5(concat_ws('|',v_orders,v_payments,v_notes)),v_orders,v_payments,v_notes;
end;
$$;
revoke all on function public.panora_partner_commerce_revision() from public;
grant execute on function public.panora_partner_commerce_revision() to authenticated;

-- Finance: reopening the Finance screen no longer downloads the complete manual-expense
-- table unless its tiny server-side revision changed.
create or replace function public.panora_admin_finance_expense_revision()
returns table(revision text, row_count bigint)
language plpgsql
security definer
set search_path = public
stable
as $$
declare v_role text;
begin
  select p.role into v_role from public.profiles p where p.id=auth.uid();
  if v_role <> 'admin' then raise exception 'PANORA_FORBIDDEN'; end if;
  return query
  select md5(coalesce(string_agg(md5(concat_ws('|',
      e.id::text,e.expense_date::text,coalesce(e.category,''),coalesce(e.description,''),
      coalesce(e.expense_type,''),coalesce(e.gross_amount::text,''),coalesce(e.vat_rate::text,''),coalesce(e.vat_deductible::text,'')
    )),'' order by e.id::text),'')),count(*) from public.finance_expenses e;
end;
$$;
revoke all on function public.panora_admin_finance_expense_revision() from public;
grant execute on function public.panora_admin_finance_expense_revision() to authenticated;


-- Operational gate: plan, raw material movements and factual bake completion.
-- The browser asks for these tiny hashes first and only downloads the corresponding
-- rows when a component actually changed.
create or replace function public.panora_admin_operational_revision()
returns table(revision text, plans_revision text, raw_stock_revision text, bake_revision text)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_role text;
  v_plans text;
  v_raw text;
  v_bake text;
begin
  select p.role into v_role from public.profiles p where p.id=auth.uid();
  if v_role <> 'admin' then raise exception 'PANORA_FORBIDDEN'; end if;

  select md5(concat_ws('|',
    coalesce(max(bd.updated_at)::text,''),
    count(distinct bd.id)::text,
    count(bi.product_id)::text,
    coalesce(string_agg(md5(concat_ws('|',
      bd.id::text,bd.bake_date::text,coalesce(bd.delivery_date::text,''),
      coalesce(bd.cutoff_at::text,''),coalesce(bd.accepting_orders::text,''),
      coalesce(bi.product_id::text,''),coalesce(bi.planned_quantity::text,'')
    )),'' order by bd.bake_date::text,bd.id::text,bi.product_id::text),'')
  )) into v_plans
  from public.bake_days bd
  left join public.bake_items bi on bi.bake_day_id=bd.id;

  select md5(concat_ws('|',coalesce(max(r.updated_at)::text,''),count(*)::text))
    into v_raw from public.raw_material_movements r;

  select md5(concat_ws('|',coalesce(max(b.updated_at)::text,''),count(*)::text))
    into v_bake from public.bake_completions b;

  return query select md5(concat_ws('|',v_plans,v_raw,v_bake)),v_plans,v_raw,v_bake;
end;
$$;
revoke all on function public.panora_admin_operational_revision() from public;
grant execute on function public.panora_admin_operational_revision() to authenticated;

-- These indexes make delta reads and revision checks cheap as history grows.
create index if not exists raw_material_movements_updated_at_idx
  on public.raw_material_movements(updated_at);
create index if not exists bake_completions_updated_at_idx
  on public.bake_completions(updated_at);
create index if not exists bake_days_updated_at_idx
  on public.bake_days(updated_at);

comment on function public.panora_admin_commerce_revision() is 'Panora 9.38: component commerce revisions plus authoritative order counters.';
comment on function public.panora_partner_commerce_revision() is 'Panora 9.38: partner-scoped component commerce revisions.';
comment on function public.panora_admin_finance_expense_revision() is 'Panora 9.38: lightweight gate that prevents unchanged finance expense downloads.';
comment on function public.panora_admin_operational_revision() is 'Panora 9.38: component revisions for plan, raw stock and factual bake completion.';

-- Panora 9.38: rarely-changing reference data gate. The browser asks for these
-- compact hashes before downloading product cards or partner/price payloads.
create or replace function public.panora_admin_reference_revision()
returns table(revision text, products_revision text, restaurants_revision text)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_role text;
  v_products text;
  v_restaurants text;
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

  return query select md5(concat_ws('|',v_products,v_restaurants)),v_products,v_restaurants;
end;
$$;
revoke all on function public.panora_admin_reference_revision() from public;
grant execute on function public.panora_admin_reference_revision() to authenticated;
comment on function public.panora_admin_reference_revision() is 'Panora 9.38: lightweight revisions for products and restaurant/price reference data.';

notify pgrst, 'reload schema';
commit;

-- Public diagnostic (works without admin session):
select * from public.panora_public_catalog_revision();
