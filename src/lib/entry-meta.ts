import { Droplets, SprayCan, Sprout, TriangleAlert, type LucideIcon } from "lucide-react";
import type { EntryType, Outcome, Problem } from "./types";

export const ENTRY_META: Record<
  EntryType,
  { label: string; malay: string; icon: LucideIcon; dot: string; soft: string; text: string }
> = {
  spray: { label: "Spray", malay: "Racun", icon: SprayCan, dot: "bg-spray", soft: "bg-spray-soft", text: "text-spray" },
  fertilizer: { label: "Baja", malay: "Baja", icon: Sprout, dot: "bg-baja", soft: "bg-baja-soft", text: "text-baja" },
  water: { label: "Water", malay: "Siram", icon: Droplets, dot: "bg-water", soft: "bg-water-soft", text: "text-water" },
  problem: { label: "Problem", malay: "Masalah", icon: TriangleAlert, dot: "bg-problem", soft: "bg-problem-soft", text: "text-problem" },
};

export const OUTCOME_META: Record<Outcome, { label: string; malay: string; tone: "good" | "warn" | "bad" }> = {
  solved: { label: "Solved", malay: "Selesai", tone: "good" },
  partly: { label: "Partly solved", malay: "Separuh", tone: "warn" },
  not_solved: { label: "Not solved", malay: "Tak jadi", tone: "bad" },
};

export const SEVERITY_LABEL: Record<Problem["severity"], string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const STAGE_LABEL = {
  nursery: "Nursery",
  vegetative: "Vegetative",
  flowering: "Flowering",
  fruiting: "Fruiting",
  harvest: "Harvesting",
} as const;

export const FERT_METHOD_LABEL = {
  tabur: "Tabur (spread)",
  siram: "Siram (watered in)",
  spray: "Foliar spray",
  fertigation: "Fertigation",
} as const;

export const WATER_METHOD_LABEL = {
  drip: "Drip",
  sprinkler: "Sprinkler",
  manual: "Manual",
  hose: "Hose",
} as const;
