import { getMember } from "@/lib/auth";
import { STAGE_META } from "@/lib/batches";
import { csvResponse } from "@/lib/csv";
import { getActivities, getBatches, getProblems, getToday } from "@/lib/data";
import { diffDays } from "@/lib/dates";

export async function GET() {
  if (!(await getMember())) return new Response("Please log in", { status: 401 });
  const [today, batches, activities, problems] = await Promise.all([getToday(), getBatches(), getActivities(), getProblems()]);

  const rows = [...batches].reverse().map(({ batch: b, variety, info }) => [
    b.name,
    variety?.name,
    STAGE_META[info.stage].label,
    b.sownOn,
    b.seedsCount,
    b.transplantedOn,
    b.polybagsCount,
    b.firstFlowerOn,
    b.transplantedOn && b.firstFlowerOn ? diffDays(b.firstFlowerOn, b.transplantedOn) : "",
    b.firstHarvestOn,
    b.transplantedOn && b.firstHarvestOn ? diffDays(b.firstHarvestOn, b.transplantedOn) : "",
    b.endedOn,
    activities.filter((a) => a.type === "spray" && a.batchIds.includes(b.id)).length,
    activities.filter((a) => a.type === "tank_mix" && a.batchIds.includes(b.id)).length,
    problems.filter((p) => p.batchId === b.id).length,
    b.notes,
  ]);

  return csvResponse(
    `kebun-cili-batches-${today}.csv`,
    [
      "Batch", "Variety", "Stage", "Sown", "Seeds", "Moved to polybag", "Polybags",
      "First flowers", "Days to flower", "First harvest", "Days to first harvest", "Ended",
      "Sprays", "Tank mixes", "Problems", "Notes",
    ],
    rows,
  );
}
