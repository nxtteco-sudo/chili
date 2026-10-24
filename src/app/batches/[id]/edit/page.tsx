import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { deleteBatch } from "@/app/actions";
import { BatchForm } from "@/components/batch-forms";
import { DeleteButton } from "@/components/form-ui";
import { PageHeader, PageSkeleton } from "@/components/ui";
import { getBatch, getVarieties } from "@/lib/data";
import { param } from "@/lib/params";

export const metadata: Metadata = { title: "Edit batch" };

export default function EditBatchPage(props: PageProps<"/batches/[id]/edit">) {
  return (
    <div className="mx-auto max-w-2xl">
      <Suspense fallback={<PageSkeleton />}>
        <EditBatch params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function EditBatch({
  params,
  searchParams,
}: {
  params: PageProps<"/batches/[id]/edit">["params"];
  searchParams: PageProps<"/batches/[id]/edit">["searchParams"];
}) {
  const { id } = await params;
  const view = await getBatch(id);
  if (!view) notFound();
  const varietyId = param(await searchParams, "variety");
  return (
    <>
      <PageHeader
        title="Edit batch"
        action={
          <DeleteButton
            action={deleteBatch}
            fields={{ id }}
            confirmText="Delete this batch? Sprays, tank mixes and problems are kept but no longer linked to it. This can't be undone."
          />
        }
      />
      <BatchForm
        key={varietyId ?? ""}
        batch={varietyId ? { ...view.batch, varietyId } : view.batch}
        varieties={await getVarieties()}
        cancelHref={`/batches/${id}`}
        returnHref={`/batches/${id}/edit`}
      />
    </>
  );
}
