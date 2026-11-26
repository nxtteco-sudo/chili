import type { Metadata } from "next";
import { Suspense } from "react";
import { DripForm } from "@/components/drip-form";
import { PageHeader, PageSkeleton } from "@/components/ui";
import { getToday } from "@/lib/data";
import { nowTime } from "@/lib/dates";

export const metadata: Metadata = { title: "Log drip reading" };

export default function DripPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Log drip reading" subtitle="EC and pH measured at the drip line" />
      <Suspense fallback={<PageSkeleton />}>
        <Form />
      </Suspense>
    </div>
  );
}

async function Form() {
  const today = await getToday();
  return <DripForm defaults={{ date: today, time: nowTime() }} cancelHref="/log" />;
}
