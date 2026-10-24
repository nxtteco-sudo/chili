import "server-only";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { dayKey } from "./dates";
import { buildDemoData } from "./demo-data";
import type { Activity, Batch, Problem, Product, Variety } from "./types";

// Local JSON store used until Supabase is connected (Phase 2). Everything
// lives in ./data on this computer; photos go to ./data/uploads.

export type Store = {
  version: typeof VERSION;
  seededOn: string;
  products: Product[];
  varieties: Variety[];
  batches: Batch[];
  activities: Activity[];
  problems: Problem[];
};

// Bump when the shape changes; older local files are replaced with fresh demo data.
const VERSION = 2;

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "farm.json");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

let memo: Store | null = null;
let queue: Promise<unknown> = Promise.resolve();

function seed(): Store {
  const today = dayKey(new Date());
  const demo = buildDemoData(today);
  return {
    version: VERSION,
    seededOn: today,
    products: demo.products,
    varieties: demo.varieties,
    batches: demo.batches,
    activities: demo.activities,
    problems: demo.problems,
  };
}

async function load(): Promise<Store> {
  if (memo) return memo;
  try {
    const stored = JSON.parse(await fs.readFile(FILE, "utf8")) as Store;
    if (stored.version === VERSION) memo = stored;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  if (!memo) {
    memo = seed();
    await save(memo);
  }
  return memo;
}

async function save(store: Store) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${FILE}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(store, null, 1));
  await fs.rename(tmp, FILE);
}

function sort(store: Store) {
  store.activities.sort((a, z) => z.occurredAt.localeCompare(a.occurredAt));
  store.problems.sort((a, z) => z.foundOn.localeCompare(a.foundOn) || a.id.localeCompare(z.id));
  store.batches.sort((a, z) => (z.sownOn ?? z.transplantedOn ?? "").localeCompare(a.sownOn ?? a.transplantedOn ?? ""));
}

export async function readStore(): Promise<Store> {
  await queue;
  return load();
}

// Writes are serialized so two quick saves can't overwrite each other.
export function mutate<T>(fn: (store: Store) => T): Promise<T> {
  const run = queue.then(async () => {
    const store = await load();
    const draft = structuredClone(store);
    const result = fn(draft);
    sort(draft);
    await save(draft);
    memo = draft;
    return result;
  });
  queue = run.catch(() => {});
  return run;
}

export function resetStore(): Promise<void> {
  const run = queue.then(async () => {
    const fresh = seed();
    await save(fresh);
    await fs.rm(UPLOAD_DIR, { recursive: true, force: true });
    memo = fresh;
  });
  queue = run.catch(() => {});
  return run;
}

const PHOTO_ID = /^[0-9a-f-]{36}$/;

export function photoPath(id: string) {
  if (!PHOTO_ID.test(id)) return null;
  return path.join(UPLOAD_DIR, `${id}.jpg`);
}

export async function savePhotoFile(bytes: Uint8Array): Promise<string> {
  const id = randomUUID();
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(photoPath(id)!, bytes);
  return id;
}

export async function photoFileExists(id: string) {
  const p = photoPath(id);
  if (!p) return false;
  return fs.access(p).then(
    () => true,
    () => false,
  );
}

export async function deletePhotoFiles(ids: string[]) {
  await Promise.all(
    ids.map((id) => {
      const p = photoPath(id);
      return p ? fs.rm(p, { force: true }) : undefined;
    }),
  );
}
