import { addDays, atTime } from "./dates";
import type {
  Activity,
  FarmData,
  FertilizerDetails,
  Photo,
  PlantStage,
  Problem,
  ProblemUpdate,
  Product,
  SprayDetails,
} from "./types";

// Demo farm: ~5 months of a chili crop, anchored to "today" so the
// dashboard always looks current. Replaced by Supabase in Phase 2.

const DAYS = 150;
const PLANTED_DAYS_AGO = 165;
const TANK_L = 16;

export const PRODUCTS: Product[] = [
  { id: "movento", name: "Movento 100SC", category: "pesticide", subtype: "Insecticide", activeIngredient: "Spirotetramat", unit: "ml", packSize: 250, packPriceRm: 98, phiDays: 7 },
  { id: "abamectin", name: "Abamectin 1.8EC", category: "pesticide", subtype: "Miticide", activeIngredient: "Abamectin", unit: "ml", packSize: 500, packPriceRm: 32, phiDays: 7 },
  { id: "imidacloprid", name: "Imidacloprid 200SL", category: "pesticide", subtype: "Insecticide", activeIngredient: "Imidacloprid", unit: "ml", packSize: 500, packPriceRm: 45, phiDays: 14 },
  { id: "neem", name: "Neem Oil", category: "pesticide", subtype: "Insecticide (organic)", activeIngredient: "Azadirachtin", unit: "ml", packSize: 1000, packPriceRm: 40, phiDays: 0 },
  { id: "mancozeb", name: "Mancozeb 80WP", category: "pesticide", subtype: "Fungicide", activeIngredient: "Mancozeb", unit: "g", packSize: 1000, packPriceRm: 26, phiDays: 7 },
  { id: "copper", name: "Copper Hydroxide 77WP", category: "pesticide", subtype: "Fungicide / bactericide", activeIngredient: "Copper hydroxide", unit: "g", packSize: 500, packPriceRm: 38, phiDays: 3 },
  { id: "npk15", name: "NPK 15-15-15", category: "fertilizer", subtype: "Granular", npk: "15-15-15", unit: "kg", packSize: 50, packPriceRm: 165 },
  { id: "npk12", name: "NPK 12-12-17+2MgO (Blue)", category: "fertilizer", subtype: "Granular", npk: "12-12-17", unit: "kg", packSize: 50, packPriceRm: 185 },
  { id: "urea", name: "Urea 46%", category: "fertilizer", subtype: "Granular", npk: "46-0-0", unit: "kg", packSize: 50, packPriceRm: 140 },
  { id: "canitrate", name: "Calcium Nitrate", category: "fertilizer", subtype: "Fertigation", npk: "15.5-0-0 + 19% Ca", unit: "kg", packSize: 25, packPriceRm: 98 },
  { id: "manure", name: "Baja Tahi Ayam", category: "fertilizer", subtype: "Organic", unit: "karung", packSize: 1, packPriceRm: 9, notes: "Chicken manure, ~25 kg per karung" },
  { id: "seaweed", name: "Foliar Seaweed Extract", category: "fertilizer", subtype: "Foliar", unit: "ml", packSize: 1000, packPriceRm: 45 },
];

const product = (id: string) => PRODUCTS.find((p) => p.id === id)!;

