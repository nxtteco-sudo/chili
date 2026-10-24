import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Lightbulb, Plus } from "lucide-react";
import { PhotoTile } from "@/components/photo-tile";
import { SearchForm } from "@/components/search-form";
import { ButtonLink, Chips, EmptyState, PageHeader, PageSkeleton, StatusBadge } from "@/components/ui";
import { getActivities, getProblems, getToday } from "@/lib/data";
import { formatLong, relativeDay } from "@/lib/dates";
import { href, oneOf, param } from "@/lib/params";
import type { Problem } from "@/lib/types";

export const metadata: Metadata = { title: "Problems" };

export default function ProblemsPage(props: PageProps<"/problems">) {
  return (
    <>
      <PageHeader
        title="Problems"
        subtitle="Masalah & penyelesaian: what went wrong and what fixed it"
        action={
          <ButtonLink href="/problems/new">
            <Plus className="size-5" /> <span>New problem</span>
          </ButtonLink>
        }
      />
      <Suspense fallback={<PageSkeleton />}>
        <ProblemList searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function ProblemList({ searchParams }: { searchParams: PageProps<"/problems">["searchParams"] }) {
  const sp = await searchParams;
  const status = oneOf(param(sp, "status"), ["open", "resolved"] as const);
  const q = param(sp, "q");
  const [today, all, problems, linked] = await Promise.all([
    getToday(),
    getProblems(),
    getProblems({ status, q }),
    getActivities(),
  ]);
  const actionCount = (p: Problem) =>
    linked.filter((a) => a.problemId === p.id).length + p.updates.filter((u) => u.kind === "action").length;

  return (
    <div className="space-y-4">
      <SearchForm
        action="/problems"
        q={q}
        placeholder="Search: daun kerinting, buah reput, thrips…"
        keep={{ status }}
      />
      <Chips
        items={[
          { href: href("/problems", { q }), label: `All ${all.length}`, active: !status },
          {
            href: href("/problems", { q, status: "open" }),
            label: `Open ${all.filter((p) => p.status === "open").length}`,
            active: status === "open",
          },
          {
            href: href("/problems", { q, status: "resolved" }),
            label: `Resolved ${all.filter((p) => p.status === "resolved").length}`,
            active: status === "resolved",
          },
        ]}
      />

      {problems.length === 0 ? (
        <EmptyState>No problems match{q ? ` “${q}”` : ""}.</EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {problems.map((p) => (
            <li key={p.id}>
              <Link
                href={`/problems/${p.id}`}
                className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-colors hover:bg-surface-2"
              >
                {p.photos[0] && (
                  <PhotoTile photo={p.photos[0]} className="aspect-[16/9] rounded-none" />
                )}
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-[17px] font-semibold leading-snug">{p.title}</h2>
                    <StatusBadge problem={p} />
                  </div>
                  <p className="mt-1 text-sm text-ink-2">
                    {formatLong(p.foundOn)} · {relativeDay(p.foundOn, today)}
                  </p>
                  <p className="mt-2 text-sm text-ink-2">
                    <span className="text-muted">Cause:</span> {p.suspectedCause}
                  </p>
                  {p.lesson ? (
                    <p className="mt-3 flex gap-2 rounded-lg bg-surface-2 p-2.5 text-sm">
                      <Lightbulb className="mt-0.5 size-4 shrink-0 text-warn" />
                      <span className="line-clamp-3">{p.lesson}</span>
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-muted">
                      {actionCount(p)} {actionCount(p) === 1 ? "action" : "actions"} so far
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
