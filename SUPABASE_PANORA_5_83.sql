-- Panora 5.83 — semi-finished ingredients in recipe_items
alter table public.recipe_items
  add column if not exists source_ingredient_name text,
  add column if not exists source_unit text,
  add column if not exists source_yield_pct numeric;

notify pgrst, 'reload schema';
