-- Panora 9.60 — linked Spanish commercial/tax documents.
-- Run once in Supabase SQL Editor after publishing Panora 9.60.
-- This stores immutable document snapshots and AEAT classification metadata.
-- It does NOT itself submit records to AEAT / VERI*FACTU.

begin;

create extension if not exists pgcrypto;

create table if not exists public.panora_spanish_documents (
  id uuid primary key default gen_random_uuid(),
  document_kind text not null check (document_kind in ('albaran','factura','factura_simplificada','factura_rectificativa','devolucion','abono')),
  aeat_type text check (aeat_type is null or aeat_type in ('F1','F2','R1','R2','R3','R4','R5')),
  series text not null,
  sequence_no bigint not null,
  document_number text not null unique,
  issue_date date not null,
  operation_date date not null,
  due_date date,
  restaurant_id uuid not null references public.restaurants(id),
  delivery_note_id uuid references public.delivery_notes(id),
  rectifies_number text,
  rectification_mode text check (rectification_mode is null or rectification_mode in ('I','S')),
  seller jsonb not null,
  buyer jsonb not null default '{}'::jsonb,
  lines jsonb not null default '[]'::jsonb,
  tax_breakdown jsonb not null default '[]'::jsonb,
  taxable_base numeric not null default 0,
  tax_total numeric not null default 0,
  total numeric not null default 0,
  payment_method text,
  notes text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

create unique index if not exists panora_spanish_documents_series_sequence_uidx
  on public.panora_spanish_documents(series, sequence_no);
create index if not exists panora_spanish_documents_note_idx
  on public.panora_spanish_documents(delivery_note_id, created_at);
create index if not exists panora_spanish_documents_restaurant_idx
  on public.panora_spanish_documents(restaurant_id, created_at);

alter table public.panora_spanish_documents enable row level security;
revoke all on public.panora_spanish_documents from anon, authenticated;
grant select on public.panora_spanish_documents to authenticated;

drop policy if exists panora_spanish_documents_admin_read on public.panora_spanish_documents;
create policy panora_spanish_documents_admin_read
on public.panora_spanish_documents
for select to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

drop policy if exists panora_spanish_documents_partner_read on public.panora_spanish_documents;
create policy panora_spanish_documents_partner_read
on public.panora_spanish_documents
for select to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='restaurant' and p.restaurant_id=restaurant_id));

create or replace function public.panora_issue_spanish_document_v2(
  p_document_kind text,
  p_aeat_type text,
  p_series text,
  p_issue_date date,
  p_operation_date date,
  p_due_date date,
  p_restaurant_id uuid,
  p_delivery_note_id uuid,
  p_rectifies_number text,
  p_rectification_mode text,
  p_seller jsonb,
  p_buyer jsonb,
  p_lines jsonb,
  p_tax_breakdown jsonb,
  p_taxable_base numeric,
  p_tax_total numeric,
  p_total numeric,
  p_payment_method text,
  p_notes text
)
returns public.panora_spanish_documents
language plpgsql
security definer
set search_path=public
as $$
declare
  v_role text;
  v_series text:=upper(trim(coalesce(p_series,'')));
  v_next bigint;
  v_number text;
  v_row public.panora_spanish_documents;
