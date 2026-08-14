-- Panora 5.65 — messages between partner and bakery, tied to an order
-- Safe to run once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.order_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  sender_user_id uuid not null,
  sender_role text not null check (sender_role in ('admin','restaurant','system')),
  sender_name text not null default '',
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_by_partner_at timestamptz,
  read_by_admin_at timestamptz
);

create index if not exists order_messages_order_created_idx
  on public.order_messages(order_id, created_at);

create index if not exists order_messages_restaurant_created_idx
  on public.order_messages(restaurant_id, created_at desc);

alter table public.order_messages enable row level security;

-- The UI uses security-definer RPCs below. Direct table access stays closed.
revoke all on public.order_messages from anon, authenticated;

create or replace function public.panora_order_messages_for_order(p_order_id uuid)
returns table (
  id uuid,
  order_id uuid,
  restaurant_id uuid,
  sender_role text,
  sender_name text,
  body text,
  created_at timestamptz,
  read_by_partner_at timestamptz,
  read_by_admin_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_restaurant_id uuid;
  v_order_restaurant_id uuid;
begin
  select p.role, p.restaurant_id
    into v_role, v_restaurant_id
  from public.profiles p
  where p.id = auth.uid();

  if v_role not in ('admin','restaurant') then
    raise exception 'PANORA_FORBIDDEN';
  end if;

  select o.restaurant_id
    into v_order_restaurant_id
  from public.orders o
  where o.id = p_order_id;

  if v_order_restaurant_id is null then
    raise exception 'PANORA_ORDER_NOT_FOUND';
  end if;

  if v_role = 'restaurant' and v_order_restaurant_id <> v_restaurant_id then
    raise exception 'PANORA_FORBIDDEN';
  end if;

  return query
  select
    m.id, m.order_id, m.restaurant_id, m.sender_role, m.sender_name,
    m.body, m.created_at, m.read_by_partner_at, m.read_by_admin_at
  from public.order_messages m
  where m.order_id = p_order_id
  order by m.created_at asc, m.id asc;
end;
$$;

create or replace function public.panora_send_order_message(p_order_id uuid, p_body text)
returns table (
  id uuid,
  order_id uuid,
  restaurant_id uuid,
  sender_role text,
  sender_name text,
  body text,
  created_at timestamptz,
  read_by_partner_at timestamptz,
  read_by_admin_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_profile_restaurant_id uuid;
  v_order_restaurant_id uuid;
  v_display_name text;
  v_restaurant_name text;
  v_body text := btrim(coalesce(p_body,''));
  v_row public.order_messages%rowtype;
begin
  if char_length(v_body) < 1 or char_length(v_body) > 2000 then
    raise exception 'PANORA_MESSAGE_LENGTH';
  end if;

  select p.role, p.restaurant_id, p.display_name
    into v_role, v_profile_restaurant_id, v_display_name
  from public.profiles p
  where p.id = auth.uid();

  if v_role not in ('admin','restaurant') then
    raise exception 'PANORA_FORBIDDEN';
  end if;

  select o.restaurant_id
    into v_order_restaurant_id
  from public.orders o
  where o.id = p_order_id;

  if v_order_restaurant_id is null then
    raise exception 'PANORA_ORDER_NOT_FOUND';
  end if;

  if v_role = 'restaurant' and v_order_restaurant_id <> v_profile_restaurant_id then
    raise exception 'PANORA_FORBIDDEN';
  end if;

  select r.name into v_restaurant_name
  from public.restaurants r
  where r.id = v_order_restaurant_id;

  insert into public.order_messages(
    order_id, restaurant_id, sender_user_id, sender_role, sender_name, body,
    read_by_partner_at, read_by_admin_at
  )
  values (
    p_order_id,
    v_order_restaurant_id,
    auth.uid(),
    v_role,
    case when v_role='restaurant'
      then coalesce(nullif(v_restaurant_name,''),'Партнёр')
      else coalesce(nullif(v_display_name,''),'Пекарня')
    end,
    v_body,
    case when v_role='restaurant' then now() else null end,
    case when v_role='admin' then now() else null end
  )
  returning * into v_row;

  return query
  select
    v_row.id, v_row.order_id, v_row.restaurant_id, v_row.sender_role,
    v_row.sender_name, v_row.body, v_row.created_at,
    v_row.read_by_partner_at, v_row.read_by_admin_at;
end;
$$;

create or replace function public.panora_mark_order_messages_read(p_order_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_restaurant_id uuid;
  v_order_restaurant_id uuid;
  v_count integer := 0;
begin
  select p.role, p.restaurant_id into v_role, v_restaurant_id
  from public.profiles p where p.id=auth.uid();

  if v_role not in ('admin','restaurant') then
    raise exception 'PANORA_FORBIDDEN';
  end if;

  select o.restaurant_id into v_order_restaurant_id
  from public.orders o where o.id=p_order_id;

  if v_order_restaurant_id is null then
    raise exception 'PANORA_ORDER_NOT_FOUND';
  end if;

  if v_role='restaurant' and v_order_restaurant_id<>v_restaurant_id then
    raise exception 'PANORA_FORBIDDEN';
  end if;

  if v_role='restaurant' then
    update public.order_messages
       set read_by_partner_at=coalesce(read_by_partner_at,now())
     where order_id=p_order_id and sender_role='admin' and read_by_partner_at is null;
  else
    update public.order_messages
       set read_by_admin_at=coalesce(read_by_admin_at,now())
     where order_id=p_order_id and sender_role='restaurant' and read_by_admin_at is null;
  end if;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.panora_order_message_unread_counts()
returns table(order_id uuid, unread_count bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_restaurant_id uuid;
begin
  select p.role,p.restaurant_id into v_role,v_restaurant_id
  from public.profiles p where p.id=auth.uid();

  if v_role not in ('admin','restaurant') then
    raise exception 'PANORA_FORBIDDEN';
  end if;

  if v_role='restaurant' then
    return query
    select m.order_id, count(*)::bigint
    from public.order_messages m
    where m.restaurant_id=v_restaurant_id
      and m.sender_role='admin'
      and m.read_by_partner_at is null
    group by m.order_id;
  else
    return query
    select m.order_id, count(*)::bigint
    from public.order_messages m
    where m.sender_role='restaurant'
      and m.read_by_admin_at is null
    group by m.order_id;
  end if;
end;
$$;

grant execute on function public.panora_order_messages_for_order(uuid) to authenticated;
grant execute on function public.panora_send_order_message(uuid,text) to authenticated;
grant execute on function public.panora_mark_order_messages_read(uuid) to authenticated;
grant execute on function public.panora_order_message_unread_counts() to authenticated;

notify pgrst, 'reload schema';
