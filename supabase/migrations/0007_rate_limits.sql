-- supabase/migrations/0007_rate_limits.sql

-- ──────────────────────────────────────────────────────────────
-- Durable rate limiting.
--
-- Replaces the in-memory Map in src/lib/rate-limit.ts, which was
-- per-serverless-instance and reset on every cold start, so the limit
-- did not actually hold across instances.
--
-- Middleware runs on the Edge runtime and cannot open a Postgres
-- connection, so the counter is reached over HTTP through a
-- SECURITY DEFINER function called with the anon key. That keeps the
-- service-role key out of the edge bundle entirely, and makes the
-- read-increment-compare atomic in a single round trip.
-- ──────────────────────────────────────────────────────────────

create table if not exists public.rate_limits (
  key          text        not null,
  window_start timestamptz not null,
  count        int         not null default 0,
  primary key (key, window_start)
);

-- Nothing reaches this table directly. RLS is enabled with no policies,
-- which denies anon and authenticated outright; only the SECURITY DEFINER
-- function below can touch it.
alter table public.rate_limits enable row level security;

create index if not exists rate_limits_window_start_idx
  on public.rate_limits (window_start);

-- Returns true when the caller has exceeded the limit for the current
-- window, false when the request should be allowed.
create or replace function public.check_rate_limit(
  p_key            text,
  p_max_requests   int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window_start timestamptz;
  v_count        int;
begin
  if p_key is null or p_window_seconds is null or p_window_seconds <= 0
     or p_max_requests is null or p_max_requests < 0 then
    -- Bad arguments must never lock anyone out. Fail open.
    return false;
  end if;

  -- Floor the clock to the start of the current fixed window, matching
  -- the semantics of the in-memory implementation this replaces.
  v_window_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limits as rl (key, window_start, count)
  values (p_key, v_window_start, 1)
  on conflict (key, window_start)
    do update set count = rl.count + 1
  returning rl.count into v_count;

  -- Opportunistic cleanup. Expired windows are dead weight; sweeping ~1%
  -- of the time keeps the table small without needing pg_cron.
  if random() < 0.01 then
    delete from public.rate_limits
    where window_start < v_window_start - interval '1 hour';
  end if;

  return v_count > p_max_requests;
end;
$$;

-- Postgres grants EXECUTE to PUBLIC by default; narrow it deliberately.
revoke all on function public.check_rate_limit(text, int, int) from public;
grant execute on function public.check_rate_limit(text, int, int)
  to anon, authenticated;
