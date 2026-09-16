-- Panora 10.66 — production, lots, traceability and sanitary control.
-- Backward-compatible: adds new tables/RPCs only; existing operational tables are untouched.

create table if not exists public.production_safety_state (
  id text primary key default 'bakery',
  payload jsonb not null default '{}'::jsonb,
  revision bigint not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint production_safety_state_singleton check (id = 'bakery')
);

alter table public.production_safety_state enable row level security;

drop policy if exists production_safety_state_admin_select on public.production_safety_state;
create policy production_safety_state_admin_select on public.production_safety_state
for select to authenticated using (public.panora_is_admin());

drop policy if exists production_safety_state_admin_insert on public.production_safety_state;
create policy production_safety_state_admin_insert on public.production_safety_state
for insert to authenticated with check (public.panora_is_admin());

drop policy if exists production_safety_state_admin_update on public.production_safety_state;
create policy production_safety_state_admin_update on public.production_safety_state
for update to authenticated using (public.panora_is_admin()) with check (public.panora_is_admin());

revoke all on public.production_safety_state from anon;
grant select, insert, update on public.production_safety_state to authenticated;

create or replace function public.panora_save_production_safety_state(
  p_payload jsonb,
  p_expected_revision bigint default null
)
returns table(revision bigint, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current bigint;
begin
  if not public.panora_is_admin() then raise exception 'PANORA_ADMIN_REQUIRED'; end if;
  select s.revision into v_current from public.production_safety_state s where s.id='bakery' for update;
  if not found then
    insert into public.production_safety_state(id,payload,revision,updated_at,updated_by)
    values('bakery',coalesce(p_payload,'{}'::jsonb),1,now(),auth.uid());
    return query select 1::bigint, now();
    return;
  end if;
  if p_expected_revision is not null and v_current <> p_expected_revision then
    raise exception 'PANORA_PRODUCTION_SAFETY_CONFLICT expected %, got %', p_expected_revision, v_current using errcode='P0001';
  end if;
  update public.production_safety_state
     set payload=coalesce(p_payload,'{}'::jsonb), revision=revision+1, updated_at=now(), updated_by=auth.uid()
   where id='bakery'
   returning production_safety_state.revision, production_safety_state.updated_at into revision, updated_at;
  return next;
end;
$$;

grant execute on function public.panora_save_production_safety_state(jsonb,bigint) to authenticated;

create table if not exists public.product_customer_safety (
  product_id text primary key,
  composition jsonb not null default '{}'::jsonb,
  contains text[] not null default '{}',
  may_contain text[] not null default '{}',
  storage jsonb not null default '{}'::jsonb,
  shelf_life text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.product_customer_safety enable row level security;

drop policy if exists product_customer_safety_admin_all on public.product_customer_safety;
create policy product_customer_safety_admin_all on public.product_customer_safety
for all to authenticated using (public.panora_is_admin()) with check (public.panora_is_admin());

revoke all on public.product_customer_safety from anon;
grant select, insert, update, delete on public.product_customer_safety to authenticated;

create or replace function public.panora_publish_product_customer_safety(p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare r jsonb; n integer:=0;
begin
  if not public.panora_is_admin() then raise exception 'PANORA_ADMIN_REQUIRED'; end if;
  for r in select * from jsonb_array_elements(coalesce(p_rows,'[]'::jsonb)) loop
    insert into public.product_customer_safety(product_id,composition,contains,may_contain,storage,shelf_life,updated_at,updated_by)
    values(
      r->>'product_id', coalesce(r->'composition','{}'::jsonb),
      coalesce(array(select jsonb_array_elements_text(coalesce(r->'contains','[]'::jsonb))),'{}'),
      coalesce(array(select jsonb_array_elements_text(coalesce(r->'may_contain','[]'::jsonb))),'{}'),
      coalesce(r->'storage','{}'::jsonb), coalesce(r->>'shelf_life',''), now(), auth.uid()
    )
    on conflict(product_id) do update set
      composition=excluded.composition, contains=excluded.contains, may_contain=excluded.may_contain,
      storage=excluded.storage, shelf_life=excluded.shelf_life, updated_at=now(), updated_by=auth.uid();
    n:=n+1;
  end loop;
  return n;
end;
$$;

grant execute on function public.panora_publish_product_customer_safety(jsonb) to authenticated;

create or replace function public.panora_public_product_customer_safety()
returns table(
  product_id text,
  composition_ru text, composition_en text, composition_es text,
  contains text[], may_contain text[],
  storage_ru text, storage_en text, storage_es text,
  shelf_life text
)
language sql
stable
security definer
set search_path=public
as $$
  select p.id::text,
         coalesce(s.composition->>'ru',''), coalesce(s.composition->>'en',''), coalesce(s.composition->>'es',''),
         coalesce(s.contains,'{}'), coalesce(s.may_contain,'{}'),
         coalesce(s.storage->>'ru',''), coalesce(s.storage->>'en',''), coalesce(s.storage->>'es',''),
         coalesce(s.shelf_life,'')
    from public.products p
    left join public.product_customer_safety s on s.product_id=p.id::text
   where p.active=true;
$$;

grant execute on function public.panora_public_product_customer_safety() to anon, authenticated;

notify pgrst, 'reload schema';
