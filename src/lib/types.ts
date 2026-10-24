// Shapes mirror the planned Supabase schema (PROJECT.md §7) so the demo
// data layer can be swapped for real queries without touching the UI.

export type ActivityType = "spray" | "fertilizer" | "water";
export type EntryType = ActivityType | "problem";

export type ProductCategory = "pesticide" | "fertilizer";

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  subtype: string;
  activeIngredient?: string;
  npk?: string;
  unit: string;
  packSize: number;
  packPriceRm: number;
  phiDays?: number;
  notes?: string;
};

export type Photo = {
  id: string;
  caption: string;
  url?: string;
  // Demo-only: picks the placeholder artwork for seeded photos without a file.
  subject?: "leaf" | "fruit" | "pest" | "plant" | "field";
};

export type SprayDetails = {
  productId: string;
  dosePerTank: number;
  doseUnit: string;
  tankSizeL: number;
  tanks: number;
  totalQty: number;
  target: string;
  weather: string;
  costRm: number;
  safeHarvestOn: string; // YYYY-MM-DD
};

export type FertilizerDetails = {
  productId: string;
  quantity: number;
  unit: string;
  method: "tabur" | "siram" | "spray" | "fertigation";
  plantStage: PlantStage;
  costRm: number;
};

export type WaterDetails = {
  method: "drip" | "sprinkler" | "manual" | "hose";
  durationMin?: number;
  volumeL?: number;
  rained: boolean;
  rainNote?: string;
};

export type PlantStage =
  | "nursery"
  | "vegetative"
  | "flowering"
  | "fruiting"
  | "harvest";

type ActivityBase = {
  id: string;
  occurredAt: string; // ISO with +08:00 offset
  problemId?: string;
  notes?: string;
  rawMessage?: string;
  photos: Photo[];
};

export type Activity =
  | (ActivityBase & { type: "spray"; spray: SprayDetails })
  | (ActivityBase & { type: "fertilizer"; fertilizer: FertilizerDetails })
  | (ActivityBase & { type: "water"; water: WaterDetails });

export type ProblemUpdate = {
  id: string;
  kind: "action" | "followup";
  body: string;
  occurredAt: string;
  photos: Photo[];
};

export type Outcome = "solved" | "partly" | "not_solved";

export type Problem = {
  id: string;
  title: string;
  symptoms: string;
  affectedPart: "leaf" | "stem" | "root" | "flower" | "fruit" | "whole plant";
  severity: "low" | "medium" | "high";
  suspectedCause: string;
  causeKind: "pest" | "disease" | "nutrient" | "water" | "weather" | "unknown";
  tags: string[];
  status: "open" | "resolved";
  outcome?: Outcome;
  lesson?: string;
  foundOn: string; // YYYY-MM-DD
  resolvedOn?: string;
  photos: Photo[];
  updates: ProblemUpdate[];
};

export type FarmData = {
  today: string; // YYYY-MM-DD in farm timezone
  products: Product[];
  activities: Activity[]; // newest first
  problems: Problem[]; // newest first
};
