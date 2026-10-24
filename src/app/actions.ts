"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addDays, atTime } from "@/lib/dates";
import { requireMember } from "@/lib/auth";
import {
  deleteActivityRow,
  deleteBatchRow,
  deletePhotoFiles,
  deleteProblemRow,
  deleteProblemUpdateRow,
  deleteProductRow,
  deleteVarietyRow,
  photoFileExists,
  readStore,
  resetToDemo,
  saveActivityRow,
  saveBatchRow,
  saveProblemRow,
  saveProblemUpdateRow,
  saveProductRow,
  saveVarietyRow,
  type Store,
} from "@/lib/db";
import { Fields, type FormState } from "@/lib/form-fields";
import type { Activity, Batch, Photo, Problem, ProblemUpdate, Product, TankAdditive, Variety } from "@/lib/types";

// Server actions can be called directly with a POST, so every one starts with
// requireMember(); Row Level Security in Supabase is the second line of defence.

const MAX_PHOTOS = 10;

const round2 = (n: number) => Math.round(n * 100) / 100;

function done(path: string): never {
  revalidatePath("/", "layout");
  redirect(path);
}

function safeReturn(path: string | undefined) {
  return path && path.startsWith("/") && !path.startsWith("//") ? path : undefined;
}

async function resolvePhotos(f: Fields, existing: Photo[]) {
  if (f.bool("uploading")) f.errors.photos = "Wait for the photos to finish uploading.";
  const keep = new Set(f.list("keepPhotoIds"));
  const added = f.list("newPhotoIds");
  for (const id of added)
    if (!(await photoFileExists(id))) f.errors.photos = "A photo didn't upload. Remove it and try again.";
  const photos: Photo[] = [
    ...existing.filter((p) => keep.has(p.id)),
    ...added.map((id) => ({ id, caption: "", url: `/photos/${id}` })),
  ];
  if (photos.length > MAX_PHOTOS) f.errors.photos = `Up to ${MAX_PHOTOS} photos per entry.`;
  const removed = existing.filter((p) => !keep.has(p.id) && p.url).map((p) => p.id);
  return { photos, removed };
}

const allPhotoIds = (photos: Photo[]) => photos.filter((p) => p.url).map((p) => p.id);

function resolveBatchIds(f: Fields, store: Store) {
  const ids = [...new Set(f.list("batchIds"))];
  if (ids.some((id) => !store.batches.some((b) => b.id === id))) f.errors.batchIds = "A selected batch no longer exists";
  return ids;
}

function productIdsOfActivity(a: Activity) {
  if (a.type === "spray") return [a.spray.productId];
  if (a.type === "fertilizer") return [a.fertilizer.productId];
  return a.tankMix.additives.map((x) => x.productId);
}

// ── Activities (spray / tank mix / other baja) ────────────────────────────

