do $$
begin
  create type public.app_persona as enum ('daiki', 'jju');
exception when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists app_persona public.app_persona;

create unique index if not exists profiles_app_persona_unique_idx
  on public.profiles (app_persona)
  where app_persona is not null;

create or replace function public.get_app_persona_for_email(target_email text)
returns public.app_persona
language sql
immutable
set search_path = public
as $$
  select case lower(coalesce(target_email, ''))
    when 'david.lamilla@hotmail.com' then 'daiki'::public.app_persona
    when 'yuaa222@naver.com' then 'jju'::public.app_persona
    else null
  end;
$$;

create or replace function public.get_role_for_app_persona(target_persona public.app_persona)
returns public.profile_role
language sql
immutable
set search_path = public
as $$
  select case target_persona
    when 'daiki'::public.app_persona then 'owner'::public.profile_role
    when 'jju'::public.app_persona then 'worker'::public.profile_role
    else null
  end;
$$;

create or replace function public.current_app_persona()
returns public.app_persona
language sql
stable
set search_path = public
as $$
  select public.get_app_persona_for_email(auth.jwt() ->> 'email');
$$;

create or replace function public.is_known_app_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = target_user_id
      and app_persona is not null
  );
$$;

insert into public.profiles (id, full_name, role_global, app_persona, created_at)
select
  users.id,
  coalesce(users.raw_user_meta_data ->> 'full_name', ''),
  public.get_role_for_app_persona(public.get_app_persona_for_email(users.email)),
  public.get_app_persona_for_email(users.email),
  users.created_at
from auth.users
where public.get_app_persona_for_email(users.email) is not null
on conflict (id) do update set
  app_persona = excluded.app_persona,
  role_global = excluded.role_global,
  full_name = case
    when public.profiles.full_name = '' then excluded.full_name
    else public.profiles.full_name
  end;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_persona public.app_persona;
begin
  next_persona := public.get_app_persona_for_email(new.email);

  if next_persona is null then
    raise exception 'Neento only allows the Daiki and Jju accounts.'
      using errcode = '28000';
  end if;

  insert into public.profiles (id, full_name, role_global, app_persona)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    public.get_role_for_app_persona(next_persona),
    next_persona
  )
  on conflict (id) do update set
    app_persona = excluded.app_persona,
    role_global = excluded.role_global,
    full_name = case
      when public.profiles.full_name = '' then excluded.full_name
      else public.profiles.full_name
    end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.ensure_current_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles;
  next_persona public.app_persona;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  next_persona := public.get_app_persona_for_email(auth.jwt() ->> 'email');

  if next_persona is null then
    raise exception 'Neento only allows the Daiki and Jju accounts.'
      using errcode = '28000';
  end if;

  insert into public.profiles (id, full_name, role_global, app_persona)
  values (
    auth.uid(),
    coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', ''),
    public.get_role_for_app_persona(next_persona),
    next_persona
  )
  on conflict (id) do update set
    app_persona = excluded.app_persona,
    role_global = excluded.role_global,
    full_name = case
      when public.profiles.full_name = '' then excluded.full_name
      else public.profiles.full_name
    end;

  select *
  into current_profile
  from public.profiles
  where id = auth.uid();

  return current_profile;
end;
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and app_persona = 'daiki'::public.app_persona
      and role_global = 'owner'
  );
$$;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_select_known_app_users" on public.profiles;
drop policy if exists "profiles_update_own_locked_identity" on public.profiles;

create policy "profiles_select_known_app_users"
on public.profiles
for select
to authenticated
using (
  public.current_app_persona() is not null
  and app_persona is not null
);

create policy "profiles_update_own_locked_identity"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and app_persona = public.current_app_persona()
  and role_global = public.get_role_for_app_persona(app_persona)
);

drop policy if exists "cards_select_starter_or_own" on public.cards;
drop policy if exists "cards_select_starter_or_app_users" on public.cards;

create policy "cards_select_starter_or_app_users"
on public.cards
for select
to anon, authenticated
using (
  is_starter = true
  or user_id = auth.uid()
  or (
    public.current_app_persona() is not null
    and public.is_known_app_user(user_id)
  )
);

drop policy if exists "card_progress_select_own" on public.card_progress;
drop policy if exists "card_progress_select_app_users" on public.card_progress;

create policy "card_progress_select_app_users"
on public.card_progress
for select
to authenticated
using (
  user_id = auth.uid()
  or (
    public.current_app_persona() is not null
    and public.is_known_app_user(user_id)
  )
);
