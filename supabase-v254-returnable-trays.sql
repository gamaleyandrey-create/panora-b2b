-- Panora v254: returnable delivery trays.
alter table public.delivery_notes
  add column if not exists trays_delivered integer not null default 0,
  add column if not exists trays_returned integer not null default 0,
  add column if not exists tray_balance_after integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'delivery_notes_trays_delivered_nonnegative'
  ) then
    alter table public.delivery_notes
      add constraint delivery_notes_trays_delivered_nonnegative
      check (trays_delivered >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'delivery_notes_trays_returned_nonnegative'
  ) then
    alter table public.delivery_notes
      add constraint delivery_notes_trays_returned_nonnegative
      check (trays_returned >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'delivery_notes_tray_balance_nonnegative'
  ) then
    alter table public.delivery_notes
      add constraint delivery_notes_tray_balance_nonnegative
      check (tray_balance_after >= 0);
  end if;
end $$;

with running as (
  select
    id,
    greatest(
      0,
      sum(coalesce(trays_delivered, 0) - coalesce(trays_returned, 0))
        over (
          partition by restaurant_id
          order by delivered_at, note_number, id
        )
    )::integer as balance
  from public.delivery_notes
)
update public.delivery_notes dn
set tray_balance_after = running.balance
from running
where dn.id = running.id;

notify pgrst, 'reload schema';
