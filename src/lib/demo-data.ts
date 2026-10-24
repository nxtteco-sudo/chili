import { addDays, atTime } from "./dates";
import type {
  Activity,
  Batch,
  FarmData,
  FertilizerDetails,
  Photo,
  Problem,
  ProblemUpdate,
  Product,
  TankAdditive,
  Variety,
} from "./types";

// Demo farm anchored to "today": three planting batches, an AB tank mixed
// every 5 days, sprays and problems. Replaced by real data in Phase 2.

const DAYS = 150;
const TANK_L = 16;

export const PRODUCTS: Product[] = [
  { id: "movento", name: "Movento 100SC", category: "pesticide", subtype: "Insecticide", activeIngredient: "Spirotetramat", unit: "ml", phiDays: 7 },
  { id: "abamectin", name: "Abamectin 1.8EC", category: "pesticide", subtype: "Miticide", activeIngredient: "Abamectin", unit: "ml", phiDays: 7 },
  { id: "imidacloprid", name: "Imidacloprid 200SL", category: "pesticide", subtype: "Insecticide", activeIngredient: "Imidacloprid", unit: "ml", phiDays: 14 },
  { id: "neem", name: "Neem Oil", category: "pesticide", subtype: "Insecticide (organic)", activeIngredient: "Azadirachtin", unit: "ml", phiDays: 0 },
  { id: "mancozeb", name: "Mancozeb 80WP", category: "pesticide", subtype: "Fungicide", activeIngredient: "Mancozeb", unit: "g", phiDays: 7 },
  { id: "copper", name: "Copper Hydroxide 77WP", category: "pesticide", subtype: "Fungicide / bactericide", activeIngredient: "Copper hydroxide", unit: "g", phiDays: 3 },
  { id: "canitrate", name: "Calcium Nitrate", category: "fertilizer", subtype: "Fertigation", npk: "15.5-0-0 + 19% Ca", unit: "kg" },
  { id: "mkp", name: "MKP (Monopotassium Phosphate)", category: "fertilizer", subtype: "Fertigation", npk: "0-52-34", unit: "kg" },
  { id: "epsom", name: "Magnesium Sulphate (Epsom)", category: "fertilizer", subtype: "Fertigation", unit: "kg" },
  { id: "seaweed", name: "Foliar Seaweed Extract", category: "fertilizer", subtype: "Foliar", unit: "ml" },
  { id: "manure", name: "Baja Tahi Ayam", category: "fertilizer", subtype: "Organic", unit: "karung", notes: "Chicken manure, ~25 kg per karung" },
];

export const VARIETIES: Variety[] = [
  { id: "kulai", name: "Kulai 461", daysSowToTransplant: 30, daysTransplantToFlower: 35, daysTransplantToHarvest: 80, harvestSeasonDays: 120 },
  { id: "centil", name: "Centil (cili padi)", notes: "Baru cuba. Belum ada rekod hari." },
];

const product = (id: string) => PRODUCTS.find((p) => p.id === id)!;

