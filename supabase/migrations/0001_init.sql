-- Kebun Cili: initial schema (Phase 2).
-- Run once in Supabase → SQL Editor. Safe to re-run: everything is "if not exists".
--
-- Access model: one farm. Only users listed in farm_members can read or write
-- anything, enforced by Row Level Security, so the public anon key is useless
-- on its own (even if someone signs up).
--
-- IDs are text so the demo data's readable ids and new UUIDs both fit.
-- Type-specific activity fields live in a jsonb `details` column; the app
-- validates them (see src/lib/types.ts).

-- ── Members ────────────────────────────────────────────────────────────────
create table if not exists public.farm_members (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  name       text not null,
  role       text not null default 'farmer' check (role in ('farmer', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.is_farm_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.farm_members where user_id = (select auth.uid()));
$$;

-- ── Catalogue ──────────────────────────────────────────────────────────────
create table if not exists public.products (
  id                text primary key default gen_random_uuid()::text,
  name              text not null,
  category          text not null check (category in ('pesticide', 'fertilizer')),
  subtype           text not null,
  active_ingredient text,
  npk               text,
  unit              text not null,
  phi_days          int check (phi_days >= 0),
  notes             text,
  created_at        timestamptz not null default now()
);
create unique index if not exists products_name_key on public.products (lower(name));

create table if not exists public.varieties (
  id                          text primary key default gen_random_uuid()::text,
  name                        text not null,
  days_sow_to_transplant      int check (days_sow_to_transplant >= 0),
  days_transplant_to_flower   int check (days_transplant_to_flower >= 0),
  days_transplant_to_harvest  int check (days_transplant_to_harvest >= 0),
  harvest_season_days         int check (harvest_season_days >= 0),
  notes                       text,
  created_at                  timestamptz not null default now()
);
create unique index if not exists varieties_name_key on public.varieties (lower(name));

-- ── Planting batches ───────────────────────────────────────────────────────
create table if not exists public.batches (
  id               text primary key default gen_random_uuid()::text,
  name             text not null,
  variety_id       text references public.varieties (id) on delete set null,
  sown_on          date,
  seeds_count      int,
  transplanted_on  date,
  polybags_count   int,
  first_flower_on  date,
  first_harvest_on date,
  ended_on         date,
  notes            text,
  photos           jsonb not null default '[]',
  created_at       timestamptz not null default now(),
  check (sown_on is not null or transplanted_on is not null)
);
create unique index if not exists batches_name_key on public.batches (lower(name));

-- ── Problems ───────────────────────────────────────────────────────────────
create table if not exists public.problems (
  id              text primary key default gen_random_uuid()::text,
  title           text not null,
  symptoms        text not null default '',
  affected_part   text not null,
  severity        text not null check (severity in ('low', 'medium', 'high')),
  suspected_cause text not null default 'Unknown',
  cause_kind      text not null,
  tags            text[] not null default '{}',
  status          text not null default 'open' check (status in ('open', 'resolved')),
  outcome         text check (outcome in ('solved', 'partly', 'not_solved')),
  lesson          text,
  found_on        date not null,
  resolved_on     date,
  batch_id        text references public.batches (id) on delete set null,
  photos          jsonb not null default '[]',
  created_at      timestamptz not null default now()
);
create index if not exists problems_found_on_idx on public.problems (found_on desc);

create table if not exists public.problem_updates (
  id          text primary key default gen_random_uuid()::text,
  problem_id  text not null references public.problems (id) on delete cascade,
  kind        text not null check (kind in ('action', 'followup')),
  body        text not null default '',
  occurred_at timestamptz not null,
  photos      jsonb not null default '[]',
  created_at  timestamptz not null default now()
);
create index if not exists problem_updates_problem_idx on public.problem_updates (problem_id);

-- ── Activities: spray / tank_mix / fertilizer ──────────────────────────────
create table if not exists public.activities (
  id          text primary key default gen_random_uuid()::text,
  type        text not null check (type in ('spray', 'tank_mix', 'fertilizer')),
  occurred_at timestamptz not null,
  batch_ids   text[] not null default '{}',
  problem_id  text references public.problems (id) on delete set null,
  details     jsonb not null,
  notes       text,
  raw_message text,
  photos      jsonb not null default '[]',
  created_at  timestamptz not null default now()
);
create index if not exists activities_occurred_at_idx on public.activities (occurred_at desc);
create index if not exists activities_batch_ids_idx on public.activities using gin (batch_ids);
create index if not exists activities_problem_idx on public.activities (problem_id);

-- A deleted batch disappears from every activity's batch list.
create or replace function public.remove_batch_from_activities()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.activities set batch_ids = array_remove(batch_ids, old.id) where old.id = any (batch_ids);
  return old;
end;
$$;

drop trigger if exists batches_remove_from_activities on public.batches;
create trigger batches_remove_from_activities
  before delete on public.batches
  for each row execute function public.remove_batch_from_activities();

-- ── Row Level Security ─────────────────────────────────────────────────────
alter table public.farm_members    enable row level security;
alter table public.products        enable row level security;
alter table public.varieties       enable row level security;
alter table public.batches         enable row level security;
alter table public.problems        enable row level security;
alter table public.problem_updates enable row level security;
alter table public.activities      enable row level security;

drop policy if exists "members see themselves" on public.farm_members;
create policy "members see themselves" on public.farm_members
  for select to authenticated using (user_id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['products', 'varieties', 'batches', 'problems', 'problem_updates', 'activities'] loop
    execute format('drop policy if exists "farm members" on public.%I', t);
    execute format(
      'create policy "farm members" on public.%I for all to authenticated using ((select public.is_farm_member())) with check ((select public.is_farm_member()))',
      t
    );
  end loop;
end $$;

-- ── Photo storage (private bucket) ─────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

drop policy if exists "farm members read photos" on storage.objects;
create policy "farm members read photos" on storage.objects
  for select to authenticated using (bucket_id = 'photos' and (select public.is_farm_member()));

drop policy if exists "farm members upload photos" on storage.objects;
create policy "farm members upload photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'photos' and (select public.is_farm_member()));

drop policy if exists "farm members delete photos" on storage.objects;
create policy "farm members delete photos" on storage.objects
  for delete to authenticated using (bucket_id = 'photos' and (select public.is_farm_member()));
