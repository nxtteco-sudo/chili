import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { deleteActivity } from "@/app/actions";
import { ActivityForm } from "@/components/activity-form";
import { DeleteButton } from "@/components/form-ui";
import { PageHeader, PageSkeleton } from "@/components/ui";
import { getActivity, getProblems, getProducts, getToday } from "@/lib/data";
import { nowTime } from "@/lib/dates";
import { ENTRY_META } from "@/lib/entry-meta";

export const metadata: Metadata = { title: "Edit entry" };

export default function EditEntryPage(props: PageProps<"/entries/[id]/edit">) {
  return (
    <div className="mx-auto max-w-2xl">
      <Suspense fallback={<PageSkeleton />}>
        <EditEntry params={props.params} />
      </Suspense>
    </div>
  );
}

async function EditEntry({ params }: { params: PageProps<"/entries/[id]/edit">["params"] }) {
  const { id } = await params;
  const activity = await getActivity(id);
  if (!activity) notFound();
  const [today, products, problems] = await Promise.all([getToday(), getProducts(), getProblems()]);
  const options = problems
    .filter((p) => p.status === "open" || p.id === activity.problemId)
    .map((p) => ({ id: p.id, title: p.title, status: p.status }));

  return (
    <>
      <PageHeader
        title={`Edit ${ENTRY_META[activity.type].label.toLowerCase()}`}
        action={
          <DeleteButton
            action={deleteActivity}
            fields={{ id }}
            confirmText="Delete this entry? This can't be undone."
          />
        }
      />
      <ActivityForm
        type={activity.type}
        activity={activity}
        products={products}
        problems={options}
        defaults={{ date: today, time: nowTime(), plantStage: "vegetative" }}
        cancelHref={`/entries/${id}`}
        returnHref={`/entries/${id}/edit`}
      />
    </>
  );
}
