import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ActivityRow } from "@/components/activity-row";
import { SearchForm } from "@/components/search-form";
import { Droplet } from "lucide-react";
import { deleteDripReading } from "@/app/actions";
import { DeleteButton } from "@/components/form-ui";
import { Card, Chips, EmptyState, PageHeader, PageSkeleton, StatusBadge, TypeIcon } from "@/components/ui";
import { getActivities, getBatches, getDripReadings, getProblems, getProducts, getToday } from "@/lib/data";
import { addDays, dayKey, formatTime, formatWeekday, relativeDay } from "@/lib/dates";
import { ENTRY_META } from "@/lib/entry-meta";
import { href, oneOf, param } from "@/lib/params";
import type { Activity, DripReading, Problem } from "@/lib/types";

export const metadata: Metadata = { title: "Timeline" };

const TYPES = ["spray", "tank_mix", "fertilizer", "drip", "problem"] as const;
const RANGES = { "7": 7, "30": 30, "90": 90, all: undefined } as const;
type RangeKey = keyof typeof RANGES;

export default function TimelinePage(props: PageProps<"/timeline">) {
  return (
    <>
      <PageHeader title="Timeline" subtitle="Everything logged, newest first" />
      <Suspense fallback={<PageSkeleton />}>
        <Timeline searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

type Row =
  | { kind: "activity"; at: string; activity: Activity }
  | { kind: "problem"; at: string; problem: Problem }
  | { kind: "drip"; at: string; drip: DripReading };

async function Timeline({ searchParams }: { searchParams: PageProps<"/timeline">["searchParams"] }) {
  const sp = await searchParams;
  const type = oneOf(param(sp, "type"), TYPES);
  const range: RangeKey = oneOf(param(sp, "range"), ["7", "30", "90", "all"] as const) ?? "30";
  const q = param(sp, "q");
  const sinceDays = RANGES[range];
  const allBatches = await getBatches();
  const batchId = allBatches.some((b) => b.batch.id === param(sp, "batch")) ? param(sp, "batch") : undefined;

  const [today, products, activities, problems, drips] = await Promise.all([
    getToday(),
    getProducts(),
    type === "problem" || type === "drip" ? Promise.resolve([]) : getActivities({ type, q, sinceDays, batchId }),
    !type || type === "problem" ? getProblems({ q, batchId }) : Promise.resolve([]),
    (!type || type === "drip") && !batchId ? getDripReadings({ sinceDays, q }) : Promise.resolve([]),
  ]);

  const since = sinceDays !== undefined ? addDays(today, -sinceDays) : undefined;
  const rows: Row[] = [
    ...activities.map((a) => ({ kind: "activity" as const, at: a.occurredAt, activity: a })),
    ...problems
      .filter((p) => !since || p.foundOn >= since)
      .map((p) => ({ kind: "problem" as const, at: `${p.foundOn}T23:59:00+08:00`, problem: p })),
    ...drips.map((d) => ({ kind: "drip" as const, at: d.occurredAt, drip: d })),
  ].sort((a, z) => z.at.localeCompare(a.at));

  const days = new Map<string, Row[]>();
  for (const r of rows) {
    const key = r.kind === "problem" ? r.problem.foundOn : dayKey(r.at);
    days.set(key, [...(days.get(key) ?? []), r]);
  }

  const base = { type, range: range === "30" ? undefined : range, q, batch: batchId };

  return (
    <div className="space-y-4">
      <SearchForm
        action="/timeline"
        q={q}
        placeholder="Search product, pest, notes…"
        keep={{ type, range: base.range, batch: batchId }}
      />
      <Chips
        items={[
          { href: href("/timeline", { ...base, type: undefined }), label: "All", active: !type },
          ...TYPES.map((t) => {
            const meta = t === "drip" ? { label: "Drip reading", icon: Droplet, text: "text-water" } : ENTRY_META[t];
            const Icon = meta.icon;
            return {
              href: href("/timeline", { ...base, type: t }),
              label: (
                <>
                  <Icon className={`size-4 ${type === t ? "" : meta.text}`} />
                  {meta.label}
                </>
              ),
              active: type === t,
            };
          }),
        ]}
      />
      {allBatches.length > 0 && (
        <Chips
          items={[
            { href: href("/timeline", { ...base, batch: undefined }), label: "All batches", active: !batchId },
            ...allBatches.map((b) => ({
              href: href("/timeline", { ...base, batch: b.batch.id }),
              label: b.batch.name,
              active: batchId === b.batch.id,
            })),
          ]}
        />
      )}
      <Chips
        items={(["7", "30", "90", "all"] as const).map((r) => ({
          href: href("/timeline", { ...base, range: r === "30" ? undefined : r }),
          label: r === "all" ? "All time" : `Last ${r} days`,
          active: range === r,
        }))}
      />

      {rows.length === 0 ? (
        <EmptyState>Nothing found{q ? ` for “${q}”` : ""}. Try a different filter.</EmptyState>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted">{rows.length} entries</p>
          {[...days].map(([key, dayRows]) => (
            <Card key={key}>
              <h2 className="flex items-baseline justify-between border-b border-line px-4 py-2.5">
                <span className="text-[15px] font-semibold">{formatWeekday(key)}</span>
                <span className="text-sm text-muted">{relativeDay(key, today)}</span>
              </h2>
              <div className="divide-y divide-line">
                {dayRows.map((r) =>
                  r.kind === "activity" ? (
                    <ActivityRow key={r.activity.id} activity={r.activity} products={products} />
                  ) : r.kind === "drip" ? (
                    <DripRow key={r.drip.id} drip={r.drip} />
                  ) : (
                    <ProblemRow key={r.problem.id} problem={r.problem} />
                  ),
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function DripRow({ drip }: { drip: DripReading }) {
  const readings = [drip.ec !== undefined && `EC ${drip.ec}`, drip.ph !== undefined && `pH ${drip.ph}`].filter(Boolean).join(" · ");
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-water-soft text-water">
        <Droplet className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium">Drip reading · {readings}</p>
        <p className="truncate text-sm text-ink-2">Measured at the drip line · {formatTime(drip.occurredAt)}</p>
      </div>
      <DeleteButton action={deleteDripReading} fields={{ id: drip.id }} label="" confirmText="Delete this drip reading?" />
    </div>
  );
}

function ProblemRow({ problem }: { problem: Problem }) {
  return (
    <Link
      href={`/problems/${problem.id}`}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
    >
      <TypeIcon type="problem" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium">{problem.title}</p>
        <p className="truncate text-sm text-ink-2">Problem found · {problem.suspectedCause}</p>
      </div>
      <StatusBadge problem={problem} />
    </Link>
  );
}
