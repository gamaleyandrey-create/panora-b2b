-- Panora 5.71 — storefront gallery and product categories
alter table public.products
  add column if not exists gallery_urls jsonb not null default '[]'::jsonb,
  add column if not exists category text not null default 'Хлеб';

update public.products
set
  gallery_urls = case
    when gallery_urls is null or jsonb_typeof(gallery_urls) <> 'array' then '[]'::jsonb
    else gallery_urls
  end,
  category = case
    when category is null or btrim(category) = '' then 'Хлеб'
    else category
  end;

create or replace function public.panora_public_product_media()
returns table(
  id text,
  category text,
  gallery_urls jsonb
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id::text,
    coalesce(nullif(btrim(p.category), ''), 'Хлеб')::text,
    coalesce(p.gallery_urls, '[]'::jsonb)
  from public.products p
  where coalesce(p.active, true) = true
    and coalesce(p.storefront_visible, true) = true
  order by p.created_at asc nulls last, p.id;
$$;

revoke all on function public.panora_public_product_media() from public;
grant execute on function public.panora_public_product_media() to anon, authenticated;

notify pgrst, 'reload schema';