export async function saveActivity(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireMember();
  const f = new Fields(fd);
  const id = f.str("id", "Id");
  const type = f.oneOf("type", "Type", ["spray", "tank_mix", "fertilizer"] as const);
  const date = f.date("date", "Date");
  const time = f.time("time", "Time");
  const problemId = f.str("problemId", "Problem");
  const notes = f.str("notes", "Notes", { max: 2000 });

  const store = await readStore();
  const existing = id ? store.activities.find((a) => a.id === id) : undefined;
  if (id && !existing) return { error: "This entry no longer exists." };
  if (existing && existing.type !== type) return { error: "An entry's type can't be changed." };
  if (problemId && !store.problems.some((p) => p.id === problemId))
    f.errors.problemId = "That problem no longer exists";
  const batchIds = resolveBatchIds(f, store);
  const { photos, removed } = await resolvePhotos(f, existing?.photos ?? []);

  const findProduct = (category: Product["category"]) => {
    const pid = f.str("productId", "Product", { required: true });
    const product = store.products.find((p) => p.id === pid && p.category === category);
    if (pid && !product) f.errors.productId = "Choose a product from the list";
    return product;
  };

  const base = {
    id: existing?.id ?? randomUUID(),
    occurredAt: atTime(date ?? "", time ?? ""),
    batchIds,
    problemId: problemId || undefined,
    notes,
    rawMessage: existing?.rawMessage,
    photos,
  };

  let activity: Activity | undefined;
  if (type === "spray") {
    const product = findProduct("pesticide");
    const dose = f.num("dosePerTank", "Dose per tong", { required: true, positive: true });
    const tankSize = f.num("tankSizeL", "Tank size", { required: true, positive: true, max: 2000 });
    const tanks = f.num("tanks", "Number of tong", { required: true, positive: true, max: 1000 });
    const target = f.str("target", "Target / reason", { required: true, max: 200 });
    const weather = f.str("weather", "Weather", { max: 100 });
    if (!f.ok) return f.state();
    activity = {
      ...base,
      type,
      spray: {
        productId: product!.id,
        dosePerTank: dose!,
        doseUnit: product!.unit,
        tankSizeL: tankSize!,
        tanks: tanks!,
        totalQty: round2(dose! * tanks!),
        target: target!,
        weather: weather ?? "",
        safeHarvestOn: addDays(date!, product!.phiDays ?? 0),
      },
    };
  } else if (type === "tank_mix") {
    const aAmount = f.num("aAmount", "A amount", { required: true, positive: true });
    const bAmount = f.num("bAmount", "B amount", { required: true, positive: true });
    const abUnit = f.oneOf("abUnit", "Unit", ["L", "ml", "kg", "g"] as const);
    const waterL = f.num("waterL", "Water in tank", { required: true, positive: true, max: 100_000 });
    const ec = f.num("ec", "EC", { max: 20 });
    const ph = f.num("ph", "pH", { max: 14 });
    const additives = parseAdditives(f, fd, store);
    if (!f.ok) return f.state();
    activity = {
      ...base,
      type,
      tankMix: { aAmount: aAmount!, bAmount: bAmount!, abUnit: abUnit!, waterL: waterL!, ec, ph, additives },
    };
  } else if (type === "fertilizer") {
    const product = findProduct("fertilizer");
    const quantity = f.num("quantity", "Quantity", { required: true, positive: true });
    const method = f.oneOf("method", "Method", ["foliar", "tabur", "siram", "other"] as const);
    if (!f.ok) return f.state();
    activity = {
      ...base,
      type,
      fertilizer: { productId: product!.id, quantity: quantity!, unit: product!.unit, method: method! },
    };
  }
  if (!f.ok || !activity) return f.state();

  await saveActivityRow(activity);
  await deletePhotoFiles(removed);
  done(`/entries/${activity.id}`);
}

// Extra fertilizer rows in a tank mix arrive as parallel lists; blank rows are skipped.
function parseAdditives(f: Fields, fd: FormData, store: Store): TankAdditive[] {
  const ids = fd.getAll("additiveProductId").map(String);
  const qtys = fd.getAll("additiveQty").map((v) => String(v).trim().replace(",", "."));
  const out: TankAdditive[] = [];
  ids.forEach((pid, i) => {
    const raw = qtys[i] ?? "";
    if (!pid && !raw) return;
    const product = store.products.find((p) => p.id === pid && p.category === "fertilizer");
    const qty = Number(raw);
    if (!product) f.errors.additives = "Choose a product for each extra fertilizer row";
    else if (!raw || !Number.isFinite(qty) || qty <= 0) f.errors.additives = `Enter an amount for ${product.name}`;
    else out.push({ productId: product.id, quantity: qty, unit: product.unit });
  });
  return out;
}

export async function deleteActivity(fd: FormData) {
  await requireMember();
  const id = String(fd.get("id") ?? "");
  const a = (await readStore()).activities.find((x) => x.id === id);
  await deleteActivityRow(id);
  await deletePhotoFiles(a ? allPhotoIds(a.photos) : []);
  done("/timeline");
}

// ── Problems ──────────────────────────────────────────────────────────────

const PARTS = ["leaf", "stem", "root", "flower", "fruit", "whole plant"] as const;
const CAUSES = ["pest", "disease", "nutrient", "water", "weather", "unknown"] as const;

