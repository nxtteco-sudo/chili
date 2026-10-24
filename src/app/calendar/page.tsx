import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ActivityRow } from "@/components/activity-row";
import { Card, EmptyState, PageHeader, PageSkeleton, StatusBadge, TypeIcon } from "@/components/ui";
import { getActivities, getProblems, getProducts, getToday } from "@/lib/data";
import { addDays, addMonths, dayKey, formatFull, formatMonth, monthKey } from "@/lib/dates";
import { ENTRY_META } from "@/lib/entry-meta";
import { cn } from "@/lib/format";
import { href, param } from "@/lib/params";
import type { EntryType } from "@/lib/types";

export const metadata: Metadata = { title: "Calendar" };

const ORDER: EntryType[] = ["water", "spray", "fertilizer", "problem"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarPage(props: PageProps<"/calendar">) {
  return (
    <>
      <PageHeader title="Calendar" subtitle="Tap a day to see what was done" />
      <Suspense fallback={<PageSkeleton />}>
        <Calendar searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Calendar({ searchParams }: { searchParams: PageProps<"/calendar">["searchParams"] }) {
  const sp = await searchParams;
  const today = await getToday();
  const mParam = param(sp, "m");
  const month = mParam && /^\d{4}-\d{2}$/.test(mParam) ? mParam : monthKey(today);
  const dParam = param(sp, "d");
  const selected =
    dParam && /^\d{4}-\d{2}-\d{2}$/.test(dParam) && monthKey(dParam) === month
      ? dParam
      : monthKey(today) === month
        ? today
        : undefined;

  const [products, activities, problems] = await Promise.all([
    getProducts(),
    getActivities({ month }),
    getProblems(),
  ]);

  const types = new Map<string, Set<EntryType>>();
  const mark = (key: string, t: EntryType) => {
    if (!types.has(key)) types.set(key, new Set());
    types.get(key)!.add(t);
  };
  activities.forEach((a) => mark(dayKey(a.occurredAt), a.type));
  const monthProblems = problems.filter((p) => monthKey(p.foundOn) === month);
  monthProblems.forEach((p) => mark(p.foundOn, "problem"));

  // Monday-first grid padded to whole weeks.
  const first = `${month}-01`;
  const lead = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
  const daysInMonth = Number(addDays(`${addMonths(month, 1)}-01`, -1).slice(8));
  const cells: (string | null)[] = [
    ...Array(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => addDays(first, i)),
  ];
  while (cells.length % 7) cells.push(null);

  const dayActivities = selected ? activities.filter((a) => dayKey(a.occurredAt) === selected) : [];
  const dayProblems = selected ? monthProblems.filter((p) => p.foundOn === selected) : [];

  const counts = {
    water: activities.filter((a) => a.type === "water").length,
    spray: activities.filter((a) => a.type === "spray").length,
    fertilizer: activities.filter((a) => a.type === "fertilizer").length,
    problem: monthProblems.length,
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <Card className="p-3 sm:p-4 lg:col-span-3">
        <div className="mb-3 flex items-center justify-between">
          <Link
            href={href("/calendar", { m: addMonths(month, -1) })}
            className="grid size-11 place-items-center rounded-lg hover:bg-surface-2"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <h2 className="text-[17px] font-semibold">{formatMonth(month)}</h2>
          <Link
            href={href("/calendar", { m: addMonths(month, 1) })}
            className="grid size-11 place-items-center rounded-lg hover:bg-surface-2"
            aria-label="Next month"
          >
            <ChevronRight className="size-5" />
          </Link>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((w) => (
            <div key={w} className="pb-1 text-xs text-muted">
              {w}
            </div>
          ))}
          {cells.map((key, i) =>
            key ? (
              <Link
                key={key}
                href={href("/calendar", { m: month, d: key })}
                scroll={false}
                aria-label={formatFull(key)}
                aria-current={key === today ? "date" : undefined}
                className={cn(
                  "flex min-h-11 aspect-square flex-col items-center justify-center gap-1 rounded-xl text-[15px] transition-colors sm:aspect-[5/4]",
                  key === selected ? "bg-ink text-bg" : "hover:bg-surface-2",
                  key === today && key !== selected && "font-semibold text-accent ring-1 ring-accent ring-inset",
                  key > today && "text-muted",
                )}
              >
                <span className="tabular">{Number(key.slice(8))}</span>
                <span className="flex h-1.5 gap-[3px]">
                  {ORDER.filter((t) => types.get(key)?.has(t)).map((t) => (
                    <span key={t} className={cn("size-1.5 rounded-full", ENTRY_META[t].dot)} />
                  ))}
                </span>
              </Link>
            ) : (
              <div key={`pad-${i}`} />
            ),
          )}
        </div>

        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-3 text-sm text-ink-2">
          {ORDER.map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", ENTRY_META[t].dot)} />
              {ENTRY_META[t].label}
              <span className="tabular text-muted">{counts[t]}</span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="lg:col-span-2">
        {selected ? (
          <Card>
            <h2 className="border-b border-line px-4 py-3 text-[15px] font-semibold">{formatFull(selected)}</h2>
            {dayActivities.length + dayProblems.length === 0 ? (
              <p className="px-4 py-6 text-[15px] text-muted">Nothing logged this day.</p>
            ) : (
              <div className="divide-y divide-line">
                {dayProblems.map((p) => (
                  <Link
                    key={p.id}
                    href={`/problems/${p.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2"
                  >
                    <TypeIcon type="problem" />
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{p.title}</span>
                    <StatusBadge problem={p} />
                  </Link>
                ))}
                {dayActivities.map((a) => (
                  <ActivityRow key={a.id} activity={a} products={products} />
                ))}
              </div>
            )}
          </Card>
        ) : (
          <EmptyState>Tap a day to see its entries.</EmptyState>
        )}
      </div>
    </div>
  );
}
