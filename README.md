# Kebun Cili — Farm Log

Dashboard (installable PWA) for the chili farm log: planting batches, AB tank mixes (EC/pH),
sprays, other baja and problems. Entries will also come from a Telegram bot.
See [PROJECT.md](PROJECT.md) for the full plan.

## Run locally

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

On first run the app creates `data/farm.json` filled with ~5 months of demo data. An older
`farm.json` from before planting batches existed is replaced with fresh demo data automatically.
Uploaded photos go to `data/uploads/`. **More → Reset to demo data** starts over.
The `data/` folder is git-ignored and is replaced by Supabase in Phase 2.

## Where things are

- `src/lib/data.ts`: every read the pages use
- `src/app/actions.ts`: every save/delete (server actions)
- `src/lib/store.ts`: the local JSON file store (swapped for Supabase in Phase 2)
- `src/lib/batches.ts`: batch stage and expected dates from the variety's day counts
- `src/lib/demo-data.ts`: demo farm data (3 batches, tank mixes every 5 days)
- `src/app/api/photos`, `src/app/photos/[id]`: photo upload and serving
- `src/app/export/*`: CSV downloads for Excel
- `public/sw.js`, `src/app/manifest.ts`, `src/app/icon.tsx`: PWA install + offline page

## Not yet

- **No login.** Anyone who can reach the server can edit. Fine on this computer; login is added
  with Supabase before the app goes online.
