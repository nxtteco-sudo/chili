-- Kebun Cili: table permissions for the app (Phase 2 follow-up).
-- Newer Supabase projects no longer grant API roles access to tables created
-- in SQL, so grant it explicitly. Row Level Security still decides which rows
-- a logged-in user can touch; `anon` (logged-out) gets no table access at all.
-- Safe to re-run.

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated, service_role;

grant execute on function public.is_farm_member() to authenticated, service_role;
grant execute on function public.remove_batch_from_activities() to authenticated, service_role;
