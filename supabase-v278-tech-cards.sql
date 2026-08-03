-- Panora v278: cloud storage for bakery technology cards.
alter table public.products
  add column if not exists tech_card jsonb not null default '{}'::jsonb;

comment on column public.products.tech_card is
  'Mixing, fermentation, proofing, baking and baker notes for the product recipe';