begin
  select role into v_role from public.profiles where id=auth.uid();
  if v_role <> 'admin' then raise exception 'PANORA_FORBIDDEN'; end if;

  if p_document_kind not in ('albaran','factura','factura_simplificada','factura_rectificativa','devolucion','abono') then
    raise exception 'PANORA_DOCUMENT_KIND';
  end if;
  if p_document_kind='factura' and p_aeat_type<>'F1' then raise exception 'PANORA_AEAT_TYPE'; end if;
  if p_document_kind='factura_simplificada' and p_aeat_type<>'F2' then raise exception 'PANORA_AEAT_TYPE'; end if;
  if p_document_kind in ('factura_rectificativa','devolucion','abono') and p_aeat_type not in ('R1','R2','R3','R4','R5') then raise exception 'PANORA_AEAT_TYPE'; end if;
  if p_document_kind in ('factura_rectificativa','devolucion','abono') and coalesce(trim(p_rectifies_number),'')='' then raise exception 'PANORA_RECTIFIED_INVOICE_REQUIRED'; end if;
  if p_document_kind in ('factura_rectificativa','devolucion','abono') and p_rectification_mode not in ('I','S') then raise exception 'PANORA_RECTIFICATION_MODE'; end if;
  if length(v_series)<1 or length(v_series)>12 then raise exception 'PANORA_SERIES'; end if;
  if p_issue_date is null or p_operation_date is null then raise exception 'PANORA_DATE_REQUIRED'; end if;
  if not exists(select 1 from public.restaurants r where r.id=p_restaurant_id) then raise exception 'PANORA_RESTAURANT_NOT_FOUND'; end if;
  if p_delivery_note_id is not null and not exists(select 1 from public.delivery_notes d where d.id=p_delivery_note_id and d.restaurant_id=p_restaurant_id) then raise exception 'PANORA_DELIVERY_NOTE_MISMATCH'; end if;
  if jsonb_typeof(coalesce(p_seller,'{}'::jsonb))<>'object' or jsonb_typeof(coalesce(p_buyer,'{}'::jsonb))<>'object' then raise exception 'PANORA_PARTY_SNAPSHOT'; end if;
  if jsonb_typeof(coalesce(p_lines,'[]'::jsonb))<>'array' or jsonb_array_length(coalesce(p_lines,'[]'::jsonb))=0 then raise exception 'PANORA_LINES_REQUIRED'; end if;

  perform pg_advisory_xact_lock(hashtext('panora-spanish-doc:'||v_series));
  select coalesce(max(sequence_no),0)+1 into v_next from public.panora_spanish_documents where series=v_series;
  v_number:=v_series||'-'||lpad(v_next::text,4,'0');

  insert into public.panora_spanish_documents(
    document_kind,aeat_type,series,sequence_no,document_number,issue_date,operation_date,due_date,
    restaurant_id,delivery_note_id,rectifies_number,rectification_mode,seller,buyer,lines,tax_breakdown,
    taxable_base,tax_total,total,payment_method,notes,created_by
  ) values (
    p_document_kind,nullif(p_aeat_type,''),v_series,v_next,v_number,p_issue_date,p_operation_date,p_due_date,
    p_restaurant_id,p_delivery_note_id,nullif(trim(p_rectifies_number),''),nullif(p_rectification_mode,''),
    coalesce(p_seller,'{}'::jsonb),coalesce(p_buyer,'{}'::jsonb),coalesce(p_lines,'[]'::jsonb),coalesce(p_tax_breakdown,'[]'::jsonb),
    round(coalesce(p_taxable_base,0),2),round(coalesce(p_tax_total,0),2),round(coalesce(p_total,0),2),nullif(trim(p_payment_method),''),nullif(trim(p_notes),''),auth.uid()
  ) returning * into v_row;
  return v_row;
end
$$;

revoke all on function public.panora_issue_spanish_document_v2(text,text,text,date,date,date,uuid,uuid,text,text,jsonb,jsonb,jsonb,jsonb,numeric,numeric,numeric,text,text) from public;
grant execute on function public.panora_issue_spanish_document_v2(text,text,text,date,date,date,uuid,uuid,text,text,jsonb,jsonb,jsonb,jsonb,numeric,numeric,numeric,text,text) to authenticated;

comment on table public.panora_spanish_documents is
  'Panora 9.60 immutable snapshots of linked Spanish commercial documents. AEAT classification is stored but transmission to AEAT/VERI*FACTU is outside this migration.';

notify pgrst,'reload schema';
commit;

-- Diagnostic: table and RPC should exist after the migration.
select to_regclass('public.panora_spanish_documents') as spanish_documents_table,
       to_regprocedure('public.panora_issue_spanish_document_v2(text,text,text,date,date,date,uuid,uuid,text,text,jsonb,jsonb,jsonb,jsonb,numeric,numeric,numeric,text,text)') as issue_rpc;
