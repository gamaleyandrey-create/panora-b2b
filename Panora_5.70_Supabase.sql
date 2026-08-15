alter table public.products add column if not exists gallery_urls jsonb not null default '[]'::jsonb;
update public.products set gallery_urls='[]'::jsonb where gallery_urls is null or jsonb_typeof(gallery_urls) <> 'array';
alter table public.products add column if not exists category text not null default 'Хлеб';
notify pgrst, 'reload schema';
