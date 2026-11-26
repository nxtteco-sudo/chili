import { getMember } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";
import { getActivities, getBatches, getDripReadings, getProblems, getProducts, getToday } from "@/lib/data";
import { dayKey, formatTime } from "@/lib/dates";
import { ENTRY_META, FERT_METHOD_LABEL } from "@/lib/entry-meta";
import { formatQty } from "@/lib/format";

export async function GET() {
  if (!(await getMember())) return new Response("Please log in", { status: 401 });
  const [today, activities, products, problems, batches, drips] = await Promise.all([
    getToday(),
    getActivities(),
    getProducts(),
    getProblems(),
    getBatches(),
    getDripReadings(),
  ]);
  const productName = (id: string) => products.find((p) => p.id === id)?.name;
  const problemTitle = (id?: string) => problems.find((p) => p.id === id)?.title;
  const batchNames = (ids: string[]) =>
    ids.map((id) => batches.find((b) => b.batch.id === id)?.batch.name).filter(Boolean).join(", ");

  // Columns: shared → spray → tank mix → other baja → shared tail.
  const activityRows = [...activities].map((a) => {
    const head = [dayKey(a.occurredAt), formatTime(a.occurredAt), ENTRY_META[a.type].label, batchNames(a.batchIds)];
    const tail = [problemTitle(a.problemId), a.notes, a.rawMessage];
    if (a.type === "spray") {
      const s = a.spray;
      return [...head, productName(s.productId), s.dosePerTank, s.doseUnit, s.tanks, s.tankSizeL, s.totalQty, s.target, s.weather, s.safeHarvestOn, "", "", "", "", "", "", "", "", "", "", ...tail];
    }
    if (a.type === "tank_mix") {
      const t = a.tankMix;
      const extra = t.additives.map((x) => `${productName(x.productId)} ${formatQty(x.quantity, x.unit)}`).join("; ");
      return [...head, "", "", "", "", "", "", "", "", "", t.aAmount, t.bAmount, t.abUnit, t.waterL, t.ec, t.ph, extra, "", "", "", ...tail];
    }
    const f = a.fertilizer;
    return [...head, "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", productName(f.productId), formatQty(f.quantity, f.unit), FERT_METHOD_LABEL[f.method], ...tail];
  });
  // Drip readings sit in the same sheet: EC and pH columns filled, everything else empty.
  const dripRows = drips.map((d) => [
    dayKey(d.occurredAt), formatTime(d.occurredAt), "Drip reading", "",
    "", "", "", "", "", "", "", "", "",
    "", "", "", "", d.ec, d.ph, "",
    "", "", "",
    "", "", d.rawMessage,
  ]);
  const keyed = [
    ...activities.map((a, i) => ({ at: a.occurredAt, row: activityRows[i] })),
    ...drips.map((d, i) => ({ at: d.occurredAt, row: dripRows[i] })),
  ].sort((a, z) => a.at.localeCompare(z.at));
  const rows = keyed.map((k) => k.row);

  return csvResponse(
    `kebun-cili-entries-${today}.csv`,
    [
      "Date", "Time", "Type", "Batch",
      "Pesticide", "Dose per tong", "Unit", "Tong", "Tong size (L)", "Total used", "Target", "Weather", "Safe to harvest from",
      "A", "B", "AB unit", "Water (L)", "EC", "pH", "Extra fertilizer in tank",
      "Other baja", "Quantity", "Method",
      "Problem", "Notes", "Original message",
    ],
    rows,
  );
}