// Deterministic per-day randomness so a given "N days ago" always looks the same.
function rand(seed: number): number {
  let t = (seed * 2654435761) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function stageAt(daysAgo: number): PlantStage {
  const age = PLANTED_DAYS_AGO - daysAgo;
  if (age < 45) return "vegetative";
  if (age < 75) return "flowering";
  if (age < 95) return "fruiting";
  return "harvest";
}

const photo = (id: string, subject: Photo["subject"], caption: string): Photo => ({
  id,
  subject,
  caption,
});

type Builder = { today: string; activities: Activity[] };

function addSpray(
  b: Builder,
  daysAgo: number,
  productId: string,
  dosePerTank: number,
  tanks: number,
  target: string,
  extra: { time?: string; weather?: string; problemId?: string; notes?: string; raw?: string; photos?: Photo[] } = {},
) {
  const p = product(productId);
  const key = addDays(b.today, -daysAgo);
  const totalQty = dosePerTank * tanks;
  const spray: SprayDetails = {
    productId,
    dosePerTank,
    doseUnit: p.unit,
    tankSizeL: TANK_L,
    tanks,
    totalQty,
    target,
    weather: extra.weather ?? (rand(daysAgo * 7) < 0.7 ? "Sunny" : "Cloudy"),
    costRm: round2((totalQty / p.packSize) * p.packPriceRm),
    safeHarvestOn: addDays(key, p.phiDays ?? 0),
  };
  b.activities.push({
    id: `spray-${daysAgo}-${productId}`,
    type: "spray",
    occurredAt: atTime(key, extra.time ?? "17:30"),
    problemId: extra.problemId,
    notes: extra.notes,
    rawMessage:
      extra.raw ??
      `sembur ${p.name.split(" ")[0].toLowerCase()} ${dosePerTank}${p.unit} satu tong, ${tanks} tong. ${target.toLowerCase()}`,
    photos: extra.photos ?? [],
    spray,
  });
}

function addFertilizer(
  b: Builder,
  daysAgo: number,
  productId: string,
  quantity: number,
  method: FertilizerDetails["method"],
  extra: { problemId?: string; notes?: string; raw?: string; photos?: Photo[] } = {},
) {
  const p = product(productId);
  const key = addDays(b.today, -daysAgo);
  b.activities.push({
    id: `fert-${daysAgo}-${productId}`,
    type: "fertilizer",
    occurredAt: atTime(key, "08:30"),
    problemId: extra.problemId,
    notes: extra.notes,
    rawMessage:
      extra.raw ??
      `bagi baja ${p.name.toLowerCase()} ${quantity} ${p.unit}, ${method}`,
    photos: extra.photos ?? [],
    fertilizer: {
      productId,
      quantity,
      unit: p.unit,
      method,
      plantStage: stageAt(daysAgo),
      costRm: round2((quantity / p.packSize) * p.packPriceRm),
    },
  });
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function routine(b: Builder) {
  for (let k = DAYS; k >= 0; k--) {
    const key = addDays(b.today, -k);
    const r = rand(k + 1);

    // Watering: skipped on heavy-rain days, shorter on light rain.
    const heavyRain = r < 0.12;
    const lightRain = !heavyRain && r < 0.27;
    if (!heavyRain) {
      const manual = k % 11 === 5;
      const minutes = lightRain ? 20 : 40 + Math.round(rand(k + 99) * 4) * 5;
      b.activities.push({
        id: `water-${k}`,
        type: "water",
        occurredAt: atTime(key, manual ? "18:00" : "07:15"),
        rawMessage: manual
          ? `siram manual guna hose ${minutes} minit, pam drip rosak`
          : lightRain
            ? `hujan sikit pagi, drip ${minutes} min je`
            : k % 3 === 0
              ? `siram drip ${minutes} minit`
              : undefined,
        notes: manual ? "Drip pump tersumbat (clogged), cleaned filter in the evening" : undefined,
        photos: [],
        water: {
          method: manual ? "hose" : "drip",
          durationMin: minutes,
          volumeL: manual ? undefined : minutes * 30,
          rained: lightRain,
          rainNote: lightRain ? "Hujan renyai pagi (light morning rain)" : undefined,
        },
      });
    }

    const stage = stageAt(k);

    if (k % 10 === 4) {
      const late = stage !== "vegetative";
      addFertilizer(b, k, late ? "npk12" : "npk15", 25, "tabur");
    }
    if (k % 14 === 9) addFertilizer(b, k, "seaweed", 200, "spray");
    if ((stage === "fruiting" || stage === "harvest") && k % 14 === 2 && k !== 72 && k !== 79)
      addFertilizer(b, k, "canitrate", 8, "fertigation");
    if (k === 150 || k === 90)
      addFertilizer(b, k, "manure", 20, "tabur", {
        notes: "Tabur keliling pangkal pokok (spread around the base)",
      });

    // Preventive fungicide round every 12 days.
    if (k % 12 === 6 && ![54, 42].includes(k))
      addSpray(b, k, "mancozeb", 40, 10, "Pencegahan kulat (preventive)", {
        time: "07:45",
        raw: `spray mancozeb 40g satu tong, 10 tong. pencegahan`,
      });
  }
}

function update(
  today: string,
  daysAgo: number,
  kind: ProblemUpdate["kind"],
  body: string,
  photos: Photo[] = [],
  time = "18:30",
): ProblemUpdate {
  return {
    id: `u-${daysAgo}-${body.length}`,
    kind,
    body,
    occurredAt: atTime(addDays(today, -daysAgo), time),
    photos,
  };
}

function problems(b: Builder): Problem[] {
  const t = b.today;
  const d = (k: number) => addDays(t, -k);
  const thripsTags = ["thrips", "daun kerinting", "leaf curl", "pucuk"];

  // Linked actions logged against each problem.
  addSpray(b, 140, "movento", 12, 12, "Thrips", { problemId: "thrips-1", photos: [photo("ph-t1-s", "pest", "Thrips bawah daun pucuk")] });
  addSpray(b, 136, "abamectin", 15, 12, "Thrips + hama", { problemId: "thrips-1" });
  addSpray(b, 133, "movento", 12, 12, "Thrips (round 2)", { problemId: "thrips-1", raw: "spray movento kali kedua, 12ml satu tong, 12 tong. petang 6pm" });
  addFertilizer(b, 117, "urea", 5, "siram", { problemId: "yellow-1", raw: "bagi urea 5kg cair dalam air, siram keliling pokok sebab daun bawah kuning" });
  addFertilizer(b, 79, "canitrate", 10, "siram", { problemId: "ber-1" });
  addFertilizer(b, 72, "canitrate", 10, "siram", { problemId: "ber-1" });
  addSpray(b, 54, "mancozeb", 50, 12, "Buah reput (antraknos)", { problemId: "anthrac-1", weather: "Cloudy" });
  addSpray(b, 50, "copper", 30, 12, "Buah reput (antraknos)", { problemId: "anthrac-1", weather: "Rain after spray", notes: "Hujan 2 jam lepas spray — mungkin kena ulang (rained 2 hours after spraying, may need to repeat)" });
  addSpray(b, 45, "mancozeb", 50, 12, "Buah reput (antraknos)", { problemId: "anthrac-1" });
  addSpray(b, 34, "copper", 40, 4, "Layu — siram pangkal (soil drench)", { problemId: "wilt-1", raw: "copper 40g satu tong, 4 tong siram pangkal pokok sebelah yang layu" });
  addSpray(b, 8, "neem", 40, 10, "Kutu putih (whitefly)", { problemId: "whitefly-1" });
  addSpray(b, 2, "movento", 12, 12, "Thrips", { problemId: "thrips-2", raw: "sembur movento 12ml satu tong 12 tong, thrips datang balik", photos: [photo("ph-t2-s", "field", "Spray baris tengah, petang")] });

  return [
    {
      id: "thrips-2",
      title: "Daun kerinting lagi (thrips)",
      symptoms: "Pucuk daun kerinting dan mengecut kat baris tengah. Thrips kecik bawah daun pucuk.",
      affectedPart: "leaf",
      severity: "high",
      suspectedCause: "Thrips",
      causeKind: "pest",
      tags: thripsTags,
      status: "open",
      foundOn: d(3),
      photos: [photo("ph-t2-a", "leaf", "Pucuk kerinting baris tengah"), photo("ph-t2-b", "pest", "Thrips bawah daun")],
      updates: [
        update(t, 3, "followup", "Pucuk kerinting kat baris tengah. Sama macam kali pertama dulu."),
        update(t, 1, "followup", "Dah spray Movento semalam petang. Tengok lagi 3 hari."),
      ],
    },
    {
      id: "whitefly-1",
      title: "Kutu putih bawah daun",
      symptoms: "Serangga putih kecik terbang bila goyang pokok. Daun sikit melekit.",
      affectedPart: "leaf",
      severity: "medium",
      suspectedCause: "Whitefly (kutu putih)",
      causeKind: "pest",
      tags: ["kutu putih", "whitefly", "daun melekit"],
      status: "open",
      foundOn: d(9),
      photos: [photo("ph-wf-a", "pest", "Kutu putih bawah daun")],
      updates: [
        update(t, 9, "followup", "Nampak kutu putih kat 2 baris tepi longkang."),
        update(t, 6, "followup", "Lepas neem oil kurang sikit, tapi masih ada."),
      ],
    },
    {
      id: "wilt-1",
      title: "Pokok layu tiba-tiba",
      symptoms: "Pokok layu waktu tengah hari, pagi segar balik. Lepas 3 hari terus layu tak bangun.",
      affectedPart: "whole plant",
      severity: "high",
      suspectedCause: "Layu bakteria (bacterial wilt) — suspected",
      causeKind: "disease",
      tags: ["layu", "wilt", "pokok mati", "bakteria"],
      status: "resolved",
      outcome: "not_solved",
      lesson: "Tiada ubat untuk layu bakteria. Cabut cepat dan buang jauh. Jangan tanam cili/tomato kat spot sama musim depan.",
      foundOn: d(35),
      resolvedOn: d(25),
      photos: [photo("ph-w-a", "plant", "6 pokok layu baris 4")],
      updates: [
        update(t, 35, "followup", "6 pokok layu siang hari, pagi segar balik."),
        update(t, 34, "action", "Cabut 6 pokok yang teruk, buang jauh dari kebun."),
        update(t, 30, "followup", "2 pokok lagi sebelah layu.", [photo("ph-w-b", "plant", "Pokok sebelah mula layu")]),
        update(t, 25, "action", "Cabut lagi 2 pokok. Tabur kapur kat lubang."),
      ],
    },
    {
      id: "anthrac-1",
      title: "Buah reput lepas hujan",
      symptoms: "Bintik hitam lekuk kat buah, lama-lama reput. Banyak lepas seminggu hujan.",
      affectedPart: "fruit",
      severity: "high",
      suspectedCause: "Antraknos (kulat / fungus)",
      causeKind: "disease",
      tags: ["buah reput", "kulat", "antraknos", "hujan", "fungus"],
      status: "resolved",
      outcome: "partly",
      lesson: "Sebelum musim hujan, spray fungicide setiap 7 hari. Betulkan longkang baris belakang sebab air bertakung.",
      foundOn: d(55),
      resolvedOn: d(40),
      photos: [photo("ph-a-a", "fruit", "Buah bintik hitam"), photo("ph-a-b", "fruit", "Buah reput atas pokok")],
      updates: [
        update(t, 54, "action", "Kutip & buang semua buah reput, bakar. Jangan tinggal kat tanah."),
        update(t, 47, "followup", "Masih ada sikit buah reput kat baris belakang (tempat air bertakung)."),
        update(t, 40, "followup", "Kurang banyak, tapi baris belakang masih ada sikit.", [photo("ph-a-c", "fruit", "Buah baru lebih elok")]),
      ],
    },
    {
      id: "ber-1",
      title: "Hujung buah hitam",
      symptoms: "Hujung buah jadi hitam dan kering, macam terbakar. Buah muda pun kena.",
      affectedPart: "fruit",
      severity: "medium",
      suspectedCause: "Kurang kalsium + siram tak sekata (blossom end rot)",
      causeKind: "nutrient",
      tags: ["buah", "hujung hitam", "blossom end rot", "kalsium"],
      status: "resolved",
      outcome: "solved",
      lesson: "Bila mula berbuah, bagi Calcium Nitrate setiap 2 minggu. Siram setiap hari, jangan biar tanah kering.",
      foundOn: d(80),
      resolvedOn: d(65),
      photos: [photo("ph-b-a", "fruit", "Hujung buah hitam")],
      updates: [
        update(t, 79, "action", "Buang buah yang rosak. Siram setiap hari, jangan biar tanah kering."),
        update(t, 66, "followup", "Buah baru elok, tak nampak hitam dah.", [photo("ph-b-b", "fruit", "Buah baru sihat")]),
      ],
    },
    {
      id: "yellow-1",
      title: "Daun bawah kuning",
      symptoms: "Daun tua bawah jadi kuning pucat, daun atas masih hijau. Pokok nampak lambat besar.",
      affectedPart: "leaf",
      severity: "medium",
      suspectedCause: "Kurang nitrogen (N)",
      causeKind: "nutrient",
      tags: ["daun kuning", "nitrogen", "yellow leaves"],
      status: "resolved",
      outcome: "solved",
      lesson: "Masa vegetative jangan lambat baja. Ikut jadual setiap 10 hari.",
      foundOn: d(118),
      resolvedOn: d(105),
      photos: [photo("ph-y-a", "leaf", "Daun bawah kuning")],
      updates: [
        update(t, 117, "action", "Bagi urea 5kg cair, siram keliling pokok."),
        update(t, 108, "followup", "Daun baru hijau gelap, kuning tak merebak.", [photo("ph-y-b", "leaf", "Daun baru hijau")]),
      ],
    },
    {
      id: "thrips-1",
      title: "Daun kerinting (thrips)",
      symptoms: "Daun pucuk kerinting ke atas, ada kesan perak. Bila tengok bawah daun ada thrips kecik banyak.",
      affectedPart: "leaf",
      severity: "high",
      suspectedCause: "Thrips",
      causeKind: "pest",
      tags: thripsTags,
      status: "resolved",
      outcome: "solved",
      lesson: "Check bawah daun pucuk setiap 3 hari. Spray waktu petang (lepas 5pm), ulang selepas 7 hari. Movento + Abamectin berkesan.",
      foundOn: d(140),
      resolvedOn: d(126),
      photos: [photo("ph-t1-a", "leaf", "Pucuk kerinting 3 baris depan"), photo("ph-t1-b", "pest", "Thrips bawah daun")],
      updates: [
        update(t, 140, "followup", "Jumpa daun pucuk kerinting kat 3 baris depan. Bawah daun ada thrips banyak."),
        update(t, 137, "followup", "Masih ada thrips tapi kurang."),
        update(t, 133, "action", "Buang pucuk yang teruk kerinting."),
        update(t, 128, "followup", "Pucuk baru dah keluar elok, thrips tak nampak dah.", [photo("ph-t1-c", "leaf", "Pucuk baru elok")]),
      ],
    },
  ];
}

export function buildDemoData(today: string): FarmData {
  const b: Builder = { today, activities: [] };
  routine(b);
  const probs = problems(b);
  b.activities.sort((a, z) => z.occurredAt.localeCompare(a.occurredAt));
  return { today, products: PRODUCTS, activities: b.activities, problems: probs };
}
