import "server-only";
import { connection } from "next/server";
import { addDays, dayKey, diffDays, monthKey } from "./dates";
import { readStore } from "./store";
import type {
  Activity,
  ActivityType,
  FarmData,
  Problem,
  Product,
} from "./types";

// Every page reads through these functions. Phase 2 swaps the bodies for
// Supabase queries; the signatures stay the same.

async function farm(): Promise<FarmData> {
  await connection();
  const store = await readStore();
  return {
    today: dayKey(new Date()),
    products: store.products,
    activities: store.activities,
    problems: store.problems,
  };
}

export async function getToday() {
  return (await farm()).today;
}

export async function getProducts(): Promise<Product[]> {
  return (await farm()).products;
}

export async function getProduct(id: string) {
  return (await farm()).products.find((p) => p.id === id);
}

export async function getStoreInfo() {
  await connection();
  const store = await readStore();
  return { seededOn: store.seededOn };
}

export function productIdOf(a: Activity): string | undefined {
  if (a.type === "spray") return a.spray.productId;
  if (a.type === "fertilizer") return a.fertilizer.productId;
  return undefined;
}

export function costOf(a: Activity): number {
  if (a.type === "spray") return a.spray.costRm;
  if (a.type === "fertilizer") return a.fertilizer.costRm;
  return 0;
}

export type ActivityFilter = {
  type?: ActivityType;
  q?: string;
  sinceDays?: number;
  day?: string;
  month?: string;
  productId?: string;
  problemId?: string;
};

export async function getActivities(filter: ActivityFilter = {}) {
  const { activities, products, today } = await farm();
  const q = filter.q?.trim().toLowerCase();
  const since =
    filter.sinceDays !== undefined ? addDays(today, -filter.sinceDays) : undefined;

  return activities.filter((a) => {
    if (filter.type && a.type !== filter.type) return false;
    const key = dayKey(a.occurredAt);
    if (since && key < since) return false;
    if (filter.day && key !== filter.day) return false;
    if (filter.month && monthKey(key) !== filter.month) return false;
    if (filter.productId && productIdOf(a) !== filter.productId) return false;
    if (filter.problemId && a.problemId !== filter.problemId) return false;
    if (q) {
      const p = products.find((x) => x.id === productIdOf(a));
      const hay = [
        p?.name,
        p?.activeIngredient,
        a.notes,
        a.rawMessage,
        a.type === "spray" ? a.spray.target : undefined,
      ]
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

export async function getProblems(filter: { status?: Problem["status"]; q?: string } = {}) {
  const { problems } = await farm();
  const terms = filter.q?.trim().toLowerCase().split(/\s+/).filter(Boolean) ?? [];
  return problems.filter((p) => {
    if (filter.status && p.status !== filter.status) return false;
    if (terms.length) {
      const hay = [p.title, p.symptoms, p.suspectedCause, p.lesson, ...p.tags]
        .join(" ")
        .toLowerCase();
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

export async function getLastByType() {
  const { activities } = await farm();
  const last = (type: ActivityType) => activities.find((a) => a.type === type);
  return { spray: last("spray"), fertilizer: last("fertilizer"), water: last("water") };
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

export type MonthSpend = { month: string; pesticide: number; fertilizer: number };

export async function getMonthlySpend(months: string[]): Promise<MonthSpend[]> {
  const { activities } = await farm();
  return months.map((month) => {
    let pesticide = 0;
    let fertilizer = 0;
    for (const a of activities) {
      if (monthKey(dayKey(a.occurredAt)) !== month) continue;
      if (a.type === "spray") pesticide += a.spray.costRm;
      if (a.type === "fertilizer") fertilizer += a.fertilizer.costRm;
    }
    return { month, pesticide, fertilizer };
  });
}

export type ProductUsage = {
  product: Product;
  uses: number;
  totalQty: number;
  totalCost: number;
  lastUsed?: string;
};

export async function getProductUsage(): Promise<ProductUsage[]> {
  const { activities, products } = await farm();
  return products.map((product) => {
    const used = activities.filter((a) => productIdOf(a) === product.id);
    return {
      product,
      uses: used.length,
      totalQty: used.reduce(
        (s, a) =>
          s +
          (a.type === "spray" ? a.spray.totalQty : a.type === "fertilizer" ? a.fertilizer.quantity : 0),
        0,
      ),
      totalCost: used.reduce((s, a) => s + costOf(a), 0),
      lastUsed: used[0] ? dayKey(used[0].occurredAt) : undefined,
    };
  });
}
