import { Droplets, Leaf, SprayCan, TriangleAlert, type LucideIcon } from "lucide-react";
import type { EntryType, FertilizerDetails, Outcome, Problem } from "./types";

export const ENTRY_META: Record<
  EntryType,
  { label: string; malay: string; icon: LucideIcon; dot: string; soft: string; text: string }
> = {
  spray: { label: "Spray", malay: "Racun", icon: SprayCan, dot: "bg-spray", soft: "bg-spray-soft", text: "text-spray" },
  tank_mix: { label: "Tank mix", malay: "Campur tangki AB", icon: Droplets, dot: "bg-water", soft: "bg-water-soft", text: "text-water" },
  fertilizer: { label: "Other baja", malay: "Baja lain", icon: Leaf, dot: "bg-baja", soft: "bg-baja-soft", text: "text-baja" },
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

export const FERT_METHOD_LABEL: Record<FertilizerDetails["method"], string> = {
  foliar: "Foliar spray",
  tabur: "Tabur (spread)",
  siram: "Siram (poured)",
  other: "Other",
};
