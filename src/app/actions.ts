"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addDays, atTime } from "@/lib/dates";
import { Fields, type FormState } from "@/lib/form-fields";
import {
  deletePhotoFiles,
  mutate,
  photoFileExists,
  readStore,
  resetStore,
} from "@/lib/store";
import type { Activity, Photo, Problem, ProblemUpdate, Product } from "@/lib/types";

// No login yet: these only run on this computer until Supabase Auth is added
// in Phase 2, which must add a session check at the top of every action.

const MAX_PHOTOS = 10;

const round2 = (n: number) => Math.round(n * 100) / 100;

function done(path: string): never {
  revalidatePath("/", "layout");
  redirect(path);
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

// ── Activities (spray / baja / water) ─────────────────────────────────────

export async function saveActivity(_prev: FormState, fd: FormData): Promise<FormState> {
  const f = new Fields(fd);
  const id = f.str("id", "Id");
  const type = f.oneOf("type", "Type", ["spray", "fertilizer", "water"] as const);
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
    const cost = f.num("costRm", "Cost");
    if (!f.ok) return f.state();
    const totalQty = round2(dose! * tanks!);
    activity = {
      ...base,
      type,
      spray: {
        productId: product!.id,
        dosePerTank: dose!,
        doseUnit: product!.unit,
        tankSizeL: tankSize!,
        tanks: tanks!,
        totalQty,
        target: target!,
        weather: weather ?? "",
        costRm: round2(cost ?? (totalQty / product!.packSize) * product!.packPriceRm),
        safeHarvestOn: addDays(date!, product!.phiDays ?? 0),
      },
    };
  } else if (type === "fertilizer") {
    const product = findProduct("fertilizer");
    const quantity = f.num("quantity", "Quantity", { required: true, positive: true });
    const method = f.oneOf("method", "Method", ["tabur", "siram", "spray", "fertigation"] as const);
    const plantStage = f.oneOf("plantStage", "Plant stage", ["nursery", "vegetative", "flowering", "fruiting", "harvest"] as const);
    const cost = f.num("costRm", "Cost");
    if (!f.ok) return f.state();
    activity = {
      ...base,
      type,
      fertilizer: {
        productId: product!.id,
        quantity: quantity!,
        unit: product!.unit,
        method: method!,
        plantStage: plantStage!,
        costRm: round2(cost ?? (quantity! / product!.packSize) * product!.packPriceRm),
      },
    };
  } else if (type === "water") {
    const method = f.oneOf("method", "Method", ["drip", "sprinkler", "manual", "hose"] as const);
    const durationMin = f.num("durationMin", "Duration", { int: true, max: 24 * 60 });
    const volumeL = f.num("volumeL", "Volume");
    const rained = f.bool("rained");
    const rainNote = f.str("rainNote", "Rain note", { max: 200 });
    if (!durationMin && !volumeL) f.errors.durationMin = "Enter the duration or the volume";
    if (!f.ok) return f.state();
    activity = {
      ...base,
      type,
      water: { method: method!, durationMin, volumeL, rained, rainNote: rained ? rainNote : undefined },
    };
  }
  if (!f.ok || !activity) return f.state();

  const saved = activity;
  await mutate((s) => {
    const i = s.activities.findIndex((a) => a.id === saved.id);
    if (i >= 0) s.activities[i] = saved;
    else s.activities.push(saved);
  });
  await deletePhotoFiles(removed);
  done(`/entries/${saved.id}`);
}

export async function deleteActivity(fd: FormData) {
  const id = String(fd.get("id") ?? "");
  const removed = await mutate((s) => {
    const a = s.activities.find((x) => x.id === id);
    s.activities = s.activities.filter((x) => x.id !== id);
    return a ? allPhotoIds(a.photos) : [];
  });
  await deletePhotoFiles(removed);
  done("/timeline");
}

// ── Problems ──────────────────────────────────────────────────────────────

const PARTS = ["leaf", "stem", "root", "flower", "fruit", "whole plant"] as const;
const CAUSES = ["pest", "disease", "nutrient", "water", "weather", "unknown"] as const;

export async function saveProblem(_prev: FormState, fd: FormData): Promise<FormState> {
  const f = new Fields(fd);
  const id = f.str("id", "Id");
  const title = f.str("title", "Title", { required: true, max: 120 });
  const symptoms = f.str("symptoms", "Symptoms", { max: 2000 });
  const affectedPart = f.oneOf("affectedPart", "Affected part", PARTS);
  const severity = f.oneOf("severity", "Severity", ["low", "medium", "high"] as const);
  const causeKind = f.oneOf("causeKind", "Cause type", CAUSES);
  const suspectedCause = f.str("suspectedCause", "Suspected cause", { max: 200 });
  const foundOn = f.date("foundOn", "Date found");
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
    photos,
  };
  await mutate((s) => {
    const i = s.problems.findIndex((p) => p.id === problem.id);
    if (i >= 0) s.problems[i] = problem;
    else s.problems.push(problem);
  });
  await deletePhotoFiles(removed);
  done(`/problems/${problem.id}`);
}

