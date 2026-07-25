-- Panora v242: enable secure QR delivery confirmation.
-- Copy the ENTIRE contents of this file into Supabase SQL Editor and click Run.
-- Safe to run repeatedly. No orders, invoices or payments are deleted.

alter table public.delivery_notes
  add column if not exists qr_token uuid,
  add column if not exists customer_confirmed_at timestamptz,
  add column if not exists customer_receiver text;

update public.delivery_notes
set qr_token = gen_random_uuid()
where qr_token is null;

alter table public.delivery_notes
  alter column qr_token set default gen_random_uuid(),
  alter column qr_token set not null;

create unique index if not exists delivery_notes_qr_token_key
  on public.delivery_notes (qr_token);

drop function if exists public.panora_delivery_confirmation(uuid);

create function public.panora_delivery_confirmation(p_token uuid)
returns table (
  note_id uuid,
  note_number bigint,
  order_id uuid,
  order_number bigint,
  delivered_at timestamptz,
  delivery_date date,
  customer_confirmed_at timestamptz,
  customer_receiver text,
  items jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    dn.id,
    dn.note_number,
    dn.order_id,
    o.order_number,
    dn.delivered_at,
    bd.delivery_date,
    dn.customer_confirmed_at,
    dn.customer_receiver,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'product_id', oi.product_id,
          'name_ru', p.name_ru,
          'name_en', p.name_en,
          'name_es', p.name_es,
          'quantity', oi.quantity
        )
        order by oi.product_id
      ) filter (where oi.product_id is not null),
      '[]'::jsonb
    )
  from public.delivery_notes dn
  join public.orders o on o.id = dn.order_id
  join public.profiles profile
    on profile.id = auth.uid()
   and profile.role = 'restaurant'
   and profile.restaurant_id = dn.restaurant_id
  left join public.bake_days bd on bd.id = o.bake_day_id
  left join public.order_items oi on oi.order_id = o.id
  left join public.products p on p.id = oi.product_id
  where dn.qr_token = p_token
    and (
      dn.customer_confirmed_at is not null
      or dn.delivered_at >= now() - interval '48 hours'
    )
  group by
    dn.id,
    dn.note_number,
    dn.order_id,
    o.order_number,
    dn.delivered_at,
    bd.delivery_date,
    dn.customer_confirmed_at,
    dn.customer_receiver;
$$;

drop function if exists public.panora_confirm_delivery(uuid, text);

create function public.panora_confirm_delivery(
  p_token uuid,
  p_receiver text
)
returns table (
  note_id uuid,
  customer_confirmed_at timestamptz,
  customer_receiver text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_restaurant uuid;
begin
  select profile.restaurant_id
    into current_restaurant
  from public.profiles profile
  where profile.id = auth.uid()
    and profile.role = 'restaurant';

  if current_restaurant is null then
    return;
  end if;

  if length(trim(coalesce(p_receiver, ''))) < 2
     or length(trim(p_receiver)) > 120 then
    raise exception 'Invalid receiver';
  end if;

  return query
  update public.delivery_notes dn
     set customer_confirmed_at = coalesce(dn.customer_confirmed_at, now()),
         customer_receiver = case
           when dn.customer_confirmed_at is null then trim(p_receiver)
           else dn.customer_receiver
         end
   where dn.qr_token = p_token
     and dn.restaurant_id = current_restaurant
     and (
       dn.customer_confirmed_at is not null
       or dn.delivered_at >= now() - interval '48 hours'
     )
  returning dn.id, dn.customer_confirmed_at, dn.customer_receiver;
end;
$$;

revoke all on function public.panora_delivery_confirmation(uuid)
  from public, anon;
revoke all on function public.panora_confirm_delivery(uuid, text)
  from public, anon;

grant execute on function public.panora_delivery_confirmation(uuid)
  to authenticated;
grant execute on function public.panora_confirm_delivery(uuid, text)
  to authenticated;

notify pgrst, 'reload schema';

