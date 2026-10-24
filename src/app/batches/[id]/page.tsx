import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Check, CircleDashed, Pencil } from "lucide-react";
import { ActivityRow } from "@/components/activity-row";
import { MilestoneForm } from "@/components/batch-forms";
import { PhotoGallery } from "@/components/photo-tile";
import { ButtonLink, Card, EmptyState, Field, PageSkeleton, SectionTitle, StatusBadge, TextLink } from "@/components/ui";
import { STAGE_META } from "@/lib/batches";
import { getActivities, getBatch, getProblems, getProducts, getToday } from "@/lib/data";
import { dayKey, diffDays, formatLong, relativeDay } from "@/lib/dates";
import { ENTRY_META } from "@/lib/entry-meta";
import { cn } from "@/lib/format";
import type { ActivityType } from "@/lib/types";

export default function BatchPage(props: PageProps<"/batches/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BatchDetail params={props.params} />
    </Suspense>
  );
}

const MARK_LABEL = { flower: "Mark first flowers", harvest: "Mark first harvest", end: "Mark crop ended" } as const;

async function BatchDetail({ params }: { params: PageProps<"/batches/[id]">["params"] }) {
  const { id } = await params;
  const view = await getBatch(id);
  if (!view) notFound();
  const { batch, variety, info } = view;

  const [today, products, activities, problems] = await Promise.all([
    getToday(),
    getProducts(),
    getActivities({ batchId: id }),
    getProblems({ batchId: id }),
  ]);
  const count = (t: ActivityType) => activities.filter((a) => a.type === t).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link href="/batches" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
          <ArrowLeft className="size-4" /> Batches
        </Link>
        <ButtonLink href={`/batches/${id}/edit`} variant="secondary">
          <Pencil className="size-4" /> Edit
        </ButtonLink>
      </div>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="editorial text-[34px] leading-tight md:text-[42px]">{batch.name}</h1>
          <p className="mt-2 text-[13px] text-ink-2">
            {variety ? (
              <Link href={`/varieties/${variety.id}/edit`} className="text-accent hover:underline">
                {variety.name}
              </Link>
            ) : (
              "Variety not set"
            )}
            {info.dayLabel && <> · {info.dayLabel}</>}
          </p>
        </div>
        <span className="rounded-full bg-accent-soft px-3 py-1.5 text-[13px] font-medium text-accent">
          {STAGE_META[info.stage].label} · {STAGE_META[info.stage].malay}
        </span>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Card className="p-5 md:p-6">
            <SectionTitle>Timeline</SectionTitle>
            {!variety?.daysTransplantToHarvest && (
              <p className="mb-4 rounded-lg bg-surface-2 px-3 py-2 text-sm text-ink-2">
                Add day counts to the variety to see expected dates.{" "}
                {variety && (
                  <Link href={`/varieties/${variety.id}/edit`} className="font-medium text-accent underline">
                    Edit {variety.name}
                  </Link>
                )}
              </p>
            )}
            <ol className="relative space-y-5 border-l border-line pl-6">
              {info.milestones.map((m) => {
                const isNext = info.next?.key === m.key;
                return (
                  <li key={m.key} className="relative">
                    <span
                      className={cn(
                        "absolute -left-[35px] top-0 grid size-[22px] place-items-center rounded-full ring-4 ring-surface",
                        m.actual ? "bg-accent text-white" : isNext ? "bg-accent-soft text-accent" : "bg-surface-2 text-muted",
                      )}
                    >
                      {m.actual ? <Check className="size-3.5" /> : <CircleDashed className="size-3.5" />}
                    </span>
                    <p className="text-[15px] font-medium">
                      {m.label} <span className="font-normal text-muted">· {m.malay}</span>
                    </p>
                    {m.actual ? (
                      <p className="text-sm text-ink-2">
                        {formatLong(m.actual)}
                        {m.expected && <DiffNote actual={m.actual} expected={m.expected} />}
                      </p>
                    ) : m.expected ? (
                      <p className="text-sm text-ink-2">
                        Expected {formatLong(m.expected)} ({relativeDay(m.expected, today).toLowerCase()})
                      </p>
                    ) : (
                      <p className="text-sm text-muted">Not yet</p>
                    )}
                    {isNext && m.markable && (
                      <div className="mt-2">
                        <MilestoneForm batchId={id} milestone={m.key as "flower" | "harvest" | "end"} label={MARK_LABEL[m.key as keyof typeof MARK_LABEL]} today={today} />
                      </div>
                    )}
                    {isNext && m.key === "transplanted" && (
                      <Link href={`/batches/${id}/edit`} className="mt-2 inline-flex min-h-11 items-center rounded-lg border border-line px-3.5 text-[13px] font-medium text-accent hover:bg-surface-2">
                        Moved to polybags? Add the date
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </Card>

          <Card>
            <div className="px-5 pt-5 md:px-6">
              <SectionTitle action={<TextLink href={`/timeline?batch=${id}&range=all`}>See all</TextLink>}>Done for this batch</SectionTitle>
            </div>
            {activities.length === 0 ? (
              <p className="px-5 pb-5 text-[15px] text-muted md:px-6">Nothing logged for this batch yet.</p>
            ) : (
              <div className="divide-y divide-line border-t border-line">
                {activities.slice(0, 12).map((a) => (
                  <ActivityRow key={a.id} activity={a} products={products} dateLabel={relativeDay(dayKey(a.occurredAt), today)} />
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card className="p-5">
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Seeds sown">{batch.seedsCount?.toLocaleString("en-MY")}</Field>
              <Field label="Polybags">{batch.polybagsCount?.toLocaleString("en-MY")}</Field>
              <Field label={ENTRY_META.spray.label + "s"}>{count("spray")}</Field>
              <Field label="Tank mixes">{count("tank_mix")}</Field>
              <Field label="Other baja">{count("fertilizer")}</Field>
              <Field label="Problems">{problems.length}</Field>
            </dl>
            {batch.notes && (
              <div className="mt-4 border-t border-line pt-3">
                <Field label="Notes">{batch.notes}</Field>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <SectionTitle action={<TextLink href="/problems/new">New problem</TextLink>}>Problems in this batch</SectionTitle>
            {problems.length === 0 ? (
              <EmptyState>No problems recorded.</EmptyState>
            ) : (
              <ul className="space-y-2">
                {problems.map((p) => (
                  <li key={p.id}>
                    <Link href={`/problems/${p.id}`} className="flex items-start justify-between gap-2 rounded-xl border border-line p-3 hover:bg-surface-2">
                      <span className="min-w-0">
                        <span className="block text-[15px] font-medium">{p.title}</span>
                        <span className="block text-sm text-muted">{formatLong(p.foundOn)}</span>
                      </span>
                      <StatusBadge problem={p} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <PhotoGallery photos={batch.photos} />
        </div>
      </div>
    </div>
  );
}

function DiffNote({ actual, expected }: { actual: string; expected: string }) {
  const d = diffDays(actual, expected);
  if (d === 0) return <span className="text-good-ink"> · right on time</span>;
  return (
    <span className={d < 0 ? "text-good-ink" : "text-warn-ink"}>
      {" "}
      · {Math.abs(d)} days {d < 0 ? "early" : "late"} (expected {formatLong(expected)})
    </span>
  );
}
