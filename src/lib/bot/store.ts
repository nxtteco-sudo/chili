import "server-only";
import type { StorageAdapter } from "grammy";
import { fromActivity, fromProduct, fromPurchase, toActivity, toBatch, toProduct, toPurchase } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/server";
import type { Activity, Batch, Product, Purchase } from "@/lib/types";

// Everything the bot reads and writes. The bot has no login session, so it
// uses the service role key (bypasses Row Level Security) and decides who may
// talk to it from the telegram_users table instead.

export type TelegramUser = { telegramId: number; name: string; role: "farmer" | "admin" };

export async function getTelegramUser(telegramId: number): Promise<TelegramUser | undefined> {
  const { data, error } = await createAdminClient()
    .from("telegram_users")
    .select("*")
    .eq("telegram_id", telegramId)
    .maybeSingle();
  if (error) throw new Error(`Looking up Telegram user: ${error.message}`);
  return data ? { telegramId, name: data.name, role: data.role } : undefined;
}

// grammY keeps each person's place in a guided flow here between webhook calls.
export const sessionStorage: StorageAdapter<unknown> = {
  async read(key) {
    const { data } = await createAdminClient().from("bot_sessions").select("state").eq("telegram_id", key).maybeSingle();
    return data?.state;
  },
  async write(key, value) {
    const { error } = await createAdminClient()
      .from("bot_sessions")
      .upsert({ telegram_id: key, state: value, updated_at: new Date().toISOString() });
    if (error) throw new Error(`Saving bot session: ${error.message}`);
  },
  async delete(key) {
    await createAdminClient().from("bot_sessions").delete().eq("telegram_id", key);
  },
};

export type Catalog = { products: Product[]; batches: Batch[]; activities: Activity[] };

// The farm is small, so one load per message is fine. Activities (newest first)
// are only used for quick-pick suggestions and /recent.
export async function loadCatalog(): Promise<Catalog> {
  const sb = createAdminClient();
  const [products, batches, activities] = await Promise.all([
    sb.from("products").select("*").order("name"),
    sb.from("batches").select("*"),
    sb.from("activities").select("*").order("occurred_at", { ascending: false }).limit(200),
  ]);
  for (const r of [products, batches, activities]) if (r.error) throw new Error(`Loading farm data: ${r.error.message}`);
  return {
    products: products.data!.map(toProduct),
    batches: batches.data!.map(toBatch),
    activities: activities.data!.map(toActivity),
  };
}

export async function saveProduct(p: Product) {
  const { error } = await createAdminClient().from("products").upsert(fromProduct(p));
  if (error) throw new Error(`Saving product: ${error.message}`);
}

export async function saveActivity(a: Activity) {
  const { error } = await createAdminClient().from("activities").upsert(fromActivity(a));
  if (error) throw new Error(`Saving entry: ${error.message}`);
}

// The most recently *saved* entry, which is what /undo removes.
export async function lastSavedActivity(): Promise<Activity | undefined> {
  const { data, error } = await createAdminClient()
    .from("activities")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(`Loading last entry: ${error.message}`);
  return data[0] ? toActivity(data[0]) : undefined;
}

export async function deleteActivity(id: string) {
  const { error } = await createAdminClient().from("activities").delete().eq("id", id);
  if (error) throw new Error(`Deleting entry: ${error.message}`);
}

export async function savePurchases(purchases: Purchase[]) {
  if (purchases.length === 0) return;
  const { error } = await createAdminClient().from("purchases").insert(purchases.map(fromPurchase));
  if (error) throw new Error(`Saving purchases (has migration 0004 been run?): ${error.message}`);
}

export async function deletePurchaseGroup(groupId: string) {
  const { error } = await createAdminClient().from("purchases").delete().eq("group_id", groupId);
  if (error) throw new Error(`Deleting purchases: ${error.message}`);
}

// Stock needs every purchase and every use, not just the recent ones.
export async function loadStockData(): Promise<{ products: Product[]; purchases: Purchase[]; activities: Activity[] }> {
  const sb = createAdminClient();
  const [products, purchases, activities] = await Promise.all([
    sb.from("products").select("*").order("name"),
    sb.from("purchases").select("*"),
    sb.from("activities").select("*").range(0, 4999),
  ]);
  for (const r of [products, purchases, activities]) if (r.error) throw new Error(`Loading stock: ${r.error.message}`);
  return { products: products.data!.map(toProduct), purchases: purchases.data!.map(toPurchase), activities: activities.data!.map(toActivity) };
}