export async function saveProblem(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireMember();
  const f = new Fields(fd);
  const id = f.str("id", "Id");
  const title = f.str("title", "Title", { required: true, max: 120 });
  const symptoms = f.str("symptoms", "Symptoms", { max: 2000 });
  const affectedPart = f.oneOf("affectedPart", "Affected part", PARTS);
  const severity = f.oneOf("severity", "Severity", ["low", "medium", "high"] as const);
  const causeKind = f.oneOf("causeKind", "Cause type", CAUSES);
  const suspectedCause = f.str("suspectedCause", "Suspected cause", { max: 200 });
  const foundOn = f.date("foundOn", "Date found");
  const batchId = f.str("batchId", "Batch");
  const tags = [
    ...new Set(
      (f.str("tags", "Tags", { max: 500 }) ?? "")
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    ),
  ].slice(0, 15);

  const store = await readStore();
  const existing = id ? store.problems.find((p) => p.id === id) : undefined;
  if (id && !existing) return { error: "This problem no longer exists." };
  if (batchId && !store.batches.some((b) => b.id === batchId)) f.errors.batchId = "That batch no longer exists";
  if (existing?.resolvedOn && foundOn && foundOn > existing.resolvedOn)
    f.errors.foundOn = "Can't be after the day it was closed";
  const { photos, removed } = await resolvePhotos(f, existing?.photos ?? []);
  if (!f.ok) return f.state();

  const problem: Problem = {
    ...(existing ?? { id: randomUUID(), status: "open", updates: [] }),
    title: title!,
    symptoms: symptoms ?? "",
    affectedPart: affectedPart!,
    severity: severity!,
    causeKind: causeKind!,
    suspectedCause: suspectedCause ?? "Unknown",
    tags,
    foundOn: foundOn!,
    batchId: batchId || undefined,
    photos,
  };
  await saveProblemRow(problem);
  await deletePhotoFiles(removed);
  done(`/problems/${problem.id}`);
}

export async function deleteProblem(fd: FormData) {
  await requireMember();
  const id = String(fd.get("id") ?? "");
  const p = (await readStore()).problems.find((x) => x.id === id);
  // Updates cascade; linked entries stay, with the problem link cleared.
  await deleteProblemRow(id);
  await deletePhotoFiles(p ? [...allPhotoIds(p.photos), ...p.updates.flatMap((u) => allPhotoIds(u.photos))] : []);
  done("/problems");
}

export async function addProblemUpdate(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireMember();
  const f = new Fields(fd);
  const problemId = f.str("problemId", "Problem", { required: true });
  const kind = f.oneOf("kind", "Type", ["followup", "action"] as const);
  const body = f.str("body", "Note", { max: 2000 });
  const date = f.date("date", "Date");
  const time = f.time("time", "Time");
  const store = await readStore();
  const problem = store.problems.find((p) => p.id === problemId);
  if (!problem) return { error: "This problem no longer exists." };
  const { photos } = await resolvePhotos(f, []);
  if (!body && photos.length === 0) f.errors.body = "Write a note or add a photo";
  if (!f.ok) return f.state();

  const update: ProblemUpdate = {
    id: randomUUID(),
    kind: kind!,
    body: body ?? "",
    occurredAt: atTime(date!, time!),
    photos,
  };
  await saveProblemUpdateRow(problemId!, update);
  revalidatePath("/", "layout");
  return { savedAt: Date.now() };
}

export async function deleteProblemUpdate(fd: FormData) {
  await requireMember();
  const problemId = String(fd.get("problemId") ?? "");
  const updateId = String(fd.get("updateId") ?? "");
  const u = (await readStore()).problems.find((x) => x.id === problemId)?.updates.find((x) => x.id === updateId);
  if (!u) return;
  await deleteProblemUpdateRow(updateId);
  await deletePhotoFiles(allPhotoIds(u.photos));
  revalidatePath("/", "layout");
}

export async function closeProblem(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireMember();
  const f = new Fields(fd);
  const problemId = f.str("problemId", "Problem", { required: true });
  const outcome = f.oneOf("outcome", "Result", ["solved", "partly", "not_solved"] as const);
  const lesson = f.str("lesson", "What you learned", { required: true, max: 2000 });
  const resolvedOn = f.date("resolvedOn", "Date closed");
  const store = await readStore();
  const problem = store.problems.find((p) => p.id === problemId);
  if (!problem) return { error: "This problem no longer exists." };
  if (resolvedOn && resolvedOn < problem.foundOn) f.errors.resolvedOn = "Can't be before the day it was found";
  if (!f.ok) return f.state();
  await saveProblemRow({ ...problem, status: "resolved", outcome, lesson, resolvedOn });
  done(`/problems/${problemId}`);
}