export async function deleteProblem(fd: FormData) {
  const id = String(fd.get("id") ?? "");
  const removed = await mutate((s) => {
    const p = s.problems.find((x) => x.id === id);
    s.problems = s.problems.filter((x) => x.id !== id);
    for (const a of s.activities) if (a.problemId === id) a.problemId = undefined;
    return p ? [...allPhotoIds(p.photos), ...p.updates.flatMap((u) => allPhotoIds(u.photos))] : [];
  });
  await deletePhotoFiles(removed);
  done("/problems");
}

export async function addProblemUpdate(_prev: FormState, fd: FormData): Promise<FormState> {
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
  await mutate((s) => {
    s.problems.find((p) => p.id === problemId)?.updates.push(update);
  });
  revalidatePath("/", "layout");
  return { savedAt: Date.now() };
}

export async function deleteProblemUpdate(fd: FormData) {
  const problemId = String(fd.get("problemId") ?? "");
  const updateId = String(fd.get("updateId") ?? "");
  const removed = await mutate((s) => {
    const p = s.problems.find((x) => x.id === problemId);
    const u = p?.updates.find((x) => x.id === updateId);
    if (p) p.updates = p.updates.filter((x) => x.id !== updateId);
    return u ? allPhotoIds(u.photos) : [];
  });
  await deletePhotoFiles(removed);
  revalidatePath("/", "layout");
}

export async function closeProblem(_prev: FormState, fd: FormData): Promise<FormState> {
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
  await mutate((s) => {
    const p = s.problems.find((x) => x.id === problemId);
    if (p) Object.assign(p, { status: "resolved", outcome, lesson, resolvedOn });
  });
  done(`/problems/${problemId}`);
}

export async function reopenProblem(fd: FormData) {
  const problemId = String(fd.get("problemId") ?? "");
  await mutate((s) => {
    const p = s.problems.find((x) => x.id === problemId);
    if (p) Object.assign(p, { status: "open", outcome: undefined, resolvedOn: undefined });
  });
  done(`/problems/${problemId}`);
}

// ── Products ──────────────────────────────────────────────────────────────

export async function saveProduct(_prev: FormState, fd: FormData): Promise<FormState> {
  const f = new Fields(fd);
  const id = f.str("id", "Id");
  const name = f.str("name", "Name", { required: true, max: 100 });
  const category = f.oneOf("category", "Category", ["pesticide", "fertilizer"] as const);
  const subtype = f.str("subtype", "Type", { required: true, max: 60 });
  const activeIngredient = f.str("activeIngredient", "Active ingredient", { max: 100 });
  const npk = f.str("npk", "NPK", { max: 40 });
  const unit = f.oneOf("unit", "Unit", ["ml", "L", "g", "kg", "karung", "pcs"] as const);
  const packSize = f.num("packSize", "Pack size", { required: true, positive: true });
  const packPriceRm = f.num("packPriceRm", "Pack price", { required: true });
  const phiDays = category === "pesticide" ? f.num("phiDays", "Waiting period", { int: true, max: 365 }) : undefined;
  const notes = f.str("notes", "Notes", { max: 1000 });
  const returnTo = f.str("returnTo", "Return");

  const store = await readStore();
  const existing = id ? store.products.find((p) => p.id === id) : undefined;
  if (id && !existing) return { error: "This product no longer exists." };
  if (name && store.products.some((p) => p.id !== id && p.name.toLowerCase() === name.toLowerCase()))
    f.errors.name = "A product with this name already exists";
  const used = existing && store.activities.some((a) => productIdOfActivity(a) === existing.id);
  if (used && category !== existing.category) f.errors.category = "Already used in entries, so the category can't change";
  if (used && unit !== existing.unit) f.errors.unit = "Already used in entries, so the unit can't change";
  if (!f.ok) return f.state();

  const product: Product = {
    id: existing?.id ?? randomUUID(),
    name: name!,
    category: category!,
    subtype: subtype!,
    activeIngredient,
    npk,
    unit: unit!,
    packSize: packSize!,
    packPriceRm: packPriceRm!,
    phiDays,
    notes,
  };
  await mutate((s) => {
    const i = s.products.findIndex((p) => p.id === product.id);
    if (i >= 0) s.products[i] = product;
    else s.products.push(product);
  });
  const safeReturn = returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : undefined;
  done(safeReturn ? `${safeReturn}${safeReturn.includes("?") ? "&" : "?"}product=${product.id}` : `/products/${product.id}`);
}

function productIdOfActivity(a: Activity) {
  return a.type === "spray" ? a.spray.productId : a.type === "fertilizer" ? a.fertilizer.productId : undefined;
}

export async function deleteProduct(fd: FormData) {
  const id = String(fd.get("id") ?? "");
  await mutate((s) => {
    if (s.activities.some((a) => productIdOfActivity(a) === id)) return;
    s.products = s.products.filter((p) => p.id !== id);
  });
  done("/products");
}

// ── Demo data ─────────────────────────────────────────────────────────────

export async function resetDemoData() {
  await resetStore();
  done("/");
}
