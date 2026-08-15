-- Panora 6.07 — cloud-synced raw material warehouse movements

create table if not exists public.raw_material_movements (
  id text primary key,
  movement_date date not null,
  ingredient_key text not null,
  ingredient_name text not null,
  unit text not null default 'g' check (unit in ('g','ml','pcs')),
  movement_type text not null check (movement_type in ('opening','purchase_in','inventory_set','correction_plus','correction_minus','written_off')),
  quantity numeric not null default 0 check (quantity >= 0),
  note text,
  device_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists raw_material_movements_date_idx
  on public.raw_material_movements (movement_date, created_at);

create index if not exists raw_material_movements_ingredient_idx
  on public.raw_material_movements (ingredient_key);

alter table public.raw_material_movements enable row level security;

drop policy if exists "raw_material_movements_admin_all" on public.raw_material_movements;
create policy "raw_material_movements_admin_all"
on public.raw_material_movements
for all
to authenticated
using (public.panora_is_admin())
with check (public.panora_is_admin());

grant select, insert, update, delete on public.raw_material_movements to authenticated;

notify pgrst, 'reload schema';
