import { randomUUID } from "node:crypto";
import { isActiveBatch } from "@/lib/batches";
import { FARM_TZ, addDays, atTime, dayKey, formatShort } from "@/lib/dates";
import { FERT_METHOD_LABEL } from "@/lib/labels";
import { formatQty } from "@/lib/format";
import type { Activity, FertilizerDetails, Product, TankMixDetails } from "@/lib/types";
import type { Catalog } from "./store";

// Guided "answer one question at a time" flows. A flow is a list of steps;
// each step shows a question with quick-pick buttons and also accepts typing.
// Wording is Malay first with English in brackets, as in PROJECT.md §5.

export type Draft = Record<string, unknown>;
export type FlowCtx = { draft: Draft; catalog: Catalog; today: string; nowTime: string };
export type Option = { label: string; value: string };

export const SKIP = "__skip";
const skip: Option = { label: "⏭️ Skip", value: SKIP };

export type Step = {
  key: string;
  // Answers the step without asking (e.g. only one active batch).
  auto?: (fc: FlowCtx) => { value?: unknown } | undefined;
  ask: (fc: FlowCtx) => { text: string; options?: Option[] };
  // Turns a tapped button's value or typed text into the stored answer.
  parse?: (text: string, fc: FlowCtx) => { value: unknown } | { error: string };
};

export type Flow = {
  id: "spray" | "tank_mix" | "fertilizer";
  title: string;
  steps: Step[];
  summary: (fc: FlowCtx) => string;
  build: (fc: FlowCtx) => Activity;
};

export const makeCtx = (draft: Draft, catalog: Catalog): FlowCtx => ({
  draft,
  catalog,
  today: dayKey(new Date()),
  nowTime: new Intl.DateTimeFormat("en-GB", { timeZone: FARM_TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()),
});

// ── Reusable steps ─────────────────────────────────────────────────────────

const number = (max: number) => (t: string): { value: number } | { error: string } => {
  const n = Number(t.replace(/[^\d.,]/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 && n <= max ? { value: n } : { error: "Taip nombor sahaja, contoh: 20 (numbers only)" };
};

const optionalNumber = (max: number) => (t: string) => (t === SKIP ? { value: undefined } : number(max)(t));

const chunk = <T,>(list: T[], size: number) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size));
export const rows = (options: Option[], perRow = 2) => chunk(options, perRow);

const productOf = (fc: FlowCtx) => fc.catalog.products.find((p) => p.id === fc.draft.productId);

function productStep(category: Product["category"], question: string): Step {
  const pool = (fc: FlowCtx) => fc.catalog.products.filter((p) => p.category === category);
  return {
    key: "productId",
    ask: (fc) => {
      // Most recently used first, so the usual product is one tap away.
      const used = fc.catalog.activities.flatMap((a) => (a.type === "spray" ? [a.spray.productId] : a.type === "fertilizer" ? [a.fertilizer.productId] : []));
      const rank = (p: Product) => (used.includes(p.id) ? used.indexOf(p.id) : 9999);
      const top = [...pool(fc)].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name)).slice(0, 8);
      return {
        text: top.length ? question : "Belum ada produk. Tambah produk di dashboard dulu. (No products yet — add one on the dashboard first.)",
        options: top.map((p) => ({ label: p.name, value: p.id })),
      };
    },
    parse: (t, fc) => {
      const exact = pool(fc).find((p) => p.id === t);
      if (exact) return { value: exact.id };
      const hits = pool(fc).filter((p) => p.name.toLowerCase().includes(t.trim().toLowerCase()));
      if (hits.length === 1) return { value: hits[0].id };
      return { error: hits.length ? `Banyak padanan: ${hits.map((p) => p.name).join(", ")}. Taip lagi. (Be more specific.)` : "Tak jumpa produk tu. Pilih butang atau taip nama. (Not found.)" };
    },
  };
}

