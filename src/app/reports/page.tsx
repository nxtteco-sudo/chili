import Link from "next/link";
import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { CircleAlert, CircleCheck, CircleX, RefreshCcw, ShieldCheck } from "lucide-react";
import { HorizontalBars, StackedColumns } from "@/components/charts";
import { LineChart } from "@/components/line-chart";
import { Card, PageHeader, PageSkeleton, SectionTitle } from "@/components/ui";
import { STAGE_META } from "@/lib/batches";
import {
  getActivities,
  getBatches,
  getEcPhSeries,
  getMonthlyUsage,
  getProblems,
  getProducts,
  getSprayRotation,
  getToday,
} from "@/lib/data";
import { addMonths, dayKey, diffDays, formatMonthShort, formatShort, monthKey } from "@/lib/dates";
import { cn } from "@/lib/format";

export const metadata: Metadata = { title: "Reports" };

const TREND_DAYS = 120;

export default function ReportsPage() {
  return (
    <>
      <PageHeader title="Reports" subtitle="Tank readings, fertilizer used, spraying and how each batch went" />
      <Suspense fallback={<PageSkeleton />}>
        <Reports />
      </Suspense>
    </>
  );
}

async function Reports() {
  const today = await getToday();
  const months = Array.from({ length: 6 }, (_, i) => addMonths(monthKey(today), i - 5));
  const [series, usage, rotation, problems, batches, sprays90, products, month30] = await Promise.all([
    getEcPhSeries(TREND_DAYS),
    getMonthlyUsage(months),
    getSprayRotation(),
    getProblems(),
    getBatches(),
    getActivities({ type: "spray", sinceDays: 90 }),
    getProducts(),
    getActivities({ sinceDays: 30 }),
  ]);

  const events = problems.map((p) => ({ date: p.foundOn, label: p.title, href: `/problems/${p.id}` }));
  const ecPoints = series.flatMap((s) => (s.ec !== undefined ? [{ date: s.date, value: s.ec, href: `/entries/${s.activityId}` }] : []));
  const phPoints = series.flatMap((s) => (s.ph !== undefined ? [{ date: s.date, value: s.ph, href: `/entries/${s.activityId}` }] : []));

  const last30Tanks = month30.filter((a) => a.type === "tank_mix");
  const ec30 = last30Tanks.flatMap((a) => (a.type === "tank_mix" && a.tankMix.ec !== undefined ? [a.tankMix.ec] : []));
  const avgEc = ec30.length ? (ec30.reduce((s, v) => s + v, 0) / ec30.length).toFixed(1) : "—";

  // AB is usually in litres; months mixing other units are shown in the table only.
  const abUnit = mostCommonUnit(usage.flatMap((u) => Object.keys(u.abByUnit))) ?? "L";

  const sprayCounts = new Map<string, number>();
  for (const a of sprays90) if (a.type === "spray") sprayCounts.set(a.spray.productId, (sprayCounts.get(a.spray.productId) ?? 0) + 1);
  const topSprays = [...sprayCounts]
    .sort((a, z) => z[1] - a[1])
    .slice(0, 8)
    .map(([id, n]) => ({ label: products.find((p) => p.id === id)?.name ?? "Unknown", value: n, seriesKey: "spray" }));

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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Tank mixes, last 30 days" value={String(last30Tanks.length)} />
        <Stat label="Average EC, last 30 days" value={avgEc} note="mS/cm" />
        <Stat label="Sprays, last 30 days" value={String(month30.filter((a) => a.type === "spray").length)} />
        <Stat label="Active batches" value={String(batches.filter((b) => b.active).length)} note={`${batches.length} in total`} />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <LineChart title="EC" subtitle={`Each new tank, last ${TREND_DAYS} days`} unit="mS/cm" color="var(--water)" points={ecPoints} events={events} />
        <LineChart title="pH" subtitle={`Each new tank, last ${TREND_DAYS} days`} color="var(--water)" points={phPoints} events={events} />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <StackedColumns
          title="AB used per month"
          subtitle={`A + B together, in ${abUnit}`}
          series={[{ key: "ab", label: "AB", color: "var(--water)" }]}
          unit={abUnit}
          data={usage.map((u) => ({ label: formatMonthShort(u.month), values: { ab: u.abByUnit[abUnit] ?? 0 } }))}
        />
        <HorizontalBars
          title="Most sprayed products"
          subtitle="Times sprayed, last 90 days"
          series={[{ key: "spray", label: "Pesticide", color: "var(--spray)" }]}
          valueLabel="Times"
          unit="×"
          data={topSprays}
        />
      </div>

      <Card className="p-5 md:p-6">
        <SectionTitle>
          <span className="flex items-center gap-2">
            <RefreshCcw className="size-4 text-muted" /> Pesticide rotation
          </span>
        </SectionTitle>
        {rotation.warnings.length > 0 ? (
          <div className="mb-4 space-y-2">
            {rotation.warnings.map((w) => (
              <p key={w.ingredient} className="flex items-start gap-2 rounded-xl bg-warn-soft px-3.5 py-3 text-[15px] text-warn-ink">
                <CircleAlert className="mt-0.5 size-5 shrink-0" />
                <span>
                  <b className="font-medium">{w.ingredient}</b> was used in {w.n} of the last 5 sprays. Rotate to a
                  different active ingredient so pests don&apos;t build resistance.
                </span>
              </p>
            ))}
          </div>
        ) : (
          <p className="mb-4 flex items-center gap-2 rounded-xl bg-good-soft px-3.5 py-3 text-[15px] text-good-ink">
            <ShieldCheck className="size-5 shrink-0" /> Good rotation. No active ingredient used 3 times in the last 5 sprays.
          </p>
        )}
        <p className="mb-2 text-sm text-ink-2">Last sprays, newest first</p>
        <ol className="flex flex-wrap gap-2">
          {rotation.recent.map((r) => (
            <li key={r.activity.id}>
              <Link
                href={`/entries/${r.activity.id}`}
                className={cn(
                  "inline-flex min-h-11 flex-col justify-center rounded-lg border px-3 py-1.5 text-[13px] leading-tight hover:bg-surface-2",
                  rotation.warnings.some((w) => w.ingredient === r.ingredient) ? "border-warn/60" : "border-line",
                )}
              >
                <span className="font-medium">{r.ingredient}</span>
                <span className="text-xs text-muted">{formatShort(dayKey(r.activity.occurredAt))}</span>
              </Link>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="p-5 md:p-6">
        <SectionTitle>Batch comparison</SectionTitle>
        <div className="overflow-x-auto">
          <table className="tabular w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="py-2 font-normal">Batch</th>
                <th className="py-2 font-normal">Variety</th>
                <th className="py-2 font-normal">Stage</th>
                <th className="py-2 text-right font-normal">Days to flower</th>
                <th className="py-2 text-right font-normal">Days to 1st harvest</th>
                <th className="py-2 text-right font-normal">Problems</th>
                <th className="py-2 text-right font-normal">Sprays</th>
              </tr>
            </thead>
            <tbody>
              {batches.map(({ batch: b, variety, info }) => (
                <tr key={b.id} className="border-b border-line last:border-0">
                  <td className="py-2.5">
                    <Link href={`/batches/${b.id}`} className="font-medium text-accent hover:underline">
                      {b.name}
                    </Link>
                  </td>
                  <td className="py-2.5 text-ink-2">{variety?.name ?? "—"}</td>
                  <td className="py-2.5 text-ink-2">{STAGE_META[info.stage].label}</td>
                  <td className="py-2.5 text-right">{daysAfter(b.transplantedOn, b.firstFlowerOn)}</td>
                  <td className="py-2.5 text-right">{daysAfter(b.transplantedOn, b.firstHarvestOn)}</td>
                  <td className="py-2.5 text-right">{problems.filter((p) => p.batchId === b.id).length}</td>
                  <td className="py-2.5 text-right">
                    <CountSprays batchId={b.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">Days are counted from moving to polybag.</p>
      </Card>

      <Card className="p-5 md:p-6">
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

async function CountSprays({ batchId }: { batchId: string }) {
  return (await getActivities({ type: "spray", batchId })).length;
}

function daysAfter(from?: string, to?: string) {
  return from && to ? diffDays(to, from) : "—";
}

function mostCommonUnit(units: string[]) {
  const counts = new Map<string, number>();
  for (const u of units) counts.set(u, (counts.get(u) ?? 0) + 1);
  return [...counts].sort((a, z) => z[1] - a[1])[0]?.[0];
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
