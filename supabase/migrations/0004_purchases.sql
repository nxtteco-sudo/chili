-- Kebun Cili: purchase log, so the app can show stock left (bought minus used).
-- Run in Supabase → SQL Editor. Safe to re-run.
-- Quantity only, no money. `quantity` is stored in the product's own unit
-- (g, ml or kg), converted from what the farmer typed (e.g. 1 L -> 1000 ml).

create table if not exists public.purchases (
  id          text primary key default gen_random_uuid()::text,
  product_id  text not null references public.products (id) on delete cascade,
  quantity    numeric not null check (quantity > 0),
  unit        text not null,
  occurred_at timestamptz not null,
  group_id    text,             -- purchases from one Telegram message share this, so "Padam" removes them together
  raw_message text,
  created_at  timestamptz not null default now()
);
create index if not exists purchases_product_idx on public.purchases (product_id);
create index if not exists purchases_group_idx on public.purchases (group_id);

alter table public.purchases enable row level security;

drop policy if exists "farm members" on public.purchases;
create policy "farm members" on public.purchases
  for all to authenticated
  using ((select public.is_farm_member()))
  with check ((select public.is_farm_member()));

grant select, insert, update, delete on public.purchases to authenticated, service_role;
