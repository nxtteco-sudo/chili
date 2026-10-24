# Chili Farm Log — Project Plan

A farm logbook for a chili farm. The farmer logs everything (planting batches, pesticide sprays, AB fertilizer tank mixes, other baja, problems and how they were solved) by messaging a **Telegram bot** in mixed English/Malay. Every entry appears on a **dashboard** (installable PWA) that works on phone and laptop. When a problem comes back, the farmer can ask the bot or search the dashboard to see what was done the first time and whether it worked.

> Status: **Phase 1b done** (2026-10-24): dashboard matches how the farm works (planting batches + varieties, AB tank mix with EC/pH, other baja, no RM), on a local file store (`data/`). **Next: Phase 2, connect Supabase.**

---

## 1. Goals

1. **Logging takes seconds.** The farmer only uses Telegram, with buttons or free text, in English, Malay or both.
2. **Every detail is recorded:** planting dates, product, dosage, quantity, AB mix with EC/pH, weather, photos. **No money (RM)**: costs and prices live in the separate accounts dashboard.
6. **Crop timeline.** Each planting batch shows sowing → transplant → flowering → harvest, with expected dates from the farmer's own day counts.
3. **Problem library.** Each problem keeps its photos, symptoms, actions, follow-ups and outcome, so the history can be reused.
4. **"Have we seen this before?"** The bot finds similar past problems from a photo or a description and replies with what worked.
5. **Simple dashboard** with a timeline, a problem library and search, installable on phone as an app (PWA).

### Out of scope for v1 (designed for, not built)

- Blocks / plots (the schema already has a nullable `plot_id`)
- Reminders ("7 days since last tank mix")
- Harvest kg and prices (already in the separate accounts dashboard)
- Logging individual drip runs (the timer waters automatically)
- Multiple farms or many users
- Native Android APK (the PWA covers this; it can be wrapped later if needed)

---

## 2. Users

| User | Uses | Device |
|---|---|---|
| Farmer (Dad) | Telegram bot (main), dashboard (to look back) | Phone, laptop |
| Admin (Sanjay) | Dashboard, setup and maintenance | Laptop |

Only Telegram user IDs on a whitelist can use the bot. Anyone else is ignored.

---

## 3. Architecture

```
┌──────────────┐   message / photo / voice    ┌───────────────────────────────┐
│ Dad on       │ ───────────────────────────► │ Telegram servers              │
│ Telegram     │ ◄─────────────────────────── │                               │
└──────────────┘     confirmations, replies   └──────────────┬────────────────┘
                                                             │ webhook (HTTPS POST)
                                                             ▼
                                   ┌───────────────────────────────────────────┐
                                   │ Next.js app on Vercel                     │
                                   │                                           │
                                   │  /api/telegram  ── bot logic              │
                                   │       │                                   │
                                   │       ├──► Claude API (parse text/photos) │
                                   │       │                                   │
                                   │  /(dashboard)   ── PWA pages              │
                                   └───────┬───────────────────────────────────┘
                                           │
                                           ▼
                                   ┌───────────────────────────────┐
                                   │ Supabase                      │
                                   │  • Postgres (all records)     │
                                   │  • Storage (photos)           │
                                   │  • Auth (dashboard login)     │
                                   └───────────────────────────────┘
```

A single Next.js project contains both the bot webhook and the dashboard.

---

## 4. Tech stack

| Part | Choice | Why | Cost |
|---|---|---|---|
| Bot | Telegram Bot API via **grammY** (TypeScript) | Free, dad already uses Telegram, supports inline buttons | Free |
| App + API | **Next.js** (App Router, TypeScript) | One codebase for webhook and dashboard | — |
| Hosting | **Vercel** | Free tier, HTTPS for the webhook | Free |
| Database | **Supabase Postgres** | Relational data, full-text search | Free tier |
| Photos | **Supabase Storage** | Same platform, signed URLs | Free tier (1 GB) |
| Dashboard login | **Supabase Auth** (email magic link) | No passwords for dad to remember | Free |
| AI | **Claude API — `claude-haiku-5-5`** | Reads mixed English/Malay, understands photos, cheap | ~RM 5–15 / month |
| Voice notes (optional) | Speech-to-text API (decide at Phase 4) | If dad prefers talking to typing | Small |
| UI | Tailwind CSS v4 + lucide-react icons | Fast to build, mobile-friendly | Free |
| PWA | `manifest.json` + service worker | Installable icon, full screen | Free |