export async function reopenProblem(fd: FormData) {
  await requireMember();
  const problemId = String(fd.get("problemId") ?? "");
  const problem = (await readStore()).problems.find((x) => x.id === problemId);
  if (problem) await saveProblemRow({ ...problem, status: "open", outcome: undefined, resolvedOn: undefined });
  done(`/problems/${problemId}`);
}

// ── Planting batches & varieties ──────────────────────────────────────────

// Each date in a batch must come on or after the ones before it.
const BATCH_DATES = [
  ["sownOn", "Seeds sown"],
  ["transplantedOn", "Transplanted"],
  ["firstFlowerOn", "First flowers"],
  ["firstHarvestOn", "First harvest"],
  ["endedOn", "Crop ended"],
] as const;

function checkDateOrder(f: Fields, dates: Partial<Record<(typeof BATCH_DATES)[number][0], string>>) {
  let prev: { date: string; label: string } | undefined;
  for (const [key, label] of BATCH_DATES) {
    const d = dates[key];
    if (!d) continue;
    if (prev && d < prev.date) f.errors[key] ??= `Can't be before "${prev.label}"`;
    prev = { date: d, label };
  }
}

export async function saveBatch(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireMember();
  const f = new Fields(fd);
  const id = f.str("id", "Id");
  const name = f.str("name", "Batch name", { required: true, max: 80 });
  const varietyId = f.str("varietyId", "Variety");
  const dates = Object.fromEntries(BATCH_DATES.map(([key, label]) => [key, f.optDate(key, label)])) as Partial<
    Record<(typeof BATCH_DATES)[number][0], string>
  >;
  const seedsCount = f.num("seedsCount", "Seeds", { int: true });
  const polybagsCount = f.num("polybagsCount", "Polybags", { int: true });
  const notes = f.str("notes", "Notes", { max: 2000 });
  if (!dates.sownOn && !dates.transplantedOn) f.errors.sownOn ??= "Enter the sowing date or the transplant date";
  checkDateOrder(f, dates);

  const store = await readStore();
  const existing = id ? store.batches.find((b) => b.id === id) : undefined;
  if (id && !existing) return { error: "This batch no longer exists." };
  if (varietyId && !store.varieties.some((v) => v.id === varietyId)) f.errors.varietyId = "Choose a variety from the list";
  if (name && store.batches.some((b) => b.id !== id && b.name.toLowerCase() === name.toLowerCase()))
    f.errors.name = "A batch with this name already exists";
  const { photos, removed } = await resolvePhotos(f, existing?.photos ?? []);
  if (!f.ok) return f.state();

  const batch: Batch = {
    id: existing?.id ?? randomUUID(),
    name: name!,
    varietyId: varietyId || undefined,
    ...dates,
    seedsCount,
    polybagsCount,
    notes,
    photos,
  };
  await saveBatchRow(batch);
  await deletePhotoFiles(removed);
  done(`/batches/${batch.id}`);
}

const MILESTONE_FIELD = { flower: "firstFlowerOn", harvest: "firstHarvestOn", end: "endedOn" } as const;

export async function markBatchMilestone(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireMember();
  const f = new Fields(fd);
  const batchId = f.str("batchId", "Batch", { required: true });
  const milestone = f.oneOf("milestone", "Milestone", ["flower", "harvest", "end"] as const);
  const date = f.date("date", "Date");
  const store = await readStore();
  const batch = store.batches.find((b) => b.id === batchId);
  if (!batch) return { error: "This batch no longer exists." };
  if (!f.ok) return f.state();
  const field = MILESTONE_FIELD[milestone!];
  const next = { ...batch, [field]: date };
  checkDateOrder(f, next);
  if (!f.ok) return { error: Object.values(f.errors)[0] };
  await saveBatchRow(next);
  done(`/batches/${batchId}`);
}

export async function deleteBatch(fd: FormData) {
  await requireMember();
  const id = String(fd.get("id") ?? "");
  const b = (await readStore()).batches.find((x) => x.id === id);
  // The database drops the batch from entries and problems.
  await deleteBatchRow(id);
  await deletePhotoFiles(b ? allPhotoIds(b.photos) : []);
  done("/batches");
}

