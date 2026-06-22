-- supabase/migrations/0005_security_hardening.sql

-- ──────────────────────────────────────────────────────────────
-- 1. Protect privileged profile columns from direct user writes.
--    The trigger runs SECURITY INVOKER (as the current PostgreSQL
--    role). When PostgREST serves an authenticated/anon request,
--    current_user = 'authenticated'/'anon', so we reset the cols.
--    When the update_follow_counts SECURITY DEFINER trigger fires,
--    current_user = its owner (postgres), so the guard allows it.
-- ──────────────────────────────────────────────────────────────
create or replace function public.guard_profile_privileged_columns()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.is_admin       := old.is_admin;
    new.followers_count := old.followers_count;
    new.following_count := old.following_count;
  end if;
  return new;
end;
$$;

create trigger enforce_profile_column_guard
  before update on public.profiles
  for each row execute function public.guard_profile_privileged_columns();

-- Revoke direct RPC call access (trigger-only function)
revoke execute on function public.guard_profile_privileged_columns() from anon, authenticated, public;

-- ──────────────────────────────────────────────────────────────
-- 2. Username format: 3–30 chars, alphanumeric + underscore only.
-- ──────────────────────────────────────────────────────────────
alter table public.profiles
  add constraint username_format
  check (username is null or (
    char_length(username) between 3 and 30
    and username ~ '^[a-zA-Z0-9_]+$'
  ));

-- ──────────────────────────────────────────────────────────────
-- 3. Text field length constraints.
-- ──────────────────────────────────────────────────────────────
alter table public.profiles
  add constraint display_name_length check (display_name is null or char_length(display_name) <= 60),
  add constraint bio_length          check (bio is null or char_length(bio) <= 300),
  add constraint city_length         check (city is null or char_length(city) <= 60);

alter table public.user_restaurants
  add constraint review_length check (review is null or char_length(review) <= 1000);

alter table public.lists
  add constraint list_title_length       check (char_length(title) <= 80),
  add constraint list_description_length check (description is null or char_length(description) <= 400);

alter table public.suggestions
  add constraint suggestion_name_length  check (char_length(name) <= 120),
  add constraint suggestion_notes_length check (notes is null or char_length(notes) <= 280);