---

## 5. Telegram bot

### 5.1 Main menu (persistent keyboard)

```
[ 🧪 Spray ]  [ 🪣 Tank mix (AB) ]
[ 🌱 Other baja ]  [ ⚠️ Problem ]
[ 🌶️ Batch ]  [ 🔍 Cari (search) ]  [ 📋 Recent ]
```

### 5.2 Two ways to log

**A. Buttons (guided).** The bot asks one question at a time and offers quick-pick buttons, using recent products, common dosages and "Skip".

**B. Free text.** Dad types naturally, and Claude extracts a structured entry.

```
Dad:  pagi tadi sembur racun Movento 20ml satu tong, 4 tong, sebab ada thrips
Bot:  🧪 SPRAY — semak dulu: (check first)
      📅 24 Okt, pagi
      💊 Movento (insecticide)
      📏 20ml / tong × 4 tong = 80ml
      🎯 Sebab: thrips
      🌶️ Batch: Okt 2026 (day 45)
      [ ✅ Betul, simpan ]  [ ✏️ Edit ]  [ ❌ Batal ]
```

**Every entry is confirmed before saving.** Nothing reaches the database until dad taps ✅. Fields the AI couldn't fill are shown as `?` so he can add them or skip.

### 5.3 Photos

- A photo sent on its own makes the bot ask: *"Gambar ni untuk apa?"* ("What is this photo for?") `[⚠️ Masalah baru (new problem)] [📎 Tambah ke entry terakhir (add to last entry)] [🔍 Cari masalah sama (find a similar problem)]`
- A photo with a caption is parsed the same way as free text, with the photo attached.
- Several photos sent together (a Telegram album) are grouped into one entry.

### 5.4 Problem flow

1. **New problem.** Photo(s) and a description. Claude suggests the symptoms, a likely cause and tags.
2. **Similar past cases check.** Before saving, the bot shows up to 3 similar past problems:
   ```
   🔁 Pernah jadi sebelum ni: (this happened before)
   1. 12 Mac 2026 — Daun kerinting (thrips)
      Buat: Movento 20ml/tong, 2 kali, 7 hari jarak
      Hasil: ✅ Selesai lepas 10 hari
      [ Lihat (view) ]
   ```
