import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { CircleCheck, CircleAlert, CircleX } from "lucide-react";
import { HorizontalBars, StackedColumns, type Series } from "@/components/charts";
import { Card, PageHeader, PageSkeleton, SectionTitle } from "@/components/ui";
import { getActivities, getMonthlySpend, getProblems, getProductUsage, getToday } from "@/lib/data";
import { addMonths, diffDays, formatMonthShort, monthKey } from "@/lib/dates";
import { formatRmWhole } from "@/lib/format";

export const metadata: Metadata = { title: "Reports" };

// Chart colors follow the entry-type tokens so pesticide is always orange, baja always green.
const SPEND_SERIES: Series[] = [
  { key: "pesticide", label: "Pesticide", color: "var(--spray)" },
  { key: "fertilizer", label: "Baja", color: "var(--baja)" },
];

export default function ReportsPage() {
  return (
    <>
      <PageHeader title="Reports" subtitle="Spending, products and problems over the last 6 months" />
      <Suspense fallback={<PageSkeleton />}>
        <Reports />
      </Suspense>
    </>
  );
}

async function Reports() {
  const today = await getToday();
  const months = Array.from({ length: 6 }, (_, i) => addMonths(monthKey(today), i - 5));
  const [spend, usage, problems, water] = await Promise.all([
    getMonthlySpend(months),
    getProductUsage(),
    getProblems(),
    getActivities({ type: "water", sinceDays: 30 }),
  ]);

  const total6 = spend.reduce((s, m) => s + m.pesticide + m.fertilizer, 0);
  const top = usage
    .filter((u) => u.totalCost > 0)
    .sort((a, z) => z.totalCost - a.totalCost)
    .slice(0, 8);

  const resolved = problems.filter((p) => p.status === "resolved");
  const count = (o: string) => resolved.filter((p) => p.outcome === o).length;
  const avgDays = resolved.length
    ? Math.round(resolved.reduce((s, p) => s + diffDays(p.resolvedOn!, p.foundOn), 0) / resolved.length)
    : 0;
  const causes = Object.entries(
    problems.reduce<Record<string, number>>((acc, p) => {
      acc[p.causeKind] = (acc[p.causeKind] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, z) => z[1] - a[1]);

  const rainDays = water.filter((w) => w.type === "water" && w.water.rained).length;
  const minutes = water.reduce((s, w) => s + (w.type === "water" ? (w.water.durationMin ?? 0) : 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Spent, 6 months" value={formatRmWhole(total6)} />
        <Stat label="Average per month" value={formatRmWhole(total6 / 6)} />
        <Stat label="Days watered, last 30" value={`${water.length} / 30`} />
        <Stat label="Watering time, last 30" value={`${Math.round(minutes / 60)} hours`} note={`${rainDays} light-rain days`} />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <StackedColumns
          title="Spending per month"
          subtitle="RM, pesticide and baja"
          series={SPEND_SERIES}
          data={spend.map((m) => ({
            label: formatMonthShort(m.month),
            values: { pesticide: m.pesticide, fertilizer: m.fertilizer },
          }))}
        />
        <HorizontalBars
          title="Top products by spend"
          subtitle="All time"
          series={SPEND_SERIES}
          data={top.map((u) => ({
            label: u.product.name,
            value: u.totalCost,
            seriesKey: u.product.category,
            note: `${u.uses}×`,
          }))}
        />
      </div>

      <Card className="p-4">
        <SectionTitle>Problems</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          <ul className="space-y-2 text-[15px]">
            <OutcomeLine icon={<CircleCheck className="size-5 text-good" />} label="Solved" value={count("solved")} />
            <OutcomeLine icon={<CircleAlert className="size-5 text-warn" />} label="Partly solved" value={count("partly")} />
            <OutcomeLine icon={<CircleX className="size-5 text-problem" />} label="Not solved" value={count("not_solved")} />
            <OutcomeLine
              icon={<span className="grid size-5 place-items-center"><span className="size-2.5 rounded-full bg-problem" /></span>}
              label="Still open"
              value={problems.length - resolved.length}
            />
            <li className="border-t border-line pt-2 text-sm text-ink-2">
              Average time to close: <b className="font-medium text-ink">{avgDays} days</b>
            </li>
          </ul>
          <div>
            <p className="mb-2 text-sm text-ink-2">By cause</p>
            <ul className="space-y-1.5 text-[15px]">
              {causes.map(([cause, n]) => (
                <li key={cause} className="flex items-center justify-between border-b border-line pb-1.5 capitalize last:border-0">
                  {cause}
                  <span className="tabular text-ink-2">{n}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-ink-2">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {note && <p className="mt-0.5 text-sm text-muted">{note}</p>}
    </Card>
  );
}

function OutcomeLine({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <li className="flex items-center gap-2.5">
      {icon}
      {label}
      <span className="tabular ml-auto font-medium">{value}</span>
    </li>
  );
}
