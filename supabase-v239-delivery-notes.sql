-- Panora v239: bring an older delivery_notes table up to date.
-- Safe to run more than once. Existing orders and delivery notes are preserved.
alter table public.delivery_notes
  add column if not exists payment_due_date date,
  add column if not exists offline_received_at timestamptz,
  add column if not exists offline_receiver text,
  add column if not exists offline_signature text;

comment on column public.delivery_notes.payment_due_date is
  'Expected payment date shown to the bakery and restaurant.';
comment on column public.delivery_notes.offline_received_at is
  'Local fallback receipt time; distinct from authenticated customer confirmation.';
comment on column public.delivery_notes.offline_signature is
  'Data URL signature captured on the bakery device while offline.';

notify pgrst, 'reload schema';