3. **Actions.** Sprays, tank mixes or baja logged while a problem is open can be linked to it, either automatically ("Ini untuk masalah thrips?" — "Is this for the thrips problem?") or by hand.
4. **Follow-ups.** Dad replies to the problem message with a new photo or note, e.g. *"lepas 5 hari dah kurang"* ("less after 5 days"), and it is added to that problem's timeline.
5. **Close.** `/tutup` (close) or a button sets the outcome: ✅ Selesai (solved) / ⚠️ Separuh (partly) / ❌ Tak jadi (didn't work), plus what he learned.

### 5.5 Search ("have we seen this before?")

- `🔍 Cari` + text: *"buah reput"* ("rotting fruit")
- `🔍 Cari` + photo: Claude describes the photo, then the description is searched
- Results show date, problem, what was done, the outcome and a dashboard link

### 5.6 Commands

| Command | Action |
|---|---|
| `/start` | Register (if whitelisted), show menu |
| `/recent` | Last 10 entries |
| `/open` | Open (unresolved) problems |
| `/cari <text>` | Search past problems and logs |
| `/undo` | Delete the last entry (with confirmation) |
| `/dashboard` | Link to the dashboard |

---

## 6. What gets recorded

How the farm works: chili grows in **polybags on drip**. **AB fertilizer** is mixed into a **big tank** and the timer drips it automatically (water and fertilizer together), so individual drip runs are **not** logged. Only **pesticides are sprayed**. **No money (RM)** anywhere: costs, prices and harvest kg live in the separate accounts dashboard.

### 🌶️ Planting batch (Musim tanam)
The farmer keys in everything. One or several batches can be active at once.
- Batch name (e.g. "Batch Okt 2026")
- Variety (picked from his own saved list, or typed new)
- Seeds sown date (*tabur benih / semai*) + number of seeds (optional)
- Transplanted to polybag date (*pindah ke polibeg*) + number of polybags (optional)
- Actual milestones, tapped when they happen: first flowers, first harvest, end of crop
- Notes, photos
- **Expected dates:** if the variety has the farmer's own day counts (see below), the app shows expected flowering / first harvest / end dates next to the actual ones. If no day counts, only actual dates are shown.
- **Plant stage is automatic** (nursery → vegetative → flowering → harvesting → ended), from the batch dates and milestones.

### 🌱 Variety (saved list, keyed in by the farmer)
- Name (e.g. "Kulai 461")
- Optional day counts from his experience: sow → transplant, transplant → flowering, transplant → first harvest, harvest season length
- Notes

### 🧪 Pesticide / spray
- Date and time (default: now; "pagi tadi" / "semalam" (this morning / yesterday) are understood)
- Product (from the product list or new): type, active ingredient
- Dosage per tank + tank size (e.g. 20 ml per 16 L), number of tanks, total used
- Target pest / disease / reason
- Weather (sunny / cloudy / hot / windy / rain after spray)
- Pre-harvest interval (*tempoh selamat*) from the product → earliest safe harvest date
- Batch (auto when only one batch is active; asked when several are)
- Linked problem (optional)
- Photos, notes

### 🪣 Tank mix (AB) — replaces Baja + Water
One entry each time a **new big tank** is mixed. EC and pH are measured only at mixing time.
- Date and time
- A amount + B amount (with unit, e.g. 2 L each)
- Water volume in the tank (L)
- **EC** (mS/cm) and **pH** readings
- Extra fertilizer added to the tank (optional, one or more lines: product + amount, e.g. Calcium Nitrate 2 kg)
- Batch(es) it feeds
- Linked problem (optional)
- Photos, notes

### 🌱 Other baja
For fertilizer **not** given through the drip tank (foliar spray, tabur manure, etc.). Products are keyed in by the farmer.
- Date and time
- Product + quantity + unit
- Method: foliar spray / tabur (spread) / siram (poured) / other
- Batch, linked problem (optional)
- Photos, notes

### ⚠️ Problem
- Date found, batch
- Title (short, e.g. "Daun kerinting" (curled leaves))
- Symptoms (free text + tags)
- Affected part: leaf / stem / root / flower / fruit / whole plant
- Severity: low / medium / high
- Suspected cause (pest / disease / nutrient / water / weather / unknown)
- Photos
- **Actions:** links to spray / tank mix / other baja entries + free-text actions ("buang daun sakit" — removed the sick leaves)
- **Follow-ups:** dated notes + photos
- **Outcome:** solved / partly / not solved, date resolved, lesson learned
- Status: open / resolved

### 📦 Product (keyed in by the farmer, no prices)
- Name, category (pesticide / fertilizer), type, active ingredient or NPK, unit
- Waiting period before harvest (*tempoh selamat*, pesticides)
- Notes

---

## 7. Data model (Supabase / Postgres)

```sql
-- People allowed to use the bot / dashboard
create table users (
  id            uuid primary key default gen_random_uuid(),
  telegram_id   bigint unique,
  name          text not null,
  role          text not null default 'farmer',   -- farmer | admin
  created_at    timestamptz default now()
);

-- Reusable product list (pesticides + fertilizers), keyed in by the farmer. No prices.
create table products (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null unique,
  category           text not null,        -- pesticide | fertilizer
  subtype            text,                 -- insecticide, fungicide, AB, foliar, granular...
  active_ingredient  text,
  npk                text,                 -- '15-15-15'
  unit               text,                 -- ml, L, g, kg, karung
  phi_days           int,                  -- pre-harvest interval (pesticides)
  notes              text,
  created_at         timestamptz default now()
);

-- Chili varieties with the farmer's own day counts (all optional)
create table varieties (
  id                          uuid primary key default gen_random_uuid(),
  name                        text not null unique,
  days_sow_to_transplant      int,
  days_transplant_to_flower   int,
  days_transplant_to_harvest  int,
  harvest_season_days         int,
  notes                       text
);

-- Planting batches (musim tanam); several can be active at once
create table batches (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  variety_id         uuid references varieties(id),
  sown_on            date,
  seeds_count        int,
  transplanted_on    date,
  polybags_count     int,
  first_flower_on    date,                 -- actual milestones, tapped when they happen
  first_harvest_on   date,
  ended_on           date,                 -- null = still active
  notes              text,
  created_at         timestamptz default now()
);

-- Future: blocks / plots
create table plots (
  id    uuid primary key default gen_random_uuid(),
  name  text not null
);

-- One row per logged activity (spray / tank mix / other baja)
create table activities (
  id            uuid primary key default gen_random_uuid(),
  type          text not null,             -- spray | tank_mix | fertilizer
  occurred_at   timestamptz not null,
  plot_id       uuid references plots(id), -- nullable until plots are used
  problem_id    uuid references problems(id),
  notes         text,
  raw_message   text,                      -- original Telegram text (for audit)
  created_by    uuid references users(id),
  created_at    timestamptz default now()
);

create table spray_details (
  activity_id     uuid primary key references activities(id) on delete cascade,
  product_id      uuid references products(id),
  dose_per_tank   numeric,
  dose_unit       text,
  tank_size_l     numeric,
  tanks           numeric,
  total_qty       numeric,
  target          text,                    -- pest / disease / reason
  weather         text,
  safe_harvest_on date                     -- occurred_at + phi_days
);

-- AB tank mix: one row per new big tank
create table tank_mix_details (
  activity_id   uuid primary key references activities(id) on delete cascade,
  a_amount      numeric,
  b_amount      numeric,
  ab_unit       text,                      -- L | ml | kg
  water_l       numeric,
  ec            numeric,                   -- mS/cm
  ph            numeric
);

-- Extra fertilizers added into a tank mix (0..n per tank)
create table tank_mix_additives (
  id            uuid primary key default gen_random_uuid(),
  activity_id   uuid not null references activities(id) on delete cascade,
  product_id    uuid references products(id),
  quantity      numeric,
  unit          text
);

-- Other baja (not through the drip tank)
create table fertilizer_details (
  activity_id  uuid primary key references activities(id) on delete cascade,
  product_id   uuid references products(id),
  quantity     numeric,
  unit         text,
  method       text                        -- foliar | tabur | siram | other
);

-- Which batch(es) an activity was for (a tank mix can feed several)
create table activity_batches (
  activity_id  uuid references activities(id) on delete cascade,
  batch_id     uuid references batches(id) on delete cascade,
  primary key (activity_id, batch_id)
);

create table problems (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  symptoms        text,
  affected_part   text,
  severity        text,
  suspected_cause text,
  tags            text[] default '{}',
  status          text not null default 'open',   -- open | resolved
  outcome         text,                           -- solved | partly | not_solved
  lesson          text,
  found_on        date not null,
  resolved_on     date,
  batch_id        uuid references batches(id),
  plot_id         uuid references plots(id),
  created_by      uuid references users(id),
  created_at      timestamptz default now(),
  search_tsv      tsvector generated always as (
                    to_tsvector('simple',
                      coalesce(title,'') || ' ' || coalesce(symptoms,'') || ' ' ||
                      coalesce(suspected_cause,'') || ' ' || coalesce(lesson,'') || ' ' ||
                      array_to_string(tags, ' '))
                  ) stored
);
create index problems_search_idx on problems using gin (search_tsv);

-- Free-text actions and dated follow-ups on a problem
create table problem_updates (
  id           uuid primary key default gen_random_uuid(),
  problem_id   uuid not null references problems(id) on delete cascade,
  kind         text not null,             -- action | followup
  body         text,
  occurred_at  timestamptz not null default now(),
  created_by   uuid references users(id)
);

-- Photos attach to exactly one of: activity, problem, problem update
create table photos (
  id                 uuid primary key default gen_random_uuid(),
  storage_path       text not null,
  telegram_file_id   text,
  caption            text,
  ai_description     text,                -- Claude's description, used for search
  activity_id        uuid references activities(id) on delete cascade,
  problem_id         uuid references problems(id) on delete cascade,
  problem_update_id  uuid references problem_updates(id) on delete cascade,
  taken_at           timestamptz default now()
);

-- Entries waiting for ✅ confirmation in Telegram
create table drafts (
  id           uuid primary key default gen_random_uuid(),
  telegram_id  bigint not null,
  payload      jsonb not null,             -- parsed entry
  photo_ids    text[] default '{}',
  expires_at   timestamptz not null,
  created_at   timestamptz default now()
);
```

> Table order: `varieties` → `batches` → `problems` → `activities` (foreign keys). The migration files will handle the ordering.

**Row Level Security** is on for every table. The bot uses the service-role key on the server only. The dashboard reads with the logged-in user's session.

---

## 8. AI (Claude) usage

| Task | Input | Output |
|---|---|---|
| Parse a log message | Mixed English/Malay text (+ caption) | JSON: `{type, occurred_at, product, dose, qty, unit, target, ...}` with `null` for unknowns |
| Describe a problem photo | Image(s) + optional text | Symptoms, affected part, possible causes, suggested tags |
| Find similar problems | New problem description + candidate list from Postgres | Ranked top 3 with short reasons |
| Understand relative dates | "semalam", "pagi tadi", "2 hari lepas" (yesterday, this morning, 2 days ago) | Absolute timestamp (Asia/Kuala_Lumpur) |

Rules:
- Use **structured output** (tool / JSON schema) so the result can always be parsed.
- Send the product catalog as context so "movento" matches the existing product.
- **The AI never saves directly.** The farmer must confirm first.
- The AI may suggest possible causes, but the bot labels them *"cadangan AI"* (AI suggestion), never a diagnosis.
- Fallback: if the Claude call fails, the bot switches to the button flow.

### Similar-problem search (v1)
1. Postgres full-text search on `problems.search_tsv` + `photos.ai_description` → top ~15 candidates
2. Claude re-ranks those candidates against the new problem → top 3
3. Later, if needed: add vector embeddings (pgvector)

---

## 9. Dashboard (PWA)

Mobile-first, readable on a laptop. Large text and buttons. Labels in English with Malay where helpful.

| Page | Contents |
|---|---|
| **Home** | Harvest-safety banner, active batch card(s) ("Batch Okt · Day 45 · Berbunga · first harvest in ~34 days"), last spray, last tank mix with EC/pH, open problems, this month (number of sprays, tank mixes, AB litres used) |
| **Batches** | All batches. Detail: timeline sow → transplant → flower → first harvest → end (expected vs actual), everything done during the batch, problems during the batch |
| **Timeline** | All entries newest first, filter by type / batch / product / date, photo thumbnails |
| **Calendar** | Month view, dots per entry type + batch milestones and expected dates |
| **Problems** | Card grid of problems with photos. Filter open/resolved, search. Detail page: photos, symptoms, action timeline, follow-ups, outcome, lesson |
| **Products** | Product list (no prices): type, waiting period, usage history |
| **Varieties** | Saved varieties with the farmer's day counts |
| **Reports** | EC/pH trend (with problem dates marked), AB + fertilizer used per month (L/kg), pesticide rotation warning (same active ingredient too often in a row), problems summary, batch comparison (days to first harvest, problems per batch) |
| **Entry detail / edit** | Fix mistakes from the dashboard |

PWA:
- `manifest.json` (name, chili icon, theme colour, `display: standalone`)
- Service worker: caches the app shell so it opens fast. The data is online-only in v1
- "Install app" hint on first visit from a phone

---

## 10. Security

- Bot ignores any Telegram user not in `users`
- Webhook is protected with Telegram's `secret_token` header
- Dashboard requires login (Supabase magic link) for whitelisted emails only
- Photos live in a private bucket and are served via short-lived signed URLs
- Secrets only in Vercel environment variables, never in the repo

### Environment variables

```
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
APP_TIMEZONE=Asia/Kuala_Lumpur
```

---

## 11. Project structure (planned)

```
/app
  /api/telegram/route.ts      # webhook entry
  /(dashboard)/...            # pages
  /login
/lib
  /bot                        # grammY bot, handlers, keyboards, conversations
  /ai                         # Claude prompts + schemas
  /db                         # Supabase client, queries
  /storage                    # photo upload / signed URLs
/supabase/migrations          # SQL schema
/public/manifest.json, icons
PROJECT.md
```

---

## 12. Build phases

Dashboard first (dad is away), then bot, then AI. The bot can be tested with the admin's own Telegram ID before dad is back.

| Phase | Deliverable | Done when |
|---|---|---|
| **1. Dashboard (local data) ✅** | All pages, add/edit/delete entries, problems (updates, close, reopen), products, photo upload (shrunk in browser), CSV export, PWA install. Saved to `data/farm.json` + `data/uploads/` | Every page and form works on phone + laptop |
| **1b. Match how the farm works ✅** | Planting batches + varieties (expected vs actual timeline, automatic plant stage), AB tank mix entry (A/B, water, EC, pH, extra fertilizers), Other baja entry, remove Baja + Water types, remove all RM (costs, prices, spending charts), new Home cards and Reports (EC/pH trend, usage in L/kg, pesticide rotation, batch comparison), entries linked to batches | Dad's real workflow can be logged end to end |
| **2. Dashboard + Supabase** | Supabase project, schema migration, swap `src/lib/store.ts` + `src/lib/data.ts` for Supabase queries, photos to Supabase Storage, login + session check in every server action | Dashboard reads/writes the real database |
| **3. Deploy** | Vercel deploy, env vars, PWA install tested on a phone | Dashboard is live on a URL |
| **4. Bot: button logging** | Telegram bot, webhook, whitelist, Spray / Tank mix / Other baja / Problem / Batch milestones via buttons, photos, confirm + save, `/recent`, `/undo` | Admin can log every type from Telegram and see it on the dashboard |
| **5. AI free text + photos** | Claude parsing of mixed English/Malay, relative dates, product matching, photo descriptions | A typed sentence becomes a correct confirmed entry |
| **6. "Seen before?" search** | Similar-problem lookup in bot + dashboard search | Bot surfaces a past case from a new photo or description |
| **7. Hand-over** | Dad's Telegram ID whitelisted, dashboard installed on his phone, demo data cleared | Dad logs his first real entry |
| **Later** | Plots/blocks, reminders, weather auto-fill, voice notes, PDF export | — |

---

## 13. Estimated running cost (one farm)

| Item | Monthly |
|---|---|
| Vercel, Supabase, Telegram | RM 0 (free tiers) |
| Claude API (Haiku, ~10–20 messages/day + photos) | ~RM 5–15 |
| **Total** | **~RM 5–15** |

Watch: Supabase free storage is 1 GB. Compressing photos to ~300 KB gives room for about 3,000 photos before an upgrade is needed.

---

## 14. Open questions

- [ ] Voice notes: needed in v1 or later?
- [ ] Dashboard login: email magic link OK for dad, or use a "Login with Telegram" button?
- [ ] Initial product list: dad keys in his current pesticides, AB brand and other fertilizers (name, type, waiting period)
- [ ] Initial batch + variety: dad keys in the current batch's sowing and transplant dates
- [ ] Bot reply language: mostly Malay, mostly English or mixed?
- [ ] Should old records (notebook, WhatsApp photos) be imported?
