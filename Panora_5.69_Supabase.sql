-- Panora 5.69 — product categories
alter table public.products
  add column if not exists category text not null default 'Хлеб';

update public.products
set category='Хлеб'
where category is null or btrim(category)='';

notify pgrst, 'reload schema';
