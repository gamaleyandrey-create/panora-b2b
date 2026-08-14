-- Panora 5.58: separate partner storefront visibility from internal product activity
alter table public.products
  add column if not exists storefront_visible boolean not null default true;

update public.products
set storefront_visible = true
where storefront_visible is null;

comment on column public.products.storefront_visible is
  'If false, product stays available to bakery/internal workflows but is hidden from partner storefront/catalog.';
