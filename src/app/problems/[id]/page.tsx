import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, History, Lightbulb, Pencil, RotateCcw, Wrench } from "lucide-react";
import { deleteProblemUpdate, reopenProblem } from "@/app/actions";
import { DeleteButton } from "@/components/form-ui";
import { CloseProblemForm, ProblemUpdateForm } from "@/components/problem-forms";
import { PhotoGallery, PhotoTile } from "@/components/photo-tile";
import { ButtonLink, Card, Field, PageSkeleton, SectionTitle, StatusBadge, TypeIcon } from "@/components/ui";
import { getActivities, getProblem, getProducts, getSimilarProblems, getToday } from "@/lib/data";
import { dayKey, diffDays, formatLong, formatShort, formatTime, nowTime, relativeDay } from "@/lib/dates";
import { describeActivity } from "@/lib/describe";
import { ENTRY_META, OUTCOME_META, SEVERITY_LABEL } from "@/lib/entry-meta";
import { cn, formatRm } from "@/lib/format";
import type { Activity, Photo, ProblemUpdate } from "@/lib/types";

export default function ProblemPage(props: PageProps<"/problems/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProblemDetail params={props.params} />
    </Suspense>
  );
}

type Step =
  | { kind: "activity"; at: string; activity: Activity }
  | { kind: "update"; at: string; update: ProblemUpdate };

