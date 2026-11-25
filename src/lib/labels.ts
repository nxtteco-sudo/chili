import type { FertilizerDetails } from "./types";

// Plain labels with no icon imports, so the Telegram bot and its scripts can
// share them with the dashboard (entry-meta.ts pulls in the icon library).
export const FERT_METHOD_LABEL: Record<FertilizerDetails["method"], string> = {
  foliar: "Foliar spray",
  tabur: "Tabur (spread)",
  siram: "Siram (poured)",
  other: "Other",
};
