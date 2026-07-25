begin;

create or replace function public.panora_record_payment(
  p_restaurant_id uuid,
  p_amount numeric,
  p_method text default 'Наличные',
  p_note text default null,
  p_delivery_note_id uuid default null,
  p_received_at timestamptz default now()
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments;
begin
  if not public.panora_is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Payment amount must be greater than zero'
      using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.restaurants where id = p_restaurant_id
  ) then
    raise exception 'Restaurant not found' using errcode = '23503';
  end if;

  if p_delivery_note_id is not null and not exists (
    select 1
    from public.delivery_notes
    where id = p_delivery_note_id
      and restaurant_id = p_restaurant_id
  ) then
    raise exception 'Delivery note does not belong to restaurant'
      using errcode = '23503';
  end if;

  insert into public.payments (
    restaurant_id,
    delivery_note_id,
    amount,
    method,
    note,
    status,
    received_at
  )
  values (
    p_restaurant_id,
    p_delivery_note_id,
    round(p_amount, 2),
    coalesce(nullif(trim(p_method), ''), 'Наличные'),
    nullif(trim(p_note), ''),
    'pending',
    coalesce(p_received_at, now())
  )
  returning * into v_payment;

  return v_payment;
end;
$$;

create or replace function public.panora_confirm_payment(
  p_payment_id uuid
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments;
begin
  if not public.panora_is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  select *
  into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Payment not found' using errcode = 'P0002';
  end if;

  if v_payment.status = 'cancelled' then
    raise exception 'Cancelled payment cannot be confirmed'
      using errcode = '22023';
  end if;

  if v_payment.status <> 'confirmed' then
    update public.payments
    set
      status = 'confirmed',
      confirmed_at = now(),
      confirmed_by = auth.uid()
    where id = p_payment_id
    returning * into v_payment;
  end if;

  return v_payment;
end;
$$;

revoke all on function public.panora_record_payment(
  uuid, numeric, text, text, uuid, timestamptz
) from public, anon;
revoke all on function public.panora_confirm_payment(uuid)
  from public, anon;

grant execute on function public.panora_record_payment(
  uuid, numeric, text, text, uuid, timestamptz
) to authenticated;
grant execute on function public.panora_confirm_payment(uuid)
  to authenticated;

commit;