const whenStep: Step = {
  key: "daysAgo",
  ask: () => ({
    text: "📅 Bila? (When?)",
    options: [
      { label: "Hari ini (today)", value: "0" },
      { label: "Semalam (yesterday)", value: "1" },
    ],
  }),
  parse: (t) => {
    const n = Number(t.match(/^(\d{1,3})\s*(hari|d|day|days)?(\s*lepas)?$/i)?.[1]);
    return Number.isInteger(n) && n <= 365 ? { value: n } : { error: "Pilih butang atau taip contoh: 3 hari (3 days ago)" };
  },
};

const batchStep: Step = {
  key: "batchId",
  auto: (fc) => {
    const active = fc.catalog.batches.filter((b) => isActiveBatch(b, fc.today));
    return active.length === 0 ? { value: undefined } : active.length === 1 ? { value: active[0].id } : undefined;
  },
  ask: (fc) => ({
    text: "🌶️ Batch mana? (Which batch?)",
    options: [...fc.catalog.batches.filter((b) => isActiveBatch(b, fc.today)).map((b) => ({ label: b.name, value: b.id })), skip],
  }),
  parse: (t, fc) => {
    if (t === SKIP) return { value: undefined };
    return fc.catalog.batches.some((b) => b.id === t) ? { value: t } : { error: "Pilih salah satu butang. (Pick a button.)" };
  },
};

// ── Shared helpers for summaries and saving ────────────────────────────────

const dayOf = (fc: FlowCtx) => addDays(fc.today, -((fc.draft.daysAgo as number) ?? 0));
const whenLabel = (fc: FlowCtx) => {
  const ago = (fc.draft.daysAgo as number) ?? 0;
  return `${formatShort(dayOf(fc))} (${ago === 0 ? "hari ini" : ago === 1 ? "semalam" : `${ago} hari lepas`})`;
};
const batchLabel = (fc: FlowCtx) => fc.catalog.batches.find((b) => b.id === fc.draft.batchId)?.name;
const base = (fc: FlowCtx) => ({
  id: randomUUID(),
  occurredAt: atTime(dayOf(fc), (fc.draft.daysAgo as number) ? "08:00" : fc.nowTime),
  batchIds: fc.draft.batchId ? [fc.draft.batchId as string] : [],
  photos: [],
});
const lines = (...l: (string | false | undefined)[]) => l.filter(Boolean).join("\n");

// Last values used with this product, offered as one-tap suggestions.
const lastSpray = (fc: FlowCtx) => fc.catalog.activities.find((a) => a.type === "spray" && a.spray.productId === fc.draft.productId);

// ── Spray ──────────────────────────────────────────────────────────────────

const TARGETS = ["Thrips", "Kulat", "Tungau", "Ulat", "Lalat putih", "Kutu daun"];
const WEATHER = ["Cerah", "Mendung", "Panas terik", "Berangin", "Hujan lepas sembur"];

