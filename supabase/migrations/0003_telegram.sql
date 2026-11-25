-- Kebun Cili: Telegram bot (Phase 4). Run in Supabase → SQL Editor. Safe to re-run.
--
-- Only the bot's server code touches these tables, using the service role key,
-- which bypasses Row Level Security. RLS is on with no policies, so the public
-- anon key and logged-in dashboard users cannot read or write them at all.

-- Who may talk to the bot. Anyone not listed is ignored.
create table if not exists public.telegram_users (
  telegram_id bigint primary key,
  name        text not null,
  role        text not null default 'farmer' check (role in ('farmer', 'admin')),
  created_at  timestamptz not null default now()
);

-- Where each person is in a guided flow (webhook calls are stateless).
create table if not exists public.bot_sessions (
  telegram_id bigint primary key,
  state       jsonb not null default '{}',
  updated_at  timestamptz not null default now()
);

alter table public.telegram_users enable row level security;
alter table public.bot_sessions   enable row level security;

grant select, insert, update, delete on public.telegram_users, public.bot_sessions to service_role;
