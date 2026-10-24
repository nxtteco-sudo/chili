import "server-only";
import { connection } from "next/server";
import { batchInfo, isActiveBatch } from "./batches";
import { addDays, dayKey, diffDays, monthKey } from "./dates";
import { readStore } from "./store";
import type { Activity, ActivityType, Batch, FarmData, Problem, Product } from "./types";

// Every page reads through these functions. Phase 2 swaps the bodies for
// Supabase queries; the signatures stay the same.

async function farm(): Promise<FarmData> {
  await connection();
  const store = await readStore();
  return {
    today: dayKey(new Date()),
    products: store.products,
    varieties: store.varieties,
    batches: store.batches,
    activities: store.activities,
    problems: store.problems,
  };
}

export async function getToday() {
  return (await farm()).today;
}

export async function getStoreInfo() {
  await connection();
  const store = await readStore();
  return { seededOn: store.seededOn };
}

export async function getProducts(): Promise<Product[]> {
  return (await farm()).products;
}

export async function getProduct(id: string) {
  return (await farm()).products.find((p) => p.id === id);
}

export function productIdsOf(a: Activity): string[] {
  if (a.type === "spray") return [a.spray.productId];
  if (a.type === "fertilizer") return [a.fertilizer.productId];
  return a.tankMix.additives.map((x) => x.productId);
}

// ── Varieties & batches ───────────────────────────────────────────────────

export async function getVarieties() {
  return (await farm()).varieties;
}

export async function getVariety(id: string) {
  return (await farm()).varieties.find((v) => v.id === id);
}

export type BatchView = {
  batch: Batch;
  variety?: FarmData["varieties"][number];
  info: ReturnType<typeof batchInfo>;
  active: boolean;
};

function view(data: FarmData, batch: Batch): BatchView {
  const variety = data.varieties.find((v) => v.id === batch.varietyId);
  return { batch, variety, info: batchInfo(batch, variety, data.today), active: isActiveBatch(batch, data.today) };
}

export async function getBatches(): Promise<BatchView[]> {
  const data = await farm();
  return data.batches.map((b) => view(data, b));
}

export async function getActiveBatches(): Promise<BatchView[]> {
  return (await getBatches()).filter((b) => b.active);
}

export async function getBatch(id: string): Promise<BatchView | undefined> {
  const data = await farm();
  const batch = data.batches.find((b) => b.id === id);
  return batch && view(data, batch);
}

// ── Activities ────────────────────────────────────────────────────────────

export type ActivityFilter = {
  type?: ActivityType;
  q?: string;
  sinceDays?: number;
  day?: string;
  month?: string;
  productId?: string;
  problemId?: string;
  batchId?: string;
};

