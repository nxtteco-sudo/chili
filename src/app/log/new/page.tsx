import type { Metadata } from "next";
import { Suspense } from "react";
import { ActivityForm } from "@/components/activity-form";
import { Chips, PageHeader, PageSkeleton } from "@/components/ui";
import { STAGE_META } from "@/lib/batches";
import { getActiveBatches, getActivities, getProblems, getProducts, getToday } from "@/lib/data";
import { nowTime } from "@/lib/dates";
import { ENTRY_META } from "@/lib/entry-meta";
import { href, oneOf, param } from "@/lib/params";

export const metadata: Metadata = { title: "New entry" };

const TYPES = ["spray", "tank_mix", "fertilizer"] as const;

export default function NewEntryPage(props: PageProps<"/log/new">) {
  return (
    <div className="mx-auto max-w-2xl">
      <Suspense fallback={<PageSkeleton />}>
        <NewEntry searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function NewEntry({ searchParams }: { searchParams: PageProps<"/log/new">["searchParams"] }) {
  const sp = await searchParams;
  const type = oneOf(param(sp, "type"), TYPES) ?? "spray";
  const productId = param(sp, "product");
  const problemId = param(sp, "problem");

  const [today, products, problems, batches, lastTank] = await Promise.all([
    getToday(),
    getProducts(),
    getProblems(),
    getActiveBatches(),
    getActivities({ type: "tank_mix" }),
  ]);
  const options = problems
    .filter((p) => p.status === "open" || p.id === problemId)
    .map((p) => ({ id: p.id, title: p.title, status: p.status }));
  // A spray for a problem defaults to that problem's batch; otherwise every active batch.
  const problemBatch = problems.find((p) => p.id === problemId)?.batchId;
  const batchOptions = batches
    .filter((b) => b.info.stage !== "nursery" || type !== "tank_mix")
    .map((b) => ({ id: b.batch.id, name: b.batch.name, stage: STAGE_META[b.info.stage].label }));
  const defaultBatchIds = problemBatch
    ? [problemBatch]
    : batchOptions.filter((b) => batches.find((x) => x.batch.id === b.id)?.info.stage !== "nursery").map((b) => b.id);
  const meta = ENTRY_META[type];

  return (
    <>
      <PageHeader title={`Log ${meta.label.toLowerCase()}`} subtitle={meta.malay !== meta.label ? meta.malay : undefined} />
      <div className="mb-4">
        <Chips
          items={TYPES.map((t) => ({
            href: href("/log/new", { type: t, problem: problemId }),
            label: ENTRY_META[t].label,
            active: t === type,
          }))}
        />
      </div>
      {/* Remount when the URL preselects something, so stale form state from a cached render can't win. */}
      <ActivityForm
        key={`${type}-${productId ?? ""}-${problemId ?? ""}`}
        type={type}
        products={products}
        problems={options}
        batches={batchOptions}
        defaults={{ date: today, time: nowTime(), productId, problemId, batchIds: defaultBatchIds }}
        lastTankMix={lastTank[0]?.type === "tank_mix" ? lastTank[0].tankMix : undefined}
        cancelHref={problemId ? `/problems/${problemId}` : "/"}
        returnHref={href("/log/new", { type, problem: problemId })}
      />
    </>
  );
}