// Deterministic per-day randomness so a given "N days ago" always looks the same.
function rand(seed: number): number {
  let t = (seed * 2654435761) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const photo = (id: string, subject: Photo["subject"], caption: string): Photo => ({ id, subject, caption });

function batches(today: string): Batch[] {
  const d = (k: number) => addDays(today, -k);
  return [
    {
      id: "batch-okt",
      name: "Batch Okt 2026",
      varietyId: "centil",
      sownOn: d(12),
      seedsCount: 500,
      notes: "Cuba cili padi untuk pasar malam.",
      photos: [photo("ph-bo-a", "plant", "Anak benih dalam tray")],
    },
    {
      id: "batch-ogos",
      name: "Batch Ogos 2026",
      varietyId: "kulai",
      sownOn: d(78),
      seedsCount: 1100,
      transplantedOn: d(47),
      polybagsCount: 1000,
      firstFlowerOn: d(10),
      photos: [photo("ph-bg-a", "field", "Polibeg baris baru")],
    },
    {
      id: "batch-mei",
      name: "Batch Mei 2026",
      varietyId: "kulai",
      sownOn: d(200),
      seedsCount: 1200,
      transplantedOn: d(170),
      polybagsCount: 1000,
      firstFlowerOn: d(133),
      firstHarvestOn: d(88),
      endedOn: d(6),
      notes: "Batch pertama dengan AB. Hasil baik lepas masalah kalsium selesai.",
      photos: [photo("ph-bm-a", "fruit", "Tuai pertama")],
    },
  ];
}

// Transplanted and not ended on that day; nursery trays are watered by hand.
function activeOn(list: Batch[], key: string) {
  return list
    .filter((b) => b.transplantedOn && b.transplantedOn <= key && (!b.endedOn || b.endedOn > key))
    .map((b) => b.id);
}

type Builder = { today: string; batches: Batch[]; activities: Activity[] };

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
  b.activities.push({
    id: `spray-${daysAgo}-${productId}`,
    type: "spray",
    occurredAt: atTime(key, extra.time ?? "17:30"),
    batchIds: activeOn(b.batches, key),
    problemId: extra.problemId,
    notes: extra.notes,
    rawMessage:
      extra.raw ??
      `sembur ${p.name.split(" ")[0].toLowerCase()} ${dosePerTank}${p.unit} satu tong, ${tanks} tong. ${target.toLowerCase()}`,
    photos: extra.photos ?? [],
    spray: {
      productId,
      dosePerTank,
      doseUnit: p.unit,
      tankSizeL: TANK_L,
      tanks,
      totalQty: dosePerTank * tanks,
      target,
      weather: extra.weather ?? (rand(daysAgo * 7) < 0.7 ? "Sunny" : "Cloudy"),
      safeHarvestOn: addDays(key, p.phiDays ?? 0),
    },
  });
}

function addTankMix(
  b: Builder,
  daysAgo: number,
  ab: number,
  ec: number,
  ph: number,
  additives: TankAdditive[] = [],
  extra: { problemId?: string; notes?: string; raw?: string } = {},
) {
  const key = addDays(b.today, -daysAgo);
  const extraText = additives.map((a) => ` + ${product(a.productId).name.split(" ")[0].toLowerCase()} ${a.quantity}${a.unit}`).join("");
  b.activities.push({
    id: `tank-${daysAgo}`,
    type: "tank_mix",
    occurredAt: atTime(key, "07:30"),
    batchIds: activeOn(b.batches, key),
    problemId: extra.problemId,
    notes: extra.notes,
    rawMessage: extra.raw ?? `campur tangki baru A ${ab}L B ${ab}L air 1000L${extraText}. EC ${ec} pH ${ph}`,
    photos: [],
    tankMix: { aAmount: ab, bAmount: ab, abUnit: "L", waterL: 1000, ec, ph, additives },
  });
}

function addFertilizer(
  b: Builder,
  daysAgo: number,
  productId: string,
  quantity: number,
  method: FertilizerDetails["method"],
  extra: { problemId?: string; notes?: string; raw?: string } = {},
) {
  const p = product(productId);
  const key = addDays(b.today, -daysAgo);
  b.activities.push({
    id: `fert-${daysAgo}-${productId}`,
    type: "fertilizer",
    occurredAt: atTime(key, "08:30"),
    batchIds: activeOn(b.batches, key),
    problemId: extra.problemId,
    notes: extra.notes,
    rawMessage: extra.raw ?? `bagi ${p.name.toLowerCase()} ${quantity} ${p.unit}, ${method}`,
    photos: [],
    fertilizer: { productId, quantity, unit: p.unit, method },
  });
}

// Problem fixes are logged separately below, so routine tanks skip those days.
const PROBLEM_TANK_DAYS = new Set([120, 115, 80, 75]);

