-- Panora · связь пользователя Supabase Auth с карточкой ресторана.
-- Выполните этот файл один раз в Supabase SQL Editor.

create or replace function public.panora_link_restaurant_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_restaurant uuid;
begin
  select r.id into matched_restaurant
  from public.restaurants r
  where lower(r.email) = lower(new.email) and r.active = true
  limit 1;

  if matched_restaurant is not null then
    insert into public.profiles (id, role, restaurant_id, display_name)
    values (new.id, 'restaurant', matched_restaurant, coalesce(new.raw_user_meta_data->>'display_name', new.email))
    on conflict (id) do update set
      role = 'restaurant',
      restaurant_id = excluded.restaurant_id,
      display_name = excluded.display_name;
  end if;
  return new;
end;
$$;

drop trigger if exists panora_link_restaurant_after_signup on auth.users;
create trigger panora_link_restaurant_after_signup
after insert or update of email on auth.users
for each row execute function public.panora_link_restaurant_user();

-- Подключить уже созданных пользователей, если email совпадает с карточкой ресторана.
insert into public.profiles (id, role, restaurant_id, display_name)
select u.id, 'restaurant'::public.panora_role, r.id, coalesce(u.raw_user_meta_data->>'display_name', r.name)
from auth.users u
join public.restaurants r on lower(r.email) = lower(u.email)
where r.active = true
on conflict (id) do update set
  role = excluded.role,
  restaurant_id = excluded.restaurant_id,
  display_name = excluded.display_name;
