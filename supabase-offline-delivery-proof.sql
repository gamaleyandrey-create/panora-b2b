-- Panora v222: offline receipt evidence captured on the bakery device.
alter table public.delivery_notes
  add column if not exists offline_received_at timestamptz,
  add column if not exists offline_receiver text,
  add column if not exists offline_signature text;

comment on column public.delivery_notes.offline_received_at is 'Local fallback receipt time; distinct from authenticated customer confirmation.';
comment on column public.delivery_notes.offline_signature is 'Data URL signature captured on the bakery device while offline.';