const spray: Flow = {
  id: "spray",
  title: "🧪 Spray",
  steps: [
    productStep("pesticide", "💊 Racun apa? (Which product?)"),
    {
      key: "dosePerTank",
      ask: (fc) => {
        const last = lastSpray(fc);
        const unit = productOf(fc)?.unit ?? "";
        return {
          text: `📏 Berapa ${unit} satu tong? (Dose per tank, ${unit})`,
          options: last?.type === "spray" ? [{ label: `Macam dulu: ${last.spray.dosePerTank} ${unit}`, value: String(last.spray.dosePerTank) }] : [],
        };
      },
      parse: number(100_000),
    },
    {
      key: "tankSizeL",
      ask: (fc) => {
        const last = lastSpray(fc);
        const sizes = [...new Set([...(last?.type === "spray" ? [last.spray.tankSizeL] : []), 16, 20, 200])].slice(0, 4);
        return { text: "🛢️ Tong berapa liter? (Tank size, litres)", options: sizes.map((s) => ({ label: `${s} L`, value: String(s) })) };
      },
      parse: number(2000),
    },
    {
      key: "tanks",
      ask: () => ({ text: "🔢 Berapa tong? (How many tanks?)", options: [1, 2, 3, 4, 5, 6].map((n) => ({ label: String(n), value: String(n) })) }),
      parse: number(1000),
    },
    {
      key: "target",
      ask: () => ({ text: "🎯 Sebab? (Why / which pest?)  Tap or type.", options: TARGETS.map((t) => ({ label: t, value: t })) }),
      parse: (t) => (t.trim().length <= 200 ? { value: t.trim() } : { error: "Terlalu panjang. (Too long.)" }),
    },
    {
      key: "weather",
      ask: () => ({ text: "🌦️ Cuaca? (Weather)", options: [...WEATHER.map((w) => ({ label: w, value: w })), skip] }),
      parse: (t) => ({ value: t === SKIP ? "" : t.trim().slice(0, 100) }),
    },
    whenStep,
    batchStep,
  ],
  summary: (fc) => {
    const p = productOf(fc)!;
    const d = fc.draft as { dosePerTank: number; tankSizeL: number; tanks: number; target: string; weather?: string };
    return lines(
      "🧪 SPRAY — semak dulu: (check first)",
      `📅 ${whenLabel(fc)}`,
      `💊 ${p.name}`,
      `📏 ${formatQty(d.dosePerTank, p.unit)} / tong × ${d.tanks} tong = ${formatQty(round2(d.dosePerTank * d.tanks), p.unit)}  (tong ${d.tankSizeL} L)`,
      `🎯 Sebab: ${d.target}`,
      d.weather ? `🌦️ ${d.weather}` : false,
      batchLabel(fc) && `🌶️ Batch: ${batchLabel(fc)}`,
      `⏳ Boleh tuai selepas: ${formatShort(addDays(dayOf(fc), p.phiDays ?? 0))}${p.phiDays ? ` (${p.phiDays} hari)` : ""}`,
    );
  },
  build: (fc) => {
    const p = productOf(fc)!;
    const d = fc.draft as { dosePerTank: number; tankSizeL: number; tanks: number; target: string; weather?: string };
    return {
      ...base(fc),
      type: "spray",
      spray: {
        productId: p.id,
        dosePerTank: d.dosePerTank,
        doseUnit: p.unit,
        tankSizeL: d.tankSizeL,
        tanks: d.tanks,
        totalQty: round2(d.dosePerTank * d.tanks),
        target: d.target,
        weather: d.weather ?? "",
        safeHarvestOn: addDays(dayOf(fc), p.phiDays ?? 0),
      },
    };
  },
};

// ── Tank mix (AB) ──────────────────────────────────────────────────────────

const lastTank = (fc: FlowCtx) => fc.catalog.activities.find((a) => a.type === "tank_mix");

