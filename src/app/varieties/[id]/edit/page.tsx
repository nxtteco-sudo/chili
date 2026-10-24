import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { deleteVariety } from "@/app/actions";
import { VarietyForm } from "@/components/batch-forms";
import { DeleteButton } from "@/components/form-ui";
import { PageHeader, PageSkeleton } from "@/components/ui";
import { getBatches, getVariety } from "@/lib/data";

export const metadata: Metadata = { title: "Edit variety" };

export default function EditVarietyPage(props: PageProps<"/varieties/[id]/edit">) {
  return (
    <div className="mx-auto max-w-2xl">
      <Suspense fallback={<PageSkeleton />}>
        <EditVariety params={props.params} />
      </Suspense>
    </div>
  );
}

async function EditVariety({ params }: { params: PageProps<"/varieties/[id]/edit">["params"] }) {
  const { id } = await params;
  const variety = await getVariety(id);
  if (!variety) notFound();
  const used = (await getBatches()).filter((b) => b.batch.varietyId === id).length;
  return (
    <>
      <PageHeader
        title={variety.name}
        subtitle={used ? `Used by ${used} ${used === 1 ? "batch" : "batches"}. Changing day counts updates their expected dates.` : undefined}
        action={used === 0 && <DeleteButton action={deleteVariety} fields={{ id }} confirmText={`Delete ${variety.name}?`} />}
      />
      <VarietyForm variety={variety} cancelHref="/varieties" />
    </>
  );
}
