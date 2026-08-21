-- Panora 9.34 — traffic optimization helpers.
-- Optional but recommended: run once in Supabase SQL Editor.
-- The storefront uses this tiny revision RPC before downloading the full
-- catalogue/rules/media payload. If the revision is unchanged, the heavy
-- catalogue RPCs are skipped.

begin;

create or replace function public.panora_public_catalog_revision()
returns table(revision text)
language sql
security definer
set search_path = public
stable
as $$
  select md5(
    coalesce(max(p.updated_at)::text, '') || ':' ||
    count(*)::text
  )::text as revision
  from public.products p
  where coalesce(p.active, true) = true
    and coalesce(p.storefront_visible, true) = true;
$$;

revoke all on function public.panora_public_catalog_revision() from public;
grant execute on function public.panora_public_catalog_revision() to anon, authenticated;

comment on function public.panora_public_catalog_revision() is
  'Panora 9.34: lightweight public catalogue revision used to avoid repeated full catalogue/rules/media downloads.';

notify pgrst, 'reload schema';

commit;

-- Diagnostic. Expected: one short revision string.
select * from public.panora_public_catalog_revision();
