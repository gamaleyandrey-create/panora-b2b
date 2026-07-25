-- Panora v238: optional expected payment date for a delivery note.
-- Safe to run more than once. Existing delivery notes are preserved.
alter table public.delivery_notes
  add column if not exists payment_due_date date;

