-- Kebun Cili: photos sent to the Telegram bot that are just logged (not tied to a problem or an entry).
-- Run in Supabase → SQL Editor. Safe to re-run.
-- The picture itself is in the private "photos" bucket as <photo_id>.jpg.

create table if not exists public.photo_logs (
  id          text primary key default gen_random_uuid()::text,
  occurred_at timestamptz not null,
  photo_id    text not null,
  caption     text,
  created_at  timestamptz not null default now()
);
create index if not exists photo_logs_time_idx on public.photo_logs (occurred_at);

alter table public.photo_logs enable row level security;

drop policy if exists "farm members" on public.photo_logs;
create policy "farm members" on public.photo_logs
  for all to authenticated
  using ((select public.is_farm_member()))
  with check ((select public.is_farm_member()));

grant select, insert, update, delete on public.photo_logs to authenticated, service_role;
