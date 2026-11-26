-- Kebun Cili: EC / pH measured where the water leaves the drip line (not a tank mix).
-- Run in Supabase → SQL Editor. Safe to re-run.

create table if not exists public.drip_readings (
  id          text primary key default gen_random_uuid()::text,
  occurred_at timestamptz not null,
  ec          numeric check (ec >= 0),
  ph          numeric check (ph >= 0 and ph <= 14),
  raw_message text,
  created_at  timestamptz not null default now(),
  check (ec is not null or ph is not null)
);
create index if not exists drip_readings_time_idx on public.drip_readings (occurred_at);

alter table public.drip_readings enable row level security;

drop policy if exists "farm members" on public.drip_readings;
create policy "farm members" on public.drip_readings
  for all to authenticated
  using ((select public.is_farm_member()))
  with check ((select public.is_farm_member()));

grant select, insert, update, delete on public.drip_readings to authenticated, service_role;
