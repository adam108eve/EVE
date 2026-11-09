create table if not exists public.users (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  email text not null unique,
  "passwordHash" text not null,
  role text not null default 'USER' check (role in ('USER', 'ADMIN')),
  college text,
  "createdAt" timestamptz not null default now()
);

create table if not exists public.hackathons (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  description text not null,
  rules text not null,
  "startAt" timestamptz not null,
  "endAt" timestamptz not null,
  status text not null default 'UPCOMING' check (status in ('UPCOMING', 'LIVE', 'ENDED')),
  "totalSlots" integer not null default 100 check ("totalSlots" > 0),
  "maxRealParticipants" integer not null default 5 check ("maxRealParticipants" > 0),
  "resultsPublished" boolean not null default false,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  check ("endAt" >= "startAt")
);

create table if not exists public.registrations (
  id text primary key default gen_random_uuid()::text,
  "userId" text not null references public.users(id) on delete restrict,
  "hackathonId" text not null references public.hackathons(id) on delete restrict,
  "createdAt" timestamptz not null default now(),
  unique ("userId", "hackathonId")
);

create table if not exists public.submissions (
  id text primary key default gen_random_uuid()::text,
  "registrationId" text not null unique references public.registrations(id) on delete restrict,
  title text not null,
  description text not null,
  "repoUrl" text,
  "zipPath" text not null,
  "zipSize" integer not null,
  "submittedAt" timestamptz not null default now(),
  score double precision check (score is null or (score >= 0 and score <= 100)),
  "adminFeedback" text
);

create table if not exists public.leaderboard_entries (
  id text primary key default gen_random_uuid()::text,
  "hackathonId" text not null references public.hackathons(id) on delete restrict,
  rank integer not null check (rank > 0),
  "registrationId" text references public.registrations(id) on delete restrict,
  "displayName" text not null,
  score double precision not null check (score >= 0 and score <= 100),
  "isPlaceholder" boolean not null default false,
  unique ("hackathonId", rank)
);

create table if not exists public.announcements (
  id text primary key default gen_random_uuid()::text,
  "hackathonId" text references public.hackathons(id) on delete restrict,
  title text not null,
  body text not null,
  "createdAt" timestamptz not null default now()
);

create index if not exists registrations_hackathon_idx on public.registrations ("hackathonId");
create index if not exists leaderboard_hackathon_rank_idx on public.leaderboard_entries ("hackathonId", rank);
create index if not exists announcements_created_idx on public.announcements ("createdAt" desc);

alter table public.users enable row level security;
alter table public.hackathons enable row level security;
alter table public.registrations enable row level security;
alter table public.submissions enable row level security;
alter table public.leaderboard_entries enable row level security;
alter table public.announcements enable row level security;
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;

create or replace function public.touch_hackathon_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$;

drop trigger if exists hackathons_touch_updated_at on public.hackathons;
create trigger hackathons_touch_updated_at before update on public.hackathons
for each row execute function public.touch_hackathon_updated_at();

create or replace function public.register_for_hackathon(p_user_id text, p_hackathon_id text)
returns public.registrations
language plpgsql
security invoker
set search_path = public
as $$
declare
  event_row public.hackathons%rowtype;
  registration_row public.registrations%rowtype;
begin
  select * into event_row from public.hackathons where id = p_hackathon_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if event_row.status = 'ENDED' then raise exception 'ENDED'; end if;
  if exists (select 1 from public.registrations where "userId" = p_user_id and "hackathonId" = p_hackathon_id) then
    raise exception 'ALREADY_REGISTERED';
  end if;
  if (select count(*) from public.registrations where "hackathonId" = p_hackathon_id) >= event_row."maxRealParticipants" then
    raise exception 'FULL';
  end if;
  insert into public.registrations ("userId", "hackathonId") values (p_user_id, p_hackathon_id) returning * into registration_row;
  return registration_row;
end;
$$;