export async function saveVariety(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireMember();
  const f = new Fields(fd);
  const id = f.str("id", "Id");
  const name = f.str("name", "Variety name", { required: true, max: 80 });
  const day = (key: string, label: string) => f.num(key, label, { int: true, max: 400 });
  const variety: Omit<Variety, "id"> = {
    name: name ?? "",
    daysSowToTransplant: day("daysSowToTransplant", "Days to transplant"),
    daysTransplantToFlower: day("daysTransplantToFlower", "Days to flowering"),
    daysTransplantToHarvest: day("daysTransplantToHarvest", "Days to first harvest"),
    harvestSeasonDays: day("harvestSeasonDays", "Harvest season"),
    notes: f.str("notes", "Notes", { max: 1000 }),
  };
  const returnTo = safeReturn(f.str("returnTo", "Return"));
  const store = await readStore();
  const existing = id ? store.varieties.find((v) => v.id === id) : undefined;
  if (id && !existing) return { error: "This variety no longer exists." };
  if (name && store.varieties.some((v) => v.id !== id && v.name.toLowerCase() === name.toLowerCase()))
    f.errors.name = "A variety with this name already exists";
  if (!f.ok) return f.state();

  const saved: Variety = { id: existing?.id ?? randomUUID(), ...variety };
  await saveVarietyRow(saved);
  done(returnTo ? `${returnTo}${returnTo.includes("?") ? "&" : "?"}variety=${saved.id}` : "/varieties");
}

export async function deleteVariety(fd: FormData) {
  await requireMember();
  const id = String(fd.get("id") ?? "");
  if (!(await readStore()).batches.some((b) => b.varietyId === id)) await deleteVarietyRow(id);
  done("/varieties");
}

// ── Products ──────────────────────────────────────────────────────────────

export async function saveProduct(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireMember();
  const f = new Fields(fd);
  const id = f.str("id", "Id");
  const name = f.str("name", "Name", { required: true, max: 100 });
  const category = f.oneOf("category", "Category", ["pesticide", "fertilizer"] as const);
  const subtype = f.str("subtype", "Type", { required: true, max: 60 });
  const activeIngredient = f.str("activeIngredient", "Active ingredient", { max: 100 });
  const npk = f.str("npk", "NPK", { max: 40 });
  const unit = f.oneOf("unit", "Unit", ["ml", "L", "g", "kg", "karung", "pcs"] as const);
  const phiDays = category === "pesticide" ? f.num("phiDays", "Waiting period", { int: true, max: 365 }) : undefined;
  const notes = f.str("notes", "Notes", { max: 1000 });
  const returnTo = safeReturn(f.str("returnTo", "Return"));

  const store = await readStore();
  const existing = id ? store.products.find((p) => p.id === id) : undefined;
  if (id && !existing) return { error: "This product no longer exists." };
  if (name && store.products.some((p) => p.id !== id && p.name.toLowerCase() === name.toLowerCase()))
    f.errors.name = "A product with this name already exists";
  const used = existing && store.activities.some((a) => productIdsOfActivity(a).includes(existing.id));
  if (used && category !== existing.category) f.errors.category = "Already used in entries, so the category can't change";
  if (used && unit !== existing.unit) f.errors.unit = "Already used in entries, so the unit can't change";
  if (!f.ok) return f.state();

  const product: Product = {
    id: existing?.id ?? randomUUID(),
    name: name!,
    category: category!,
    subtype: subtype!,
    activeIngredient: category === "pesticide" ? activeIngredient : undefined,
    npk: category === "fertilizer" ? npk : undefined,
    unit: unit!,
    phiDays,
    notes,
  };
  await saveProductRow(product);
  done(returnTo ? `${returnTo}${returnTo.includes("?") ? "&" : "?"}product=${product.id}` : `/products/${product.id}`);
}

export async function deleteProduct(fd: FormData) {
  await requireMember();
  const id = String(fd.get("id") ?? "");
  if (!(await readStore()).activities.some((a) => productIdsOfActivity(a).includes(id))) await deleteProductRow(id);
  done("/products");
}

// ── Demo data ─────────────────────────────────────────────────────────────

export async function resetDemoData() {
  await requireMember();
  await resetToDemo();
  done("/");
}