function routine(b: Builder) {
  for (let k = DAYS; k >= 0; k--) {
    // A 1000 L tank lasts about 5 days. AB strength rises with the crop:
    // ~4 L each while growing, 5 L flowering, 6 L harvesting.
    if (k % 5 === 0 && !PROBLEM_TANK_DAYS.has(k)) {
      const ab = k > 130 ? 4 : k > 88 ? 5 : k > 6 ? 6 : 5;
      const ec = Math.round((ab * 0.4 + (rand(k + 3) - 0.5) * 0.2) * 10) / 10;
      const ph = Math.round((6.05 + (rand(k + 5) - 0.5) * 0.4) * 10) / 10;
      const harvesting = k <= 88 && k > 6;
      const additives: TankAdditive[] = harvesting && k % 10 === 0 ? [{ productId: "canitrate", quantity: 1.5, unit: "kg" }] : [];
      if (k <= 133 && k > 88 && k % 10 === 5) additives.push({ productId: "mkp", quantity: 1, unit: "kg" });
      addTankMix(b, k, ab, ec, ph, additives);
    }
    if (k % 14 === 9) addFertilizer(b, k, "seaweed", 200, "foliar");
    if (k % 12 === 6 && ![54, 42].includes(k))
      addSpray(b, k, "mancozeb", 40, 10, "Pencegahan kulat (preventive)", {
        time: "07:45",
        raw: "spray mancozeb 40g satu tong, 10 tong. pencegahan",
      });
  }
  addFertilizer(b, 47, "manure", 20, "tabur", {
    notes: "Masa pindah ke polibeg, segenggam setiap polibeg",
  });
}

function update(today: string, daysAgo: number, kind: ProblemUpdate["kind"], body: string, photos: Photo[] = [], time = "18:30"): ProblemUpdate {
  return { id: `u-${daysAgo}-${body.length}`, kind, body, occurredAt: atTime(addDays(today, -daysAgo), time), photos };
}

