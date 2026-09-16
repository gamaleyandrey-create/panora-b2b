-- Panora 10.72 — safe LOT trace for partner delivery notes.
-- Adds only a customer-safe JSON summary to existing delivery_notes.

alter table public.delivery_notes
  add column if not exists lot_trace jsonb not null default '[]'::jsonb;

comment on column public.delivery_notes.lot_trace is
  'Customer-safe bread LOT summary: [{product, lot, quantity}]. No recipes, raw lots, suppliers or costs.';

notify pgrst, 'reload schema';
