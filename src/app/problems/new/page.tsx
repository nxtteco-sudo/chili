import type { Metadata } from "next";
import { Suspense } from "react";
import { ProblemForm } from "@/components/problem-forms";
import { PageHeader, PageSkeleton } from "@/components/ui";
import { getToday } from "@/lib/data";

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
  return <ProblemForm today={await getToday()} cancelHref="/problems" />;
}
