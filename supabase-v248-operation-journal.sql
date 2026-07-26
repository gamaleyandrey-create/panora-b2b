-- Panora v248: permanent server-side operation journal.
-- Run this file once in Supabase SQL Editor as postgres.

create table if not exists public.operation_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  restaurant_id uuid references public.restaurants(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists operation_events_created_at_idx
  on public.operation_events (created_at desc);
create index if not exists operation_events_restaurant_created_idx
  on public.operation_events (restaurant_id, created_at desc);

alter table public.operation_events enable row level security;

drop policy if exists operation_events_admin_select on public.operation_events;
create policy operation_events_admin_select
  on public.operation_events for select to authenticated
  using (public.panora_is_admin());

drop policy if exists operation_events_restaurant_select on public.operation_events;
create policy operation_events_restaurant_select
  on public.operation_events for select to authenticated
  using (restaurant_id = public.panora_restaurant_id());

revoke all on public.operation_events from anon;
revoke insert, update, delete on public.operation_events from authenticated;
grant select on public.operation_events to authenticated;

create or replace function public.panora_log_operation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event text;
  v_restaurant uuid;
  v_entity uuid;
  v_payload jsonb := '{}'::jsonb;
begin
  if tg_table_name = 'orders' then
    v_restaurant := new.restaurant_id;
    v_entity := new.id;
    if tg_op = 'INSERT' then
      v_event := 'order.created';
      v_payload := jsonb_build_object(
        'order_number', new.order_number,
        'status', new.status,
        'previous_status', null
      );
    elsif old.status is distinct from new.status then
      v_event := 'order.status_changed';
      v_payload := jsonb_build_object(
        'order_number', new.order_number,
        'status', new.status,
        'previous_status', old.status
      );
    else
      return new;
    end if;
  elsif tg_table_name = 'delivery_notes' then
    v_restaurant := new.restaurant_id;
    v_entity := new.id;
    if tg_op = 'INSERT' then
      v_event := 'delivery_note.created';
      v_payload := jsonb_build_object(
        'note_number', new.note_number,
        'amount', new.total
      );
    elsif old.customer_confirmed_at is null and new.customer_confirmed_at is not null then
      v_event := 'delivery_note.confirmed';
      v_payload := jsonb_build_object(
        'note_number', new.note_number,
        'amount', new.total
      );
    else
      return new;
    end if;
  elsif tg_table_name = 'payments' then
    v_restaurant := new.restaurant_id;
    v_entity := new.id;
    if tg_op = 'INSERT' then
      v_event := 'payment.created';
      v_payload := jsonb_build_object(
        'amount', new.amount,
        'status', new.status
      );
    elsif old.status is distinct from new.status then
      v_event := 'payment.status_changed';
      v_payload := jsonb_build_object(
        'amount', new.amount,
        'status', new.status,
        'previous_status', old.status
      );
    else
      return new;
    end if;
  else
    return new;
  end if;

  insert into public.operation_events (
    event_type, entity_type, entity_id, restaurant_id, actor_id, payload
  ) values (
    v_event, tg_table_name, v_entity, v_restaurant, auth.uid(), v_payload
  );
  return new;
end;
$$;

drop trigger if exists panora_orders_operation_event on public.orders;
create trigger panora_orders_operation_event
after insert or update of status on public.orders
for each row execute function public.panora_log_operation();

drop trigger if exists panora_delivery_notes_operation_event on public.delivery_notes;
create trigger panora_delivery_notes_operation_event
after insert or update of customer_confirmed_at on public.delivery_notes
for each row execute function public.panora_log_operation();

drop trigger if exists panora_payments_operation_event on public.payments;
create trigger panora_payments_operation_event
after insert or update of status on public.payments
for each row execute function public.panora_log_operation();

notify pgrst, 'reload schema';