export async function getActivities(filter: ActivityFilter = {}) {
  const { activities, products, today } = await farm();
  const q = filter.q?.trim().toLowerCase();
  const since = filter.sinceDays !== undefined ? addDays(today, -filter.sinceDays) : undefined;

  return activities.filter((a) => {
    if (filter.type && a.type !== filter.type) return false;
    const key = dayKey(a.occurredAt);
    if (since && key < since) return false;
    if (filter.day && key !== filter.day) return false;
    if (filter.month && monthKey(key) !== filter.month) return false;
    if (filter.productId && !productIdsOf(a).includes(filter.productId)) return false;
    if (filter.problemId && a.problemId !== filter.problemId) return false;
    if (filter.batchId && !a.batchIds.includes(filter.batchId)) return false;
    if (q) {
      const names = productIdsOf(a).flatMap((id) => {
        const p = products.find((x) => x.id === id);
        return [p?.name, p?.activeIngredient];
      });
      const hay = [...names, a.notes, a.rawMessage, a.type === "spray" ? a.spray.target : undefined]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export async function getActivity(id: string) {
  return (await farm()).activities.find((a) => a.id === id);
}

export async function getLastByType() {
  const { activities } = await farm();
  const last = (type: ActivityType) => activities.find((a) => a.type === type);
  return { spray: last("spray"), tank_mix: last("tank_mix"), fertilizer: last("fertilizer") };
}

// The latest pre-harvest interval still running, if any.
export async function getHarvestSafety() {
  const { activities, today } = await farm();
  let blocking: Extract<Activity, { type: "spray" }> | undefined;
  for (const a of activities) {
    if (a.type !== "spray") continue;
    if (diffDays(today, dayKey(a.occurredAt)) > 30) break;
    if (a.spray.safeHarvestOn > today && (!blocking || a.spray.safeHarvestOn > blocking.spray.safeHarvestOn))
      blocking = a;
  }
  return { today, blocking };
}

// ── Problems ──────────────────────────────────────────────────────────────

export async function getProblems(filter: { status?: Problem["status"]; q?: string; batchId?: string } = {}) {
  const { problems } = await farm();
  const terms = filter.q?.trim().toLowerCase().split(/\s+/).filter(Boolean) ?? [];
  return problems.filter((p) => {
    if (filter.status && p.status !== filter.status) return false;
    if (filter.batchId && p.batchId !== filter.batchId) return false;
    if (terms.length) {
      const hay = [p.title, p.symptoms, p.suspectedCause, p.lesson, ...p.tags].join(" ").toLowerCase();
      if (!terms.every((t) => hay.includes(t))) return false;
    }
    return true;
  });
}

export async function getProblem(id: string) {
  return (await farm()).problems.find((p) => p.id === id);
}

// v1 "seen before?": tag overlap + same cause/part. Phase 6 adds AI re-ranking.
export async function getSimilarProblems(problem: Problem, limit = 3) {
  const { problems } = await farm();
  return problems
    .filter((p) => p.id !== problem.id)
    .map((p) => {
      const shared = p.tags.filter((t) => problem.tags.includes(t)).length;
      const score =
        shared * 3 +
        (p.causeKind === problem.causeKind ? 1 : 0) +
        (p.affectedPart === problem.affectedPart ? 1 : 0) +
        (p.suspectedCause === problem.suspectedCause ? 2 : 0);
      return { problem: p, score };
    })
    .filter((x) => x.score >= 3)
    .sort((a, z) => z.score - a.score)
    .slice(0, limit)
    .map((x) => x.problem);
}

// ── Reports ───────────────────────────────────────────────────────────────

export type EcPhPoint = { date: string; ec?: number; ph?: number; activityId: string };

export async function getEcPhSeries(sinceDays?: number): Promise<EcPhPoint[]> {
  const activities = await getActivities({ type: "tank_mix", sinceDays });
  return activities
    .filter((a): a is Extract<Activity, { type: "tank_mix" }> => a.type === "tank_mix")
    .map((a) => ({ date: dayKey(a.occurredAt), ec: a.tankMix.ec, ph: a.tankMix.ph, activityId: a.id }))
    .reverse();
}

// AB used (A + B) per month, grouped by unit, plus entry counts.
export type MonthUsage = { month: string; abByUnit: Record<string, number>; tankMixes: number; sprays: number };

export async function getMonthlyUsage(months: string[]): Promise<MonthUsage[]> {
  const { activities } = await farm();
  return months.map((month) => {
    const inMonth = activities.filter((a) => monthKey(dayKey(a.occurredAt)) === month);
    const abByUnit: Record<string, number> = {};
    for (const a of inMonth)
      if (a.type === "tank_mix") {
        const u = a.tankMix.abUnit;
        abByUnit[u] = (abByUnit[u] ?? 0) + a.tankMix.aAmount + a.tankMix.bAmount;
      }
    return {
      month,
      abByUnit,
      tankMixes: inMonth.filter((a) => a.type === "tank_mix").length,
      sprays: inMonth.filter((a) => a.type === "spray").length,
    };
  });
}

// Resistance check: the same active ingredient in 3 of the last 5 sprays.
export async function getSprayRotation() {
  const { activities, products } = await farm();
  const recent = activities
    .filter((a): a is Extract<Activity, { type: "spray" }> => a.type === "spray")
    .slice(0, 8)
    .map((a) => {
      const p = products.find((x) => x.id === a.spray.productId);
      return { activity: a, product: p, ingredient: p?.activeIngredient || p?.name || "Unknown" };
    });
  const counts = new Map<string, number>();
  for (const r of recent.slice(0, 5)) counts.set(r.ingredient, (counts.get(r.ingredient) ?? 0) + 1);
  const warnings = [...counts].filter(([, n]) => n >= 3).map(([ingredient, n]) => ({ ingredient, n }));
  return { recent, warnings };
}

export type ProductUsage = {
  product: Product;
  uses: number;
  totalQty: number;
  lastUsed?: string;
};

export async function getProductUsage(): Promise<ProductUsage[]> {
  const { activities, products } = await farm();
  return products.map((product) => {
    let uses = 0;
    let totalQty = 0;
    let lastUsed: string | undefined;
    for (const a of activities) {
      const qty =
        a.type === "spray" && a.spray.productId === product.id
          ? a.spray.totalQty
          : a.type === "fertilizer" && a.fertilizer.productId === product.id
            ? a.fertilizer.quantity
            : a.type === "tank_mix"
              ? a.tankMix.additives.filter((x) => x.productId === product.id).reduce((s, x) => s + x.quantity, 0) || undefined
              : undefined;
      if (qty === undefined) continue;
      uses++;
      totalQty += qty;
      lastUsed ??= dayKey(a.occurredAt);
    }
    return { product, uses, totalQty, lastUsed };
  });
}
