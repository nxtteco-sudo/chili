import type { Metadata } from "next";
import { Suspense } from "react";
import { ProblemForm } from "@/components/problem-forms";
import { PageHeader, PageSkeleton } from "@/components/ui";
import { getActiveBatches, getToday } from "@/lib/data";

export const metadata: Metadata = { title: "New problem" };

export default function NewProblemPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New problem" subtitle="Masalah baru. Add photos so you can compare later." />
      <Suspense fallback={<PageSkeleton />}>
        <NewProblem />
      </Suspense>
    </div>
  );
}

async function NewProblem() {
  const [today, batches] = await Promise.all([getToday(), getActiveBatches()]);
  // With one active batch it is almost certainly the one; with several, let him pick.
  const options = batches.map((b) => ({ id: b.batch.id, name: b.batch.name }));
  const growing = batches.filter((b) => b.info.stage !== "nursery");
  return (
    <ProblemForm
      today={today}
      batches={options}
      defaultBatchId={growing.length === 1 ? growing[0].batch.id : undefined}
      cancelHref="/problems"
    />
  );
}
