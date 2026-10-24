import { addDays, diffDays } from "./dates";
import type { Batch, PlantStage, Variety } from "./types";

// Works out a batch's stage and expected dates from the farmer's own
// variety day counts. Without day counts, only actual dates are shown.

export type MilestoneKey = "sown" | "transplanted" | "flower" | "harvest" | "end";

export type Milestone = {
  key: MilestoneKey;
  label: string;
  malay: string;
  actual?: string;
  expected?: string;
  // Only flower / harvest / end can be marked from the batch page.
  markable: boolean;
};

export const STAGE_META: Record<PlantStage, { label: string; malay: string }> = {
  planned: { label: "Planned", malay: "Belum mula" },
  nursery: { label: "Nursery", malay: "Semaian" },
  vegetative: { label: "Growing", malay: "Tumbesaran" },
  flowering: { label: "Flowering", malay: "Berbunga" },
  harvest: { label: "Harvesting", malay: "Musim tuai" },
  ended: { label: "Ended", malay: "Tamat" },
};

const plus = (date: string | undefined, days: number | undefined) =>
  date && days !== undefined ? addDays(date, days) : undefined;

export function isActiveBatch(b: Batch, today: string) {
  return !b.endedOn || b.endedOn > today;
}

export function batchInfo(batch: Batch, variety: Variety | undefined, today: string) {
  const v = variety ?? ({} as Partial<Variety>);
  const transplantBase = batch.transplantedOn ?? plus(batch.sownOn, v.daysSowToTransplant);
  const expectedHarvest = plus(transplantBase, v.daysTransplantToHarvest);

  const milestones: Milestone[] = [
    { key: "sown", label: "Seeds sown", malay: "Semai", actual: batch.sownOn, markable: false },
    {
      key: "transplanted",
      label: "Transplanted to polybag",
      malay: "Pindah polibeg",
      actual: batch.transplantedOn,
      expected: batch.transplantedOn ? undefined : plus(batch.sownOn, v.daysSowToTransplant),
      markable: false,
    },
    {
      key: "flower",
      label: "First flowers",
      malay: "Mula berbunga",
      actual: batch.firstFlowerOn,
      expected: plus(transplantBase, v.daysTransplantToFlower),
      markable: true,
    },
    {
      key: "harvest",
      label: "First harvest",
      malay: "Tuai pertama",
      actual: batch.firstHarvestOn,
      expected: expectedHarvest,
      markable: true,
    },
    {
      key: "end",
      label: "Crop ended",
      malay: "Tamat",
      actual: batch.endedOn,
      expected: plus(batch.firstHarvestOn ?? expectedHarvest, v.harvestSeasonDays),
      markable: true,
    },
  ];

  const stage: PlantStage =
    batch.endedOn && batch.endedOn <= today
      ? "ended"
      : batch.firstHarvestOn && batch.firstHarvestOn <= today
        ? "harvest"
        : batch.firstFlowerOn && batch.firstFlowerOn <= today
          ? "flowering"
          : batch.transplantedOn && batch.transplantedOn <= today
            ? "vegetative"
            : batch.sownOn && batch.sownOn <= today
              ? "nursery"
              : "planned";

  const dayLabel = batch.transplantedOn && batch.transplantedOn <= today
    ? `Day ${diffDays(batch.endedOn && batch.endedOn < today ? batch.endedOn : today, batch.transplantedOn)} after transplant`
    : batch.sownOn && batch.sownOn <= today
      ? `Day ${diffDays(today, batch.sownOn)} since sowing`
      : undefined;

  const next = stage === "ended" ? undefined : milestones.find((m) => !m.actual && m.key !== "sown");

  // Progress across the whole crop, only when an end date can be estimated.
  const start = batch.sownOn ?? batch.transplantedOn;
  const end = batch.endedOn ?? milestones[4].expected;
  const progress =
    start && end && end > start
      ? Math.min(1, Math.max(0, diffDays(today, start) / diffDays(end, start)))
      : undefined;

  return { stage, dayLabel, milestones, next, progress };
}

export type BatchInfo = ReturnType<typeof batchInfo>;
