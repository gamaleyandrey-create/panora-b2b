-- Panora 5.87 — bakery finance expenses
create table if not exists public.finance_expenses (
  id uuid primary key,
  expense_date date not null,
  category text not null default 'Другое',
  description text,
  expense_type text not null default 'variable' check (expense_type in ('variable','fixed')),
  gross_amount numeric not null check (gross_amount >= 0),
  vat_rate numeric not null default 0 check (vat_rate >= 0),
  vat_deductible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.finance_expenses enable row level security;

drop policy if exists "finance_expenses_admin_all" on public.finance_expenses;
create policy "finance_expenses_admin_all"
on public.finance_expenses
for all
to authenticated
using (public.panora_is_admin())
with check (public.panora_is_admin());

grant select, insert, update, delete on public.finance_expenses to authenticated;

notify pgrst, 'reload schema';
