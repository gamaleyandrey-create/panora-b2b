-- Panora 10.48 / 10480
-- Recipient-language routing for Retail. Additive and backward compatible.
-- Bakery accounting documents remain Spanish-only in the application code.

alter table if exists public.retail_orders
  add column if not exists customer_language text;

alter table if exists public.retail_push_subscriptions
  add column if not exists language text;

update public.retail_orders
   set customer_language = lower(customer_language)
 where customer_language is not null
   and lower(customer_language) in ('es','en','de','ru');

update public.retail_push_subscriptions
   set language = lower(language)
 where language is not null
   and lower(language) in ('es','en','de','ru');

create or replace function public.panora_retail_set_language(
  p_public_token text,
  p_language text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_language text := lower(coalesce(p_language, ''));
begin
  if nullif(trim(coalesce(p_public_token, '')), '') is null
     or v_language not in ('es','en','de','ru') then
    return false;
  end if;

  update public.retail_orders
     set customer_language = v_language
   where public_token::text = p_public_token;

  return found;
end;
$$;

create or replace function public.panora_retail_set_push_language(
  p_public_token text,
  p_endpoint text,
  p_language text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_language text := lower(coalesce(p_language, ''));
begin
  if nullif(trim(coalesce(p_public_token, '')), '') is null
     or nullif(trim(coalesce(p_endpoint, '')), '') is null
     or v_language not in ('es','en','de','ru') then
    return false;
  end if;

  if not exists (
    select 1
      from public.retail_orders
     where public_token::text = p_public_token
  ) then
    return false;
  end if;

  update public.retail_push_subscriptions
     set language = v_language,
         updated_at = now()
   where endpoint = p_endpoint
     and coalesce(active, true) = true
     and coalesce(audience, 'customer') <> 'admin';

  return found;
end;
$$;

grant execute on function public.panora_retail_set_language(text,text) to anon, authenticated;
grant execute on function public.panora_retail_set_push_language(text,text,text) to anon, authenticated;

comment on column public.retail_orders.customer_language is
  'Panora UI language captured when the retail order is placed: es/en/de/ru.';
comment on column public.retail_push_subscriptions.language is
  'Preferred Push language for this device: es/en/de/ru.';
