-- Panora 5.67 — partner profile save RPC
-- Fixes: Could not find public.panora_update_partner_profile(...) in schema cache.
-- Safe to run in Supabase SQL Editor.

alter table public.restaurants
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists whatsapp text,
  add column if not exists telegram text,
  add column if not exists extra_messengers jsonb not null default '[]'::jsonb,
  add column if not exists legal_name text,
  add column if not exists tax_id text,
  add column if not exists billing_address text,
  add column if not exists contact_person text,
  add column if not exists delivery_comment text,
  add column if not exists receiving_hours text,
  add column if not exists receiving_days text,
  add column if not exists notify_order boolean not null default true,
  add column if not exists notify_shipment boolean not null default true,
  add column if not exists notify_invoice boolean not null default true,
  add column if not exists notify_payment boolean not null default true,
  add column if not exists language text not null default 'ru',
  add column if not exists partner_type text not null default 'restaurant',
  add column if not exists updated_at timestamptz not null default now();

update public.restaurants
set
  extra_messengers = coalesce(extra_messengers, '[]'::jsonb),
  notify_order = coalesce(notify_order, true),
  notify_shipment = coalesce(notify_shipment, true),
  notify_invoice = coalesce(notify_invoice, true),
  notify_payment = coalesce(notify_payment, true),
  language = case when language in ('ru','en','es') then language else 'ru' end,
  partner_type = case
    when partner_type in ('restaurant','shop','hotel','cafe','catering','other') then partner_type
    else 'other'
  end
where true;

drop function if exists public.panora_update_partner_profile(
  text,text,text,text,text,jsonb,text,text,text,text,text,text,text,
  boolean,boolean,boolean,boolean,text,text
);

create function public.panora_update_partner_profile(
  p_name text,
  p_phone text,
  p_address text,
  p_whatsapp text,
  p_telegram text,
  p_extra_messengers jsonb,
  p_legal_name text,
  p_tax_id text,
  p_billing_address text,
  p_contact_person text,
  p_delivery_comment text,
  p_receiving_hours text,
  p_receiving_days text,
  p_notify_order boolean,
  p_notify_shipment boolean,
  p_notify_invoice boolean,
  p_notify_payment boolean,
  p_language text,
  p_partner_type text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_restaurant_id uuid;
  v_result jsonb;
begin
  select p.role, p.restaurant_id
    into v_role, v_restaurant_id
  from public.profiles p
  where p.id = auth.uid();

  if v_role <> 'restaurant' or v_restaurant_id is null then
    raise exception 'PANORA_FORBIDDEN';
  end if;

  if nullif(btrim(coalesce(p_name,'')),'') is null
     or nullif(btrim(coalesce(p_phone,'')),'') is null
     or nullif(btrim(coalesce(p_address,'')),'') is null then
    raise exception 'PANORA_REQUIRED_PROFILE_FIELDS';
  end if;

  if p_language not in ('ru','en','es') then
    raise exception 'PANORA_INVALID_LANGUAGE';
  end if;

  if p_partner_type not in ('restaurant','shop','hotel','cafe','catering','other') then
    raise exception 'PANORA_INVALID_PARTNER_TYPE';
  end if;

  update public.restaurants r
  set
    name = left(btrim(p_name),120),
    phone = left(btrim(p_phone),30),
    address = left(btrim(p_address),300),
    whatsapp = nullif(left(btrim(coalesce(p_whatsapp,'')),30),''),
    telegram = nullif(left(btrim(coalesce(p_telegram,'')),120),''),
    extra_messengers = coalesce(p_extra_messengers,'[]'::jsonb),
    legal_name = nullif(left(btrim(coalesce(p_legal_name,'')),180),''),
    tax_id = nullif(left(upper(btrim(coalesce(p_tax_id,''))),25),''),
    billing_address = nullif(left(btrim(coalesce(p_billing_address,'')),300),''),
    contact_person = nullif(left(btrim(coalesce(p_contact_person,'')),120),''),
    delivery_comment = nullif(left(btrim(coalesce(p_delivery_comment,'')),500),''),
    receiving_hours = nullif(left(btrim(coalesce(p_receiving_hours,'')),80),''),
    receiving_days = nullif(left(btrim(coalesce(p_receiving_days,'')),120),''),
    notify_order = coalesce(p_notify_order,true),
    notify_shipment = coalesce(p_notify_shipment,true),
    notify_invoice = coalesce(p_notify_invoice,true),
    notify_payment = coalesce(p_notify_payment,true),
    language = p_language,
    partner_type = p_partner_type,
    updated_at = now()
  where r.id = v_restaurant_id;

  if not found then
    raise exception 'PANORA_PARTNER_NOT_FOUND';
  end if;

  select jsonb_build_object(
    'ok', true,
    'restaurant_id', r.id,
    'name', r.name,
    'language', r.language,
    'partner_type', r.partner_type,
    'updated_at', r.updated_at
  )
  into v_result
  from public.restaurants r
  where r.id = v_restaurant_id;

  return v_result;
end;
$$;

revoke all on function public.panora_update_partner_profile(
  text,text,text,text,text,jsonb,text,text,text,text,text,text,text,
  boolean,boolean,boolean,boolean,text,text
) from public, anon;

grant execute on function public.panora_update_partner_profile(
  text,text,text,text,text,jsonb,text,text,text,text,text,text,text,
  boolean,boolean,boolean,boolean,text,text
) to authenticated;

notify pgrst, 'reload schema';
