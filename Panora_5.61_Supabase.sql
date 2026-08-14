-- Panora 5.61 — product schema hotfix
-- Fixes PGRST204: gallery_urls column missing.
-- Safe to run more than once.

alter table public.products
  add column if not exists gallery_urls jsonb not null default '[]'::jsonb;

alter table public.products
  add column if not exists storefront_visible boolean not null default true;

update public.products
set gallery_urls = '[]'::jsonb
where gallery_urls is null;

update public.products
set storefront_visible = true
where storefront_visible is null;

comment on column public.products.gallery_urls is
  'Additional product image URLs/data, JSON array, max 6 used by Panora UI.';

comment on column public.products.storefront_visible is
  'If false, product stays in bakery workflows but is hidden from partner storefront.';

-- Ask PostgREST/Supabase API to refresh its schema cache immediately.
notify pgrst, 'reload schema';
