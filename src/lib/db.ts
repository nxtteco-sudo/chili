import "server-only";
import { randomUUID } from "node:crypto";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dayKey, farmIso } from "./dates";
import { buildDemoData } from "./demo-data";
import { createClient } from "./supabase/server";
import type { Activity, Batch, Photo, Problem, ProblemUpdate, Product, Variety } from "./types";

// Supabase data access (replaces the Phase 1 local JSON store). Reads run as
// the logged-in user, so Row Level Security limits them to farm members.
// The farm is small, so pages load whole tables once per request and filter
// in src/lib/data.ts; writes go row by row.

export type Store = {
  products: Product[];
  varieties: Variety[];
  batches: Batch[];
  activities: Activity[]; // newest first
  problems: Problem[]; // newest first
};

const PHOTO_BUCKET = "photos";
const PAGE = 1000; // PostgREST's default row limit per request

type Row = Record<string, unknown>;
const opt = <T>(v: unknown) => (v === null || v === undefined ? undefined : (v as T));

async function selectAll(sb: SupabaseClient, table: string, order: [string, boolean][]) {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = sb.from(table).select("*").range(from, from + PAGE - 1);
    for (const [col, ascending] of order) q = q.order(col, { ascending });
    const { data, error } = await q;
    if (error) throw new Error(`Loading ${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

function check(error: { message: string } | null, what: string) {
  if (error) throw new Error(`${what}: ${error.message}`);
}

// ── Row ↔ app shape ───────────────────────────────────────────────────────

const toProduct = (r: Row): Product => ({
  id: r.id as string,
  name: r.name as string,
  category: r.category as Product["category"],
  subtype: r.subtype as string,
  activeIngredient: opt(r.active_ingredient),
  npk: opt(r.npk),
  unit: r.unit as string,
  phiDays: opt(r.phi_days),
  notes: opt(r.notes),
});
const fromProduct = (p: Product) => ({
  id: p.id,
  name: p.name,
  category: p.category,
  subtype: p.subtype,
  active_ingredient: p.activeIngredient ?? null,
  npk: p.npk ?? null,
  unit: p.unit,
  phi_days: p.phiDays ?? null,
  notes: p.notes ?? null,
});

const toVariety = (r: Row): Variety => ({
  id: r.id as string,
  name: r.name as string,
  daysSowToTransplant: opt(r.days_sow_to_transplant),
  daysTransplantToFlower: opt(r.days_transplant_to_flower),
  daysTransplantToHarvest: opt(r.days_transplant_to_harvest),
  harvestSeasonDays: opt(r.harvest_season_days),
  notes: opt(r.notes),
});
const fromVariety = (v: Variety) => ({
  id: v.id,
  name: v.name,
  days_sow_to_transplant: v.daysSowToTransplant ?? null,
  days_transplant_to_flower: v.daysTransplantToFlower ?? null,
  days_transplant_to_harvest: v.daysTransplantToHarvest ?? null,
  harvest_season_days: v.harvestSeasonDays ?? null,
  notes: v.notes ?? null,
});

const toBatch = (r: Row): Batch => ({
  id: r.id as string,
  name: r.name as string,
  varietyId: opt(r.variety_id),
  sownOn: opt(r.sown_on),
  seedsCount: opt(r.seeds_count),
  transplantedOn: opt(r.transplanted_on),
  polybagsCount: opt(r.polybags_count),
  firstFlowerOn: opt(r.first_flower_on),
  firstHarvestOn: opt(r.first_harvest_on),
  endedOn: opt(r.ended_on),
  notes: opt(r.notes),
  photos: (r.photos as Photo[]) ?? [],
});
const fromBatch = (b: Batch) => ({
  id: b.id,
  name: b.name,
  variety_id: b.varietyId ?? null,
  sown_on: b.sownOn ?? null,
  seeds_count: b.seedsCount ?? null,
  transplanted_on: b.transplantedOn ?? null,
  polybags_count: b.polybagsCount ?? null,
  first_flower_on: b.firstFlowerOn ?? null,
  first_harvest_on: b.firstHarvestOn ?? null,
  ended_on: b.endedOn ?? null,
  notes: b.notes ?? null,
  photos: b.photos,
});

const toUpdate = (r: Row): ProblemUpdate => ({
  id: r.id as string,
  kind: r.kind as ProblemUpdate["kind"],
  body: r.body as string,
  occurredAt: farmIso(r.occurred_at as string),
  photos: (r.photos as Photo[]) ?? [],
});
const fromUpdate = (problemId: string, u: ProblemUpdate) => ({
  id: u.id,
  problem_id: problemId,
  kind: u.kind,
  body: u.body,
  occurred_at: u.occurredAt,
  photos: u.photos,
});

const toProblem = (r: Row, updates: ProblemUpdate[]): Problem => ({
  id: r.id as string,
  title: r.title as string,
  symptoms: r.symptoms as string,
  affectedPart: r.affected_part as Problem["affectedPart"],
  severity: r.severity as Problem["severity"],
  suspectedCause: r.suspected_cause as string,
  causeKind: r.cause_kind as Problem["causeKind"],
  tags: (r.tags as string[]) ?? [],
  status: r.status as Problem["status"],
  outcome: opt(r.outcome),
  lesson: opt(r.lesson),
  foundOn: r.found_on as string,
  resolvedOn: opt(r.resolved_on),
  batchId: opt(r.batch_id),
  photos: (r.photos as Photo[]) ?? [],
  updates,
});
const fromProblem = (p: Problem) => ({
  id: p.id,
  title: p.title,
  symptoms: p.symptoms,
  affected_part: p.affectedPart,
  severity: p.severity,
  suspected_cause: p.suspectedCause,
  cause_kind: p.causeKind,
  tags: p.tags,
  status: p.status,
  outcome: p.outcome ?? null,
  lesson: p.lesson ?? null,
  found_on: p.foundOn,
  resolved_on: p.resolvedOn ?? null,
  batch_id: p.batchId ?? null,
  photos: p.photos,
});

function toActivity(r: Row): Activity {
  const base = {
    id: r.id as string,
    occurredAt: farmIso(r.occurred_at as string),
    batchIds: (r.batch_ids as string[]) ?? [],
    problemId: opt<string>(r.problem_id),
    notes: opt<string>(r.notes),
    rawMessage: opt<string>(r.raw_message),
    photos: (r.photos as Photo[]) ?? [],
  };
  const details = r.details as never;
  if (r.type === "spray") return { ...base, type: "spray", spray: details };
  if (r.type === "tank_mix") return { ...base, type: "tank_mix", tankMix: details };
  return { ...base, type: "fertilizer", fertilizer: details };
}
const fromActivity = (a: Activity) => ({
  id: a.id,
  type: a.type,
  occurred_at: a.occurredAt,
  batch_ids: a.batchIds,
  problem_id: a.problemId ?? null,
  details: a.type === "spray" ? a.spray : a.type === "tank_mix" ? a.tankMix : a.fertilizer,
  notes: a.notes ?? null,
  raw_message: a.rawMessage ?? null,
  photos: a.photos,
});

// ── Reads ─────────────────────────────────────────────────────────────────

// One load per request, shared by every data function a page calls.
export const readStore = cache(async (): Promise<Store> => {
  const sb = await createClient();
  const [products, varieties, batches, problems, updates, activities] = await Promise.all([
    selectAll(sb, "products", [["name", true]]),
    selectAll(sb, "varieties", [["name", true]]),
    selectAll(sb, "batches", [["sown_on", false], ["transplanted_on", false]]),
    selectAll(sb, "problems", [["found_on", false], ["id", true]]),
    selectAll(sb, "problem_updates", [["occurred_at", true]]),
    selectAll(sb, "activities", [["occurred_at", false], ["id", true]]),
  ]);
  const byProblem = new Map<string, ProblemUpdate[]>();
  for (const r of updates) {
    const list = byProblem.get(r.problem_id as string) ?? [];
    list.push(toUpdate(r));
    byProblem.set(r.problem_id as string, list);
  }
  return {
    products: products.map(toProduct),
    varieties: varieties.map(toVariety),
    batches: batches.map(toBatch),
    problems: problems.map((r) => toProblem(r, byProblem.get(r.id as string) ?? [])),
    activities: activities.map(toActivity),
  };
});

// ── Writes ────────────────────────────────────────────────────────────────

async function upsert(table: string, row: Row, what: string) {
  const sb = await createClient();
  const { error } = await sb.from(table).upsert(row);
  check(error, what);
}

async function remove(table: string, id: string, what: string) {
  const sb = await createClient();
  const { error } = await sb.from(table).delete().eq("id", id);
  check(error, what);
}

export const saveActivityRow = (a: Activity) => upsert("activities", fromActivity(a), "Saving entry");
export const deleteActivityRow = (id: string) => remove("activities", id, "Deleting entry");

export const saveProductRow = (p: Product) => upsert("products", fromProduct(p), "Saving product");
export const deleteProductRow = (id: string) => remove("products", id, "Deleting product");

export const saveVarietyRow = (v: Variety) => upsert("varieties", fromVariety(v), "Saving variety");
export const deleteVarietyRow = (id: string) => remove("varieties", id, "Deleting variety");

export const saveBatchRow = (b: Batch) => upsert("batches", fromBatch(b), "Saving batch");
// The database trigger also removes the batch from every activity's list.
export const deleteBatchRow = (id: string) => remove("batches", id, "Deleting batch");

export const saveProblemRow = (p: Problem) => upsert("problems", fromProblem(p), "Saving problem");
// Updates cascade; linked activities keep existing with problem_id cleared.
export const deleteProblemRow = (id: string) => remove("problems", id, "Deleting problem");

export const saveProblemUpdateRow = (problemId: string, u: ProblemUpdate) =>
  upsert("problem_updates", fromUpdate(problemId, u), "Saving update");
export const deleteProblemUpdateRow = (id: string) => remove("problem_updates", id, "Deleting update");

// ── Photos (private Supabase Storage bucket) ──────────────────────────────

const PHOTO_ID = /^[0-9a-f-]{36}$/;
const photoPath = (id: string) => (PHOTO_ID.test(id) ? `${id}.jpg` : null);

export async function savePhotoFile(bytes: Uint8Array): Promise<string> {
  const id = randomUUID();
  const sb = await createClient();
  const { error } = await sb.storage.from(PHOTO_BUCKET).upload(photoPath(id)!, bytes, {
    contentType: "image/jpeg",
    upsert: false,
  });
  check(error, "Uploading photo");
  return id;
}

export async function readPhotoFile(id: string): Promise<Blob | null> {
  const path = photoPath(id);
  if (!path) return null;
  const sb = await createClient();
  const { data, error } = await sb.storage.from(PHOTO_BUCKET).download(path);
  return error ? null : data;
}

export async function photoFileExists(id: string) {
  const path = photoPath(id);
  if (!path) return false;
  const sb = await createClient();
  const { data } = await sb.storage.from(PHOTO_BUCKET).exists(path);
  return Boolean(data);
}

export async function deletePhotoFiles(ids: string[]) {
  const paths = ids.map(photoPath).filter((p): p is string => Boolean(p));
  if (paths.length === 0) return;
  const sb = await createClient();
  await sb.storage.from(PHOTO_BUCKET).remove(paths);
}

// ── Demo data ─────────────────────────────────────────────────────────────

// Wipes every farm record and photo, then loads fresh demo data. Only for the
// demo period; Phase 7 replaces this with "clear demo data" at hand-over.
export async function resetToDemo() {
  const sb = await createClient();
  for (const table of ["activities", "problem_updates", "problems", "batches", "varieties", "products"]) {
    const { error } = await sb.from(table).delete().neq("id", "");
    check(error, `Clearing ${table}`);
  }
  for (;;) {
    const { data } = await sb.storage.from(PHOTO_BUCKET).list("", { limit: 1000 });
    const names = (data ?? []).map((f) => f.name).filter((n) => n.endsWith(".jpg"));
    if (names.length === 0) break;
    await sb.storage.from(PHOTO_BUCKET).remove(names);
  }

  const demo = buildDemoData(dayKey(new Date()));
  const insert = async (table: string, rows: Row[]) => {
    const ids = new Set(rows.map((r) => r.id));
    if (ids.size !== rows.length) throw new Error(`Demo data has duplicate ids in ${table}`);
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await sb.from(table).insert(rows.slice(i, i + 500));
      check(error, `Loading demo ${table}`);
    }
  };
  await insert("products", demo.products.map(fromProduct));
  await insert("varieties", demo.varieties.map(fromVariety));
  await insert("batches", demo.batches.map(fromBatch));
  await insert("problems", demo.problems.map(fromProblem));
  // Demo update ids are only unique within a problem.
  await insert("problem_updates", demo.problems.flatMap((p) => p.updates.map((u) => fromUpdate(p.id, { ...u, id: `${p.id}-${u.id}` }))));
  await insert("activities", demo.activities.map(fromActivity));
}
