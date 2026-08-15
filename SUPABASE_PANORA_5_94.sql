-- Panora 5.94 — frozen purchase records / purchase archive

create table if not exists public.purchase_records (
  id uuid primary key,
  selection_key text not null,
  bake_dates jsonb not null default '[]'::jsonb,
  status text not null default 'fixed'
    check (status in ('fixed','ordered','received')),
  record_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists purchase_records_selection_key_uidx
  on public.purchase_records(selection_key);

alter table public.purchase_records enable row level security;

drop policy if exists "purchase_records_admin_all" on public.purchase_records;
create policy "purchase_records_admin_all"
on public.purchase_records
for all
to authenticated
using (public.panora_is_admin())
with check (public.panora_is_admin());

grant select, insert, update, delete
on public.purchase_records
to authenticated;

notify pgrst, 'reload schema';