function problems(b: Builder): Problem[] {
  const t = b.today;
  const d = (k: number) => addDays(t, -k);
  const thripsTags = ["thrips", "daun kerinting", "leaf curl", "pucuk"];

  addSpray(b, 140, "movento", 12, 12, "Thrips", { problemId: "thrips-1", photos: [photo("ph-t1-s", "pest", "Thrips bawah daun pucuk")] });
  addSpray(b, 136, "abamectin", 15, 12, "Thrips + hama", { problemId: "thrips-1" });
  addSpray(b, 133, "movento", 12, 12, "Thrips (round 2)", { problemId: "thrips-1", raw: "spray movento kali kedua, 12ml satu tong, 12 tong. petang 6pm" });
  // EC drifted low before the yellowing; the fix was a stronger tank.
  addTankMix(b, 120, 3, 1.2, 6.1);
  addTankMix(b, 115, 4.5, 1.9, 6.0, [{ productId: "epsom", quantity: 1, unit: "kg" }], { problemId: "yellow-1", raw: "tangki baru, naikkan AB 4.5L. tambah epsom 1kg. EC 1.9 pH 6.0" });
  // pH crept up and calcium ran short when fruiting started.
  addTankMix(b, 85, 5, 2.0, 6.9);
  addTankMix(b, 80, 5, 2.1, 6.0, [{ productId: "canitrate", quantity: 2, unit: "kg" }], { problemId: "ber-1", notes: "Turunkan pH dengan asid, tambah Calcium Nitrate" });
  addTankMix(b, 75, 5, 2.2, 6.1, [{ productId: "canitrate", quantity: 2, unit: "kg" }], { problemId: "ber-1" });
  addSpray(b, 54, "mancozeb", 50, 12, "Buah reput (antraknos)", { problemId: "anthrac-1", weather: "Cloudy" });
  addSpray(b, 50, "copper", 30, 12, "Buah reput (antraknos)", { problemId: "anthrac-1", weather: "Rain after spray", notes: "Hujan 2 jam lepas spray — mungkin kena ulang (rained 2 hours after spraying, may need to repeat)" });
  addSpray(b, 45, "mancozeb", 50, 12, "Buah reput (antraknos)", { problemId: "anthrac-1" });
  addSpray(b, 34, "copper", 40, 4, "Layu — siram pangkal (soil drench)", { problemId: "wilt-1", raw: "copper 40g satu tong, 4 tong siram pangkal pokok sebelah yang layu" });
  addSpray(b, 8, "neem", 40, 10, "Kutu putih (whitefly)", { problemId: "whitefly-1" });
  addSpray(b, 2, "movento", 12, 12, "Thrips", { problemId: "thrips-2", raw: "sembur movento 12ml satu tong 12 tong, thrips datang balik", photos: [photo("ph-t2-s", "field", "Spray baris tengah, petang")] });

  return [
    {
      id: "thrips-2", title: "Daun kerinting lagi (thrips)", batchId: "batch-ogos",
      symptoms: "Pucuk daun kerinting dan mengecut kat baris tengah. Thrips kecik bawah daun pucuk.",
      affectedPart: "leaf", severity: "high", suspectedCause: "Thrips", causeKind: "pest", tags: thripsTags,
      status: "open", foundOn: d(3),
      photos: [photo("ph-t2-a", "leaf", "Pucuk kerinting baris tengah"), photo("ph-t2-b", "pest", "Thrips bawah daun")],
      updates: [
        update(t, 3, "followup", "Pucuk kerinting kat baris tengah. Sama macam kali pertama dulu."),
        update(t, 1, "followup", "Dah spray Movento semalam petang. Tengok lagi 3 hari."),
      ],
    },
    {
      id: "whitefly-1", title: "Kutu putih bawah daun", batchId: "batch-ogos",
      symptoms: "Serangga putih kecik terbang bila goyang pokok. Daun sikit melekit.",
      affectedPart: "leaf", severity: "medium", suspectedCause: "Whitefly (kutu putih)", causeKind: "pest",
      tags: ["kutu putih", "whitefly", "daun melekit"], status: "open", foundOn: d(9),
      photos: [photo("ph-wf-a", "pest", "Kutu putih bawah daun")],
      updates: [
        update(t, 9, "followup", "Nampak kutu putih kat 2 baris tepi longkang."),
        update(t, 6, "followup", "Lepas neem oil kurang sikit, tapi masih ada."),
      ],
    },
    {
      id: "wilt-1", title: "Pokok layu tiba-tiba", batchId: "batch-ogos",
      symptoms: "Pokok layu waktu tengah hari, pagi segar balik. Lepas 3 hari terus layu tak bangun.",
      affectedPart: "whole plant", severity: "high", suspectedCause: "Layu bakteria (bacterial wilt) — suspected", causeKind: "disease",
      tags: ["layu", "wilt", "pokok mati", "bakteria"], status: "resolved", outcome: "not_solved",
      lesson: "Tiada ubat untuk layu bakteria. Cabut cepat dan buang jauh. Jangan guna semula media polibeg yang kena.",
      foundOn: d(35), resolvedOn: d(25),
      photos: [photo("ph-w-a", "plant", "6 pokok layu baris 4")],
      updates: [
        update(t, 35, "followup", "6 pokok layu siang hari, pagi segar balik."),
        update(t, 34, "action", "Cabut 6 pokok yang teruk, buang polibeg jauh dari kebun."),
        update(t, 30, "followup", "2 pokok lagi sebelah layu.", [photo("ph-w-b", "plant", "Pokok sebelah mula layu")]),
        update(t, 25, "action", "Cabut lagi 2 pokok. Asingkan polibeg sebelah."),
      ],
    },
    {
      id: "anthrac-1", title: "Buah reput lepas hujan", batchId: "batch-mei",
      symptoms: "Bintik hitam lekuk kat buah, lama-lama reput. Banyak lepas seminggu hujan.",
      affectedPart: "fruit", severity: "high", suspectedCause: "Antraknos (kulat / fungus)", causeKind: "disease",
      tags: ["buah reput", "kulat", "antraknos", "hujan", "fungus"], status: "resolved", outcome: "partly",
      lesson: "Sebelum musim hujan, spray fungicide setiap 7 hari. Betulkan longkang baris belakang sebab air bertakung.",
      foundOn: d(55), resolvedOn: d(40),
      photos: [photo("ph-a-a", "fruit", "Buah bintik hitam"), photo("ph-a-b", "fruit", "Buah reput atas pokok")],
      updates: [
        update(t, 54, "action", "Kutip & buang semua buah reput, bakar. Jangan tinggal kat tanah."),
        update(t, 47, "followup", "Masih ada sikit buah reput kat baris belakang (tempat air bertakung)."),
        update(t, 40, "followup", "Kurang banyak, tapi baris belakang masih ada sikit.", [photo("ph-a-c", "fruit", "Buah baru lebih elok")]),
      ],
    },
    {
      id: "ber-1", title: "Hujung buah hitam", batchId: "batch-mei",
      symptoms: "Hujung buah jadi hitam dan kering, macam terbakar. Buah muda pun kena.",
      affectedPart: "fruit", severity: "medium", suspectedCause: "Kurang kalsium, pH tangki terlalu tinggi (blossom end rot)", causeKind: "nutrient",
      tags: ["buah", "hujung hitam", "blossom end rot", "kalsium", "ph"], status: "resolved", outcome: "solved",
      lesson: "pH tangki mesti 5.8–6.3. Bila mula berbuah, tambah Calcium Nitrate dalam tangki AB.",
      foundOn: d(80), resolvedOn: d(65),
      photos: [photo("ph-b-a", "fruit", "Hujung buah hitam")],
      updates: [
        update(t, 80, "followup", "Check tangki semalam: pH 6.9, tinggi."),
        update(t, 79, "action", "Buang buah yang rosak."),
        update(t, 66, "followup", "Buah baru elok, tak nampak hitam dah.", [photo("ph-b-b", "fruit", "Buah baru sihat")]),
      ],
    },
    {
      id: "yellow-1", title: "Daun bawah kuning", batchId: "batch-mei",
      symptoms: "Daun tua bawah jadi kuning pucat, daun atas masih hijau. Pokok nampak lambat besar.",
      affectedPart: "leaf", severity: "medium", suspectedCause: "EC tangki terlalu rendah (kurang baja)", causeKind: "nutrient",
      tags: ["daun kuning", "nitrogen", "ec rendah", "yellow leaves"], status: "resolved", outcome: "solved",
      lesson: "EC jangan bawah 1.6 masa tumbesaran. Campur AB sekurang-kurangnya 4.5 L setiap 1000 L.",
      foundOn: d(118), resolvedOn: d(105),
      photos: [photo("ph-y-a", "leaf", "Daun bawah kuning")],
      updates: [
        update(t, 118, "followup", "Tangki lepas EC 1.2 je. Patutlah."),
        update(t, 108, "followup", "Daun baru hijau gelap, kuning tak merebak.", [photo("ph-y-b", "leaf", "Daun baru hijau")]),
      ],
    },
    {
      id: "thrips-1", title: "Daun kerinting (thrips)", batchId: "batch-mei",
      symptoms: "Daun pucuk kerinting ke atas, ada kesan perak. Bila tengok bawah daun ada thrips kecik banyak.",
      affectedPart: "leaf", severity: "high", suspectedCause: "Thrips", causeKind: "pest", tags: thripsTags,
      status: "resolved", outcome: "solved",
      lesson: "Check bawah daun pucuk setiap 3 hari. Spray waktu petang (lepas 5pm), ulang selepas 7 hari. Movento + Abamectin berkesan.",
      foundOn: d(140), resolvedOn: d(126),
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
  const b: Builder = { today, batches: batches(today), activities: [] };
  routine(b);
  const probs = problems(b);
  b.activities.sort((a, z) => z.occurredAt.localeCompare(a.occurredAt));
  return {
    today,
    products: PRODUCTS,
    varieties: VARIETIES,
    batches: b.batches,
    activities: b.activities,
    problems: probs,
  };
}