async function ProblemDetail({ params }: { params: PageProps<"/problems/[id]">["params"] }) {
  const { id } = await params;
  const problem = await getProblem(id);
  if (!problem) notFound();

  const [today, products, linked, similar] = await Promise.all([
    getToday(),
    getProducts(),
    getActivities({ problemId: id }),
    getSimilarProblems(problem),
  ]);

  const steps: Step[] = [
    ...linked.map((a) => ({ kind: "activity" as const, at: a.occurredAt, activity: a })),
    ...problem.updates.map((u) => ({ kind: "update" as const, at: u.occurredAt, update: u })),
  ].sort((a, z) => a.at.localeCompare(z.at));

  const allPhotos: Photo[] = [
    ...problem.photos,
    ...problem.updates.flatMap((u) => u.photos),
    ...linked.flatMap((a) => a.photos),
  ];
  const spent = linked.reduce((s, a) => s + describeActivity(a, products).cost, 0);
  const lasted = diffDays(problem.resolvedOn ?? today, problem.foundOn);
  const lastTime =
    problem.status === "open" ? similar.find((p) => p.status === "resolved" && p.lesson) : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/problems" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
          <ArrowLeft className="size-4" /> Problems
        </Link>
        <ButtonLink href={`/problems/${problem.id}/edit`} variant="secondary">
          <Pencil className="size-4" /> Edit
        </ButtonLink>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight md:text-[28px]">{problem.title}</h1>
          <p className="mt-1 text-[15px] text-ink-2">
            Found {formatLong(problem.foundOn)} ({relativeDay(problem.foundOn, today).toLowerCase()})
            {problem.resolvedOn && <> · closed {formatLong(problem.resolvedOn)}</>}
          </p>
        </div>
        <StatusBadge problem={problem} />
      </header>

      {lastTime && (
        <Link
          href={`/problems/${lastTime.id}`}
          className="block rounded-2xl border border-accent/30 bg-accent-soft p-4 transition-colors hover:border-accent/60"
        >
          <p className="flex items-center gap-2 text-sm font-medium text-accent">
            <History className="size-4" /> This happened before · {formatLong(lastTime.foundOn)}
          </p>
          <p className="mt-1.5 text-[17px] font-medium">{lastTime.title}</p>
          <p className="mt-1 text-[15px] leading-relaxed text-ink-2">{lastTime.lesson}</p>
          {lastTime.outcome && (
            <p className="mt-2 text-sm text-ink-2">
              Last time: {OUTCOME_META[lastTime.outcome].label} after{" "}
              {diffDays(lastTime.resolvedOn ?? today, lastTime.foundOn)} days. Tap to see exactly what was done.
            </p>
          )}
        </Link>
      )}

      {problem.status === "resolved" && problem.outcome && (
        <Card
          className={cn(
            "p-4",
            OUTCOME_META[problem.outcome].tone === "good" && "border-good/40 bg-good-soft",
            OUTCOME_META[problem.outcome].tone === "warn" && "border-warn/40 bg-warn-soft",
            OUTCOME_META[problem.outcome].tone === "bad" && "border-problem/40 bg-problem-soft",
          )}
        >
          <p className="flex items-center gap-2 text-sm font-medium text-ink-2">
            <Lightbulb className="size-4" /> What we learned · Pengajaran
          </p>
          <p className="mt-1.5 text-[17px] leading-relaxed">{problem.lesson}</p>
          <p className="mt-2 text-sm text-ink-2">
            Result: {OUTCOME_META[problem.outcome].label} ({OUTCOME_META[problem.outcome].malay}) after {lasted} days
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <PhotoGallery photos={allPhotos} />

          <Card className="p-4">
            <SectionTitle>
              <span className="flex items-center gap-2">
                <Wrench className="size-4 text-muted" /> What we did
              </span>
            </SectionTitle>
            {steps.length === 0 && <p className="text-[15px] text-muted">Nothing done yet. Add an update below.</p>}
            <ol className="relative space-y-4 border-l border-line pl-5">
              {steps.map((s) => (
                <li key={s.kind === "activity" ? s.activity.id : s.update.id} className="relative">
                  <span
                    className={cn(
                      "absolute -left-[26px] top-1.5 size-2.5 rounded-full ring-4 ring-surface",
                      s.kind === "activity"
                        ? ENTRY_META[s.activity.type].dot
                        : s.update.kind === "action"
                          ? "bg-ink-2"
                          : "bg-axis",
                    )}
                  />
                  <p className="text-xs text-muted">
                    {formatShort(dayKey(s.at))} · {formatTime(s.at)} · day{" "}
                    {diffDays(dayKey(s.at), problem.foundOn) + 1}
                  </p>
                  {s.kind === "activity" ? (
                    <ActivityStep activity={s.activity} products={products} />
                  ) : (
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        {s.update.body && (
                          <p className="mt-0.5 text-[15px]">
                            {s.update.kind === "action" && <b className="font-medium">Action: </b>}
                            {s.update.body}
                          </p>
                        )}
                        {s.update.photos.length > 0 && (
                          <div className="mt-2 flex gap-2">
                            {s.update.photos.map((ph) => (
                              <PhotoTile key={ph.id} photo={ph} showCaption={false} className="size-16" />
                            ))}
                          </div>
                        )}
                      </div>
                      <DeleteButton
                        action={deleteProblemUpdate}
                        fields={{ problemId: problem.id, updateId: s.update.id }}
                        label=""
                        confirmText="Delete this update?"
                        className="h-8 px-2 text-muted"
                      />
                    </div>
                  )}
                </li>
              ))}
            </ol>
            {spent > 0 && (
              <p className="mt-4 border-t border-line pt-3 text-sm text-ink-2">
                Spent on this problem: <span className="tabular font-medium text-ink">{formatRm(spent)}</span>
              </p>
            )}
          </Card>

          {problem.status === "open" ? (
            <>
              <Card className="p-4">
                <SectionTitle>Add to this problem</SectionTitle>
                <div className="mb-4 flex flex-wrap gap-2">
                  <ButtonLink href={`/log/new?type=spray&problem=${problem.id}`} variant="secondary">
                    <TypeIcon type="spray" size="sm" /> Log a spray
                  </ButtonLink>
                  <ButtonLink href={`/log/new?type=fertilizer&problem=${problem.id}`} variant="secondary">
                    <TypeIcon type="fertilizer" size="sm" /> Log baja
                  </ButtonLink>
                </div>
                <ProblemUpdateForm problemId={problem.id} today={today} now={nowTime()} />
              </Card>
              <CloseProblemForm problemId={problem.id} today={today} />
            </>
          ) : (
            <form action={reopenProblem}>
              <input type="hidden" name="problemId" value={problem.id} />
              <button
                type="submit"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface text-base font-medium hover:bg-surface-2"
              >
                <RotateCcw className="size-5 text-muted" /> Reopen problem
              </button>
            </form>
          )}
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card className="p-4">
            <dl className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Field label="Symptoms">{problem.symptoms}</Field>
              </div>
              <Field label="Suspected cause">{problem.suspectedCause}</Field>
              <Field label="Affected part">
                <span className="capitalize">{problem.affectedPart}</span>
              </Field>
              <Field label="Severity">{SEVERITY_LABEL[problem.severity]}</Field>
              <Field label="Duration">{lasted} days</Field>
              <div className="col-span-2">
                <dt className="text-xs uppercase tracking-wide text-muted">Tags</dt>
                <dd className="mt-1.5 flex flex-wrap gap-1.5">
                  {problem.tags.map((t) => (
                    <Link
                      key={t}
                      href={`/problems?q=${encodeURIComponent(t)}`}
                      className="rounded-full bg-surface-2 px-2.5 py-0.5 text-sm text-ink-2 hover:text-ink"
                    >
                      {t}
                    </Link>
                  ))}
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="p-4">
            <SectionTitle>
              <span className="flex items-center gap-2">
                <History className="size-4 text-muted" /> Seen before? · Pernah jadi
              </span>
            </SectionTitle>
            {similar.length === 0 ? (
              <p className="text-[15px] text-muted">No similar problems recorded.</p>
            ) : (
              <ul className="space-y-3">
                {similar.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/problems/${p.id}`}
                      className="block rounded-xl border border-line p-3 transition-colors hover:bg-surface-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[15px] font-medium">{p.title}</p>
                        <StatusBadge problem={p} />
                      </div>
                      <p className="text-sm text-muted">{formatLong(p.foundOn)}</p>
                      {p.lesson && <p className="mt-1.5 line-clamp-3 text-sm text-ink-2">{p.lesson}</p>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function ActivityStep({ activity, products }: { activity: Activity; products: Parameters<typeof describeActivity>[1] }) {
  const { title, detail } = describeActivity(activity, products);
  return (
    <Link
      href={`/entries/${activity.id}`}
      className="mt-1 flex items-center gap-3 rounded-xl border border-line p-2.5 transition-colors hover:bg-surface-2"
    >
      <TypeIcon type={activity.type} size="sm" />
      <div className="min-w-0">
        <p className="truncate text-[15px] font-medium">{title}</p>
        <p className="truncate text-sm text-ink-2">{detail}</p>
      </div>
    </Link>
  );
}
