# Kebun Cili — Farm Log

Dashboard (installable PWA) for the chili farm log: planting batches, AB tank mixes (EC/pH),
sprays, other baja and problems. Entries will also come from a Telegram bot.
See [PROJECT.md](PROJECT.md) for the full plan.

## Run locally

1. Create `.env.local` with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...   # secret, server-only
   ```
2. In Supabase → SQL Editor, run `supabase/migrations/0001_init.sql` (safe to re-run).
3. Supabase → Authentication: turn off "Allow new users to sign up", add users (auto-confirm),
   then add each to the member list:
   ```sql
   insert into public.farm_members (user_id, name, role)
   select id, 'Name', 'admin' from auth.users where email = 'you@example.com';
   ```
4. `pnpm install && pnpm dev`, log in at http://localhost:3000, and use
   **More → Reset to demo data** to load the demo farm.

## Where things are

- `src/lib/data.ts`: every read the pages use
- `src/app/actions.ts`: every save/delete (server actions)
- `src/lib/db.ts`: Supabase reads/writes and photo storage; `src/lib/auth.ts` + `src/proxy.ts`: login
- `src/lib/batches.ts`: batch stage and expected dates from the variety's day counts
- `src/lib/demo-data.ts`: demo farm data (3 batches, tank mixes every 5 days)
- `src/app/api/photos`, `src/app/photos/[id]`: photo upload and serving (private bucket, members only)
- `src/app/export/*`: CSV downloads for Excel
- `src/app/sw.js` + `src/lib/service-worker.ts`, `src/app/manifest.ts`, `src/app/icon.tsx`: PWA install + offline page
