// Shapes mirror the planned Supabase schema (PROJECT.md §7) so the local
// data layer can be swapped for real queries without touching the UI.

// How the farm works: polybags on drip, AB fertilizer mixed in a big tank
// (EC/pH measured at mixing), only pesticides are sprayed. No money here;
// costs and harvest kg live in the separate accounts dashboard.

export type ActivityType = "spray" | "tank_mix" | "fertilizer";
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
  phiDays?: number;
  notes?: string;
};

// Day counts are the farmer's own experience; all optional.
export type Variety = {
  id: string;
  name: string;
  daysSowToTransplant?: number;
  daysTransplantToFlower?: number;
  daysTransplantToHarvest?: number;
  harvestSeasonDays?: number;
  notes?: string;
};

export type Batch = {
  id: string;
  name: string;
  varietyId?: string;
  sownOn?: string; // YYYY-MM-DD
  seedsCount?: number;
  transplantedOn?: string;
  polybagsCount?: number;
  // Actual milestones, recorded when they happen.
  firstFlowerOn?: string;
  firstHarvestOn?: string;
  endedOn?: string;
  notes?: string;
  photos: Photo[];
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
  safeHarvestOn: string; // YYYY-MM-DD
};

export type TankAdditive = { productId: string; quantity: number; unit: string };

export type TankMixDetails = {
  aAmount: number;
  bAmount: number;
  abUnit: "L" | "ml" | "kg" | "g";
  waterL: number;
  ec?: number; // mS/cm
  ph?: number;
  additives: TankAdditive[];
};

// "Other baja": fertilizer not given through the drip tank.
export type FertilizerDetails = {
  productId: string;
  quantity: number;
  unit: string;
  method: "foliar" | "tabur" | "siram" | "other";
};

export type PlantStage = "planned" | "nursery" | "vegetative" | "flowering" | "harvest" | "ended";

type ActivityBase = {
  id: string;
  occurredAt: string; // ISO with +08:00 offset
  batchIds: string[];
  problemId?: string;
  notes?: string;
  rawMessage?: string;
  photos: Photo[];
};

export type Activity =
  | (ActivityBase & { type: "spray"; spray: SprayDetails })
  | (ActivityBase & { type: "tank_mix"; tankMix: TankMixDetails })
  | (ActivityBase & { type: "fertilizer"; fertilizer: FertilizerDetails });

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
  batchId?: string;
  photos: Photo[];
  updates: ProblemUpdate[];
};

export type FarmData = {
  today: string; // YYYY-MM-DD in farm timezone
  products: Product[];
  varieties: Variety[];
  batches: Batch[];
  activities: Activity[]; // newest first
  problems: Problem[]; // newest first
};
