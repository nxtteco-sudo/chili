import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { deleteProblem } from "@/app/actions";
import { DeleteButton } from "@/components/form-ui";
import { ProblemForm } from "@/components/problem-forms";
import { PageHeader, PageSkeleton } from "@/components/ui";
import { getProblem, getToday } from "@/lib/data";

export const metadata: Metadata = { title: "Edit problem" };

export default function EditProblemPage(props: PageProps<"/problems/[id]/edit">) {
  return (
    <div className="mx-auto max-w-2xl">
      <Suspense fallback={<PageSkeleton />}>
        <EditProblem params={props.params} />
      </Suspense>
    </div>
  );
}

async function EditProblem({ params }: { params: PageProps<"/problems/[id]/edit">["params"] }) {
  const { id } = await params;
  const problem = await getProblem(id);
  if (!problem) notFound();
  return (
    <>
      <PageHeader
        title="Edit problem"
        action={
          <DeleteButton
            action={deleteProblem}
            fields={{ id }}
            confirmText="Delete this problem and all its updates? Sprays and baja linked to it are kept. This can't be undone."
          />
        }
      />
      <ProblemForm problem={problem} today={await getToday()} cancelHref={`/problems/${id}`} />
    </>
  );
}
