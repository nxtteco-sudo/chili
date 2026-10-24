import { csvResponse } from "@/lib/csv";
import { getActivities, getProblems, getProducts, getToday } from "@/lib/data";
import { dayKey, formatTime } from "@/lib/dates";
import { FERT_METHOD_LABEL, STAGE_LABEL, WATER_METHOD_LABEL } from "@/lib/entry-meta";

export async function GET() {
  const [today, activities, products, problems] = await Promise.all([
    getToday(),
    getActivities(),
    getProducts(),
    getProblems(),
  ]);
  const productOf = (id: string) => products.find((p) => p.id === id);
  const problemTitle = (id?: string) => problems.find((p) => p.id === id)?.title;

  const rows = [...activities].reverse().map((a) => {
    const base = [dayKey(a.occurredAt), formatTime(a.occurredAt)];
    const tail = [problemTitle(a.problemId), a.notes, a.rawMessage];
    if (a.type === "spray") {
      const s = a.spray;
      const p = productOf(s.productId);
      return [...base, "Spray", p?.name, p?.subtype, s.dosePerTank, s.doseUnit, s.tanks, s.tankSizeL, s.totalQty, "", "", s.target, s.weather, "", "", "", s.costRm, s.safeHarvestOn, ...tail];
    }
    if (a.type === "fertilizer") {
      const f = a.fertilizer;
      const p = productOf(f.productId);
      return [...base, "Baja", p?.name, p?.subtype, "", f.unit, "", "", f.quantity, FERT_METHOD_LABEL[f.method], STAGE_LABEL[f.plantStage], "", "", "", "", "", f.costRm, "", ...tail];
    }
    const w = a.water;
    return [...base, "Water", "", "", "", "", "", "", "", WATER_METHOD_LABEL[w.method], "", "", "", w.durationMin, w.volumeL, w.rained ? "Yes" : "No", "", "", ...tail];
  });

  return csvResponse(
    `kebun-cili-entries-${today}.csv`,
    [
      "Date", "Time", "Type", "Product", "Product type", "Dose per tong", "Unit", "Tong", "Tong size (L)",
      "Total / quantity", "Method", "Plant stage", "Target", "Weather", "Water minutes", "Water litres",
      "Rained", "Cost (RM)", "Safe to harvest from", "Problem", "Notes", "Original message",
    ],
    rows,
  );
}
