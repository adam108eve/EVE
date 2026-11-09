create table if not exists public.rate_limit_counters (
  key text primary key,
  count integer not null check (count > 0),
  reset_at timestamptz not null
);

create index if not exists rate_limit_counters_reset_at_idx
  on public.rate_limit_counters (reset_at);

alter table public.rate_limit_counters enable row level security;
grant usage on schema public to service_role;
grant all privileges on table public.rate_limit_counters to service_role;

create or replace function public.check_rate_limit(p_key text, p_limit integer, p_window_ms integer)
returns table(allowed boolean, remaining integer)
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_count integer;
  v_now timestamptz := clock_timestamp();
  v_next_reset timestamptz;
begin
  if p_limit < 1 or p_window_ms < 1 or length(p_key) <> 64 then
    raise exception 'INVALID_RATE_LIMIT_ARGUMENTS';
  end if;

  v_next_reset := v_now + make_interval(secs => p_window_ms::double precision / 1000.0);

  insert into public.rate_limit_counters as counters (key, count, reset_at)
  values (p_key, 1, v_next_reset)
  on conflict (key) do update set
    count = case when counters.reset_at <= v_now then 1 else counters.count + 1 end,
    reset_at = case when counters.reset_at <= v_now then v_next_reset else counters.reset_at end
  returning count into current_count;

  -- Opportunistically prune expired identities so abandoned keys do not grow forever.
  if random() < 0.01 then
    delete from public.rate_limit_counters where reset_at <= v_now;
  end if;

  return query select current_count <= p_limit, greatest(0, p_limit - current_count);
end;
$$;

revoke execute on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