const tankMix: Flow = {
  id: "tank_mix",
  title: "🪣 Tank mix (AB)",
  steps: [
    {
      key: "abUnit",
      ask: () => ({ text: "🪣 Baja AB — ukuran apa? (Unit for A and B)", options: ["L", "ml", "kg", "g"].map((u) => ({ label: u, value: u })) }),
      parse: (t) => (["L", "ml", "kg", "g"].includes(t) ? { value: t } : { error: "Pilih butang. (Pick a button.)" }),
    },
    {
      key: "aAmount",
      ask: (fc) => {
        const last = lastTank(fc);
        return { text: `🅰️ Berapa ${fc.draft.abUnit} baja A? (Amount of A)`, options: last?.type === "tank_mix" && last.tankMix.abUnit === fc.draft.abUnit ? [{ label: `Macam dulu: ${last.tankMix.aAmount}`, value: String(last.tankMix.aAmount) }] : [] };
      },
      parse: number(100_000),
    },
    {
      key: "bAmount",
      ask: (fc) => ({ text: `🅱️ Berapa ${fc.draft.abUnit} baja B? (Amount of B)`, options: [{ label: `Sama dengan A (${fc.draft.aAmount})`, value: String(fc.draft.aAmount) }] }),
      parse: number(100_000),
    },
    {
      key: "waterL",
      ask: (fc) => {
        const last = lastTank(fc);
        return { text: "💧 Air dalam tangki berapa liter? (Water in tank, litres)", options: last?.type === "tank_mix" ? [{ label: `Macam dulu: ${last.tankMix.waterL} L`, value: String(last.tankMix.waterL) }] : [] };
      },
      parse: number(100_000),
    },
    { key: "ec", ask: () => ({ text: "⚡ Bacaan EC (mS/cm)? Taip nombor atau skip.", options: [skip] }), parse: optionalNumber(20) },
    { key: "ph", ask: () => ({ text: "🧪 Bacaan pH? Taip nombor atau skip.", options: [skip] }), parse: optionalNumber(14) },
    whenStep,
    batchStep,
  ],
  summary: (fc) => {
    const d = fc.draft as { abUnit: string; aAmount: number; bAmount: number; waterL: number; ec?: number; ph?: number };
    return lines(
      "🪣 TANK MIX AB — semak dulu: (check first)",
      `📅 ${whenLabel(fc)}`,
      `🅰️ ${formatQty(d.aAmount, d.abUnit)}  🅱️ ${formatQty(d.bAmount, d.abUnit)}`,
      `💧 ${formatQty(d.waterL, "L")} air`,
      (d.ec !== undefined || d.ph !== undefined) && `⚡ EC ${d.ec ?? "?"}   🧪 pH ${d.ph ?? "?"}`,
      batchLabel(fc) && `🌶️ Batch: ${batchLabel(fc)}`,
      "(Baja tambahan boleh diisi di dashboard. Extra fertilizer can be added on the dashboard.)",
    );
  },
  build: (fc) => {
    const d = fc.draft as { abUnit: TankMixDetails["abUnit"]; aAmount: number; bAmount: number; waterL: number; ec?: number; ph?: number };
    return { ...base(fc), type: "tank_mix", tankMix: { aAmount: d.aAmount, bAmount: d.bAmount, abUnit: d.abUnit, waterL: d.waterL, ec: d.ec, ph: d.ph, additives: [] } };
  },
};

// ── Other baja ─────────────────────────────────────────────────────────────

const fertilizer: Flow = {
  id: "fertilizer",
  title: "🌱 Other baja",
  steps: [
    productStep("fertilizer", "🌱 Baja apa? (Which fertilizer?)"),
    {
      key: "quantity",
      ask: (fc) => ({ text: `⚖️ Berapa ${productOf(fc)?.unit ?? ""}? (Quantity)` }),
      parse: number(1_000_000),
    },
    {
      key: "method",
      ask: () => ({ text: "🤲 Cara? (How was it applied?)", options: (Object.keys(FERT_METHOD_LABEL) as FertilizerDetails["method"][]).map((m) => ({ label: FERT_METHOD_LABEL[m], value: m })) }),
      parse: (t) => (t in FERT_METHOD_LABEL ? { value: t } : { error: "Pilih butang. (Pick a button.)" }),
    },
    whenStep,
    batchStep,
  ],
  summary: (fc) => {
    const p = productOf(fc)!;
    const d = fc.draft as { quantity: number; method: FertilizerDetails["method"] };
    return lines(
      "🌱 BAJA — semak dulu: (check first)",
      `📅 ${whenLabel(fc)}`,
      `📦 ${p.name} — ${formatQty(d.quantity, p.unit)}`,
      `🤲 ${FERT_METHOD_LABEL[d.method]}`,
      batchLabel(fc) && `🌶️ Batch: ${batchLabel(fc)}`,
    );
  },
  build: (fc) => {
    const p = productOf(fc)!;
    const d = fc.draft as { quantity: number; method: FertilizerDetails["method"] };
    return { ...base(fc), type: "fertilizer", fertilizer: { productId: p.id, quantity: d.quantity, unit: p.unit, method: d.method } };
  },
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export const FLOWS: Record<Flow["id"], Flow> = { spray, tank_mix: tankMix, fertilizer };
