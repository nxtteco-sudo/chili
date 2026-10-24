import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ChevronRight, Plus, Sprout } from "lucide-react";
import { BatchCard } from "@/components/batch-card";
import { ButtonLink, Card, EmptyState, PageHeader, PageSkeleton, SectionTitle } from "@/components/ui";
import { getBatches, getToday } from "@/lib/data";
import { diffDays, formatLong } from "@/lib/dates";

export const metadata: Metadata = { title: "Batches" };

export default function BatchesPage() {
  return (
    <>
      <PageHeader
        title="Batches"
        subtitle="Musim tanam: each planting, from seed to the end of harvest"
        action={
          <div className="flex gap-2">
            <ButtonLink href="/varieties" variant="secondary">
              Varieties
            </ButtonLink>
            <ButtonLink href="/batches/new">
              <Plus className="size-5" /> New batch
            </ButtonLink>
          </div>
        }
      />
      <Suspense fallback={<PageSkeleton />}>
        <Batches />
      </Suspense>
    </>
  );
}

async function Batches() {
  const [today, batches] = await Promise.all([getToday(), getBatches()]);
  const active = batches.filter((b) => b.active);
  const ended = batches.filter((b) => !b.active);

  if (batches.length === 0)
    return (
      <EmptyState>
        No batches yet.{" "}
        <Link href="/batches/new" className="font-medium text-accent underline">
          Add the first planting batch
        </Link>
        .
      </EmptyState>
    );

  return (
    <div className="space-y-8">
      <section>
        <SectionTitle>Growing now</SectionTitle>
        {active.length === 0 ? (
          <EmptyState>Nothing growing right now.</EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {active.map((b) => (
              <BatchCard key={b.batch.id} view={b} today={today} />
            ))}
          </div>
        )}
      </section>

      {ended.length > 0 && (
        <section>
          <SectionTitle>Finished</SectionTitle>
          <Card>
            <ul className="divide-y divide-line">
              {ended.map(({ batch: b, variety }) => (
                <li key={b.id}>
                  <Link href={`/batches/${b.id}`} className="flex items-center gap-3 px-5 py-4 hover:bg-surface-2">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
                      <Sprout className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">{b.name}</span>
                      <span className="block truncate text-sm text-ink-2">
                        {variety?.name ?? "Variety not set"}
                        {b.endedOn && ` · ended ${formatLong(b.endedOn)}`}
                        {b.transplantedOn && b.firstHarvestOn && ` · first harvest on day ${diffDays(b.firstHarvestOn, b.transplantedOn)}`}
                      </span>
                    </span>
                    <ChevronRight className="size-5 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}
    </div>
  );
}
