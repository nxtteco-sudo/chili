import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ChevronRight, Plus, Sprout } from "lucide-react";
import { ButtonLink, Card, EmptyState, PageHeader, PageSkeleton } from "@/components/ui";
import { getBatches, getVarieties } from "@/lib/data";

export const metadata: Metadata = { title: "Varieties" };

export default function VarietiesPage() {
  return (
    <>
      <PageHeader
        title="Varieties"
        subtitle="Jenis cili, with your own day counts for expected dates"
        action={
          <ButtonLink href="/varieties/new">
            <Plus className="size-5" /> New variety
          </ButtonLink>
        }
      />
      <Suspense fallback={<PageSkeleton />}>
        <Varieties />
      </Suspense>
    </>
  );
}

async function Varieties() {
  const [varieties, batches] = await Promise.all([getVarieties(), getBatches()]);
  if (varieties.length === 0) return <EmptyState>No varieties yet. Add the chili varieties you plant.</EmptyState>;
  return (
    <Card>
      <ul className="divide-y divide-line">
        {varieties.map((v) => {
          const used = batches.filter((b) => b.batch.varietyId === v.id).length;
          const days = [
            v.daysSowToTransplant !== undefined && `${v.daysSowToTransplant}d to polybag`,
            v.daysTransplantToFlower !== undefined && `${v.daysTransplantToFlower}d to flowers`,
            v.daysTransplantToHarvest !== undefined && `${v.daysTransplantToHarvest}d to first harvest`,
            v.harvestSeasonDays !== undefined && `${v.harvestSeasonDays}d harvest season`,
          ].filter(Boolean);
          return (
            <li key={v.id}>
              <Link href={`/varieties/${v.id}/edit`} className="flex items-center gap-3 px-5 py-4 hover:bg-surface-2">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                  <Sprout className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium">{v.name}</span>
                  <span className="block text-sm text-ink-2">{days.length ? days.join(" · ") : "No day counts yet"}</span>
                </span>
                <span className="shrink-0 text-sm text-muted">{used} {used === 1 ? "batch" : "batches"}</span>
                <ChevronRight className="size-5 shrink-0 text-muted" />
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
