import type { Metadata } from "next";
import { Suspense } from "react";
import { VarietyForm } from "@/components/batch-forms";
import { PageHeader, PageSkeleton } from "@/components/ui";
import { param } from "@/lib/params";

export const metadata: Metadata = { title: "New variety" };

export default function NewVarietyPage(props: PageProps<"/varieties/new">) {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New variety" subtitle="Jenis cili baru" />
      <Suspense fallback={<PageSkeleton />}>
        <NewVariety searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function NewVariety({ searchParams }: { searchParams: PageProps<"/varieties/new">["searchParams"] }) {
  const returnTo = param(await searchParams, "return");
  const safe = returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : undefined;
  return <VarietyForm returnTo={safe} cancelHref={safe ?? "/varieties"} />;
}
