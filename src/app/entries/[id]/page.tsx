import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, MessageSquareText, Pencil, TriangleAlert } from "lucide-react";
import { PhotoGallery } from "@/components/photo-tile";
import { ButtonLink, Card, Field, PageSkeleton, StatusBadge, TypeBadge, TypeIcon } from "@/components/ui";
import { getActivity, getProblem, getProducts, getToday } from "@/lib/data";
import { dayKey, formatFull, formatLong, formatTime, relativeDay } from "@/lib/dates";
import { describeActivity } from "@/lib/describe";
import { FERT_METHOD_LABEL, STAGE_LABEL, WATER_METHOD_LABEL } from "@/lib/entry-meta";
import { formatQty, formatRm } from "@/lib/format";
import type { Activity, Product } from "@/lib/types";

export default function EntryPage(props: PageProps<"/entries/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EntryDetail params={props.params} />
    </Suspense>
  );
}

async function EntryDetail({ params }: { params: PageProps<"/entries/[id]">["params"] }) {
  const { id } = await params;
  const activity = await getActivity(id);
  if (!activity) notFound();

  const [today, products, problem] = await Promise.all([
    getToday(),
    getProducts(),
    activity.problemId ? getProblem(activity.problemId) : Promise.resolve(undefined),
  ]);
  const { title } = describeActivity(activity, products);
  const key = dayKey(activity.occurredAt);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/timeline" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
          <ArrowLeft className="size-4" /> Timeline
        </Link>
        <ButtonLink href={`/entries/${activity.id}/edit`} variant="secondary">
          <Pencil className="size-4" /> Edit
        </ButtonLink>
      </div>

      <header className="flex items-center gap-4">
        <TypeIcon type={activity.type} size="lg" />
        <div className="min-w-0">
          <TypeBadge type={activity.type} />
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-[15px] text-ink-2">
            {formatFull(key)} · {formatTime(activity.occurredAt)} ({relativeDay(key, today).toLowerCase()})
          </p>
        </div>
      </header>

      {problem && (
        <Link
          href={`/problems/${problem.id}`}
          className="flex items-center gap-3 rounded-2xl border border-problem/30 bg-problem-soft p-3.5 transition-colors hover:border-problem/60"
        >
          <TriangleAlert className="size-5 shrink-0 text-problem" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ink-2">Done for problem</p>
            <p className="truncate text-[15px] font-medium">{problem.title}</p>
          </div>
          <StatusBadge problem={problem} />
        </Link>
      )}

      <Card className="p-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
          <Details activity={activity} products={products} today={today} />
        </dl>
        {activity.notes && (
          <div className="mt-4 border-t border-line pt-3">
            <Field label="Notes">{activity.notes}</Field>
          </div>
        )}
      </Card>

      <PhotoGallery photos={activity.photos} />

      {activity.rawMessage && (
        <Card className="p-4">
          <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted">
            <MessageSquareText className="size-4" /> Original Telegram message
          </p>
          <p className="mt-2 inline-block rounded-2xl rounded-tl-sm bg-surface-2 px-3.5 py-2 text-[15px]">
            {activity.rawMessage}
          </p>
        </Card>
      )}
    </div>
  );
}

function Details({ activity, products, today }: { activity: Activity; products: Product[]; today: string }) {
  if (activity.type === "spray") {
    const s = activity.spray;
    const p = products.find((x) => x.id === s.productId);
    const safeNow = s.safeHarvestOn <= today;
    return (
      <>
        <Field label="Product">
          {p ? <Link href={`/products/${p.id}`} className="text-accent hover:underline">{p.name}</Link> : "—"}
        </Field>
        <Field label="Type">{p?.subtype}</Field>
        <Field label="Active ingredient">{p?.activeIngredient}</Field>
        <Field label="Target">{s.target}</Field>
        <Field label="Dosage">
          {formatQty(s.dosePerTank, s.doseUnit)} per {s.tankSizeL} L tong
        </Field>
        <Field label="Tanks">{s.tanks} tong</Field>
        <Field label="Total used">{formatQty(s.totalQty, s.doseUnit)}</Field>
        <Field label="Cost">{formatRm(s.costRm)}</Field>
        <Field label="Weather">{s.weather}</Field>
        <Field label="Waiting period">{p?.phiDays ?? 0} days</Field>
        <div className="col-span-2">
          <Field label="Safe to harvest from">
            <span className={safeNow ? "text-good-ink" : "font-medium text-warn-ink"}>
              {formatLong(s.safeHarvestOn)} ({safeNow ? "safe now" : relativeDay(s.safeHarvestOn, today).toLowerCase()})
            </span>
          </Field>
        </div>
      </>
    );
  }
  if (activity.type === "fertilizer") {
    const f = activity.fertilizer;
    const p = products.find((x) => x.id === f.productId);
    return (
      <>
        <Field label="Product">
          {p ? <Link href={`/products/${p.id}`} className="text-accent hover:underline">{p.name}</Link> : "—"}
        </Field>
        <Field label="Type">{p?.subtype}</Field>
        <Field label="NPK">{p?.npk}</Field>
        <Field label="Quantity">{formatQty(f.quantity, f.unit)}</Field>
        <Field label="Method">{FERT_METHOD_LABEL[f.method]}</Field>
        <Field label="Plant stage">{STAGE_LABEL[f.plantStage]}</Field>
        <Field label="Cost">{formatRm(f.costRm)}</Field>
      </>
    );
  }
  const w = activity.water;
  return (
    <>
      <Field label="Method">{WATER_METHOD_LABEL[w.method]}</Field>
      <Field label="Duration">{w.durationMin ? `${w.durationMin} min` : undefined}</Field>
      <Field label="Volume">{w.volumeL ? `~${formatQty(w.volumeL, "L")}` : undefined}</Field>
      <Field label="Rain">{w.rained ? (w.rainNote ?? "Yes") : "No rain"}</Field>
    </>
  );
}
