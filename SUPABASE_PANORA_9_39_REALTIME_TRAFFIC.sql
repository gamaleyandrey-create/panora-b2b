-- Panora 9.39 — Traffic Optimization IX: targeted Realtime.
-- Run once in Supabase SQL Editor after publishing Panora 9.39.
-- Realtime is limited to orders and delivery-chat inserts. Existing polling remains
-- a rare fallback, so a temporary websocket outage does not block ordering.

begin;

-- Realtime must be able to authorize delivery-chat rows. Direct reads remain RLS-
-- protected: admins may see all messages; a partner may see only its restaurant.
alter table public.order_messages enable row level security;
grant select on public.order_messages to authenticated;

drop policy if exists panora_order_messages_realtime_read on public.order_messages;
create policy panora_order_messages_realtime_read
on public.order_messages
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id=auth.uid()
      and (
        p.role='admin'
        or (p.role='restaurant' and p.restaurant_id=order_messages.restaurant_id)
      )
  )
);

-- Add only the two tables that Panora 9.39 subscribes to. Duplicate membership is
-- harmless and is ignored for installations that already enabled Realtime.
do $$
begin
  begin
    alter publication supabase_realtime add table public.orders;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.order_messages;
  exception when duplicate_object then null;
  end;
end $$;

-- Helpful indexes for partner-filtered Realtime authorization and message lookups.
create index if not exists orders_restaurant_updated_at_idx
  on public.orders(restaurant_id,updated_at desc);
create index if not exists order_messages_restaurant_created_idx
  on public.order_messages(restaurant_id,created_at desc);

comment on policy panora_order_messages_realtime_read on public.order_messages is
  'Panora 9.39: RLS-scoped Realtime delivery-chat visibility.';

notify pgrst,'reload schema';
commit;

-- Diagnostic: both rows should show pubname = supabase_realtime.
select schemaname,tablename,pubname
from pg_publication_tables
where pubname='supabase_realtime'
  and schemaname='public'
  and tablename in ('orders','order_messages')
order by tablename;
