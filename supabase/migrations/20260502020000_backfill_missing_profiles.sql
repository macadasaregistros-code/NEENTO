insert into public.profiles (id, full_name, role_global, created_at)
select
  users.id,
  coalesce(users.raw_user_meta_data ->> 'full_name', ''),
  case
    when not exists (select 1 from public.profiles)
      and row_number() over (order by users.created_at asc) = 1
      then 'owner'::public.profile_role
    else 'worker'::public.profile_role
  end,
  users.created_at
from auth.users
where not exists (
  select 1
  from public.profiles
  where profiles.id = users.id
)
on conflict (id) do nothing;

update public.profiles
set role_global = 'owner'
where id = (
  select id
  from public.profiles
  order by created_at asc
  limit 1
)
and not exists (
  select 1
  from public.profiles
  where role_global = 'owner'
);