create or replace function public.save_rank_assignments(p_hackathon_id text, p_assignments jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  event_row public.hackathons%rowtype;
  assignment_count integer;
  participant_count integer;
begin
  select * into event_row from public.hackathons where id = p_hackathon_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  select count(*) into assignment_count from jsonb_to_recordset(p_assignments) as x("registrationId" text, rank integer, "displayName" text, score double precision);
  select count(*) into participant_count from public.registrations where "hackathonId" = p_hackathon_id;
  if assignment_count <> participant_count then raise exception 'ASSIGN_ALL_PARTICIPANTS'; end if;
  if exists (
    select 1 from jsonb_to_recordset(p_assignments) as x("registrationId" text, rank integer, "displayName" text, score double precision)
    where x.rank < 1 or x.rank > event_row."totalSlots" or x.score < 0 or x.score > 100 or length(trim(x."displayName")) = 0
  ) then raise exception 'INVALID_ASSIGNMENT'; end if;
  if (select count(distinct x.rank) from jsonb_to_recordset(p_assignments) as x("registrationId" text, rank integer, "displayName" text, score double precision)) <> assignment_count then
    raise exception 'DUPLICATE_RANK';
  end if;
  if (select count(distinct x."registrationId") from jsonb_to_recordset(p_assignments) as x("registrationId" text, rank integer, "displayName" text, score double precision)) <> assignment_count then
    raise exception 'DUPLICATE_PARTICIPANT';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_assignments) as x("registrationId" text, rank integer, "displayName" text, score double precision)
    left join public.registrations r on r.id = x."registrationId" and r."hackathonId" = p_hackathon_id where r.id is null
  ) then raise exception 'INVALID_PARTICIPANT'; end if;

  delete from public.leaderboard_entries where "hackathonId" = p_hackathon_id and
    ("registrationId" is not null or rank in (select x.rank from jsonb_to_recordset(p_assignments) as x("registrationId" text, rank integer, "displayName" text, score double precision)));
  insert into public.leaderboard_entries ("hackathonId", rank, "registrationId", "displayName", score, "isPlaceholder")
  select p_hackathon_id, x.rank, x."registrationId", x."displayName", x.score, false
  from jsonb_to_recordset(p_assignments) as x("registrationId" text, rank integer, "displayName" text, score double precision);
end;
$$;

create or replace function public.replace_filler_entries(p_hackathon_id text, p_entries jsonb)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  event_row public.hackathons%rowtype;
  entry_count integer;
  participant_count integer;
begin
  select * into event_row from public.hackathons where id = p_hackathon_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  select count(*) into participant_count from public.registrations where "hackathonId" = p_hackathon_id;
  select count(*) into entry_count from public.leaderboard_entries where "hackathonId" = p_hackathon_id and "registrationId" is not null;
  if entry_count <> participant_count then raise exception 'ASSIGN_ALL_PARTICIPANTS'; end if;
  delete from public.leaderboard_entries where "hackathonId" = p_hackathon_id and "registrationId" is null;
  insert into public.leaderboard_entries ("hackathonId", rank, "registrationId", "displayName", score, "isPlaceholder")
  select p_hackathon_id, x.rank, null, x."displayName", x.score, true
  from jsonb_to_recordset(p_entries) as x(rank integer, "displayName" text, score double precision);
  return jsonb_array_length(p_entries);
end;
$$;

create or replace function public.get_hackathon_registration_counts()
returns table("hackathonId" text, "registrationCount" integer)
language sql
stable
security invoker
set search_path = public
as $$
  select h.id, count(r.id)::integer
  from public.hackathons h
  left join public.registrations r on r."hackathonId" = h.id
  group by h.id;
$$;

insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', false)
on conflict (id) do update set public = false;

revoke execute on function public.register_for_hackathon(text, text) from public, anon, authenticated;
revoke execute on function public.save_rank_assignments(text, jsonb) from public, anon, authenticated;
revoke execute on function public.replace_filler_entries(text, jsonb) from public, anon, authenticated;
revoke execute on function public.get_hackathon_registration_counts() from public, anon, authenticated;
grant execute on function public.register_for_hackathon(text, text) to service_role;
grant execute on function public.save_rank_assignments(text, jsonb) to service_role;
grant execute on function public.replace_filler_entries(text, jsonb) to service_role;
grant execute on function public.get_hackathon_registration_counts() to service_role;
