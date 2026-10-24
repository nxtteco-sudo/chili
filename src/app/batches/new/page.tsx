import type { Metadata } from "next";
import { Suspense } from "react";
import { BatchForm } from "@/components/batch-forms";
import { PageHeader, PageSkeleton } from "@/components/ui";
import { getVarieties } from "@/lib/data";
import { param } from "@/lib/params";

export const metadata: Metadata = { title: "New batch" };

export default function NewBatchPage(props: PageProps<"/batches/new">) {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New batch" subtitle="Musim tanam baru. Add the sowing date, and the polybag date when you move them." />
      <Suspense fallback={<PageSkeleton />}>
        <NewBatch searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function NewBatch({ searchParams }: { searchParams: PageProps<"/batches/new">["searchParams"] }) {
  const sp = await searchParams;
  const varietyId = param(sp, "variety");
  return (
    // Remount after "new variety" returns here, so it is preselected.
    <BatchForm key={varietyId ?? ""} varieties={await getVarieties()} defaultVarietyId={varietyId} cancelHref="/batches" returnHref="/batches/new" />
  );
}
