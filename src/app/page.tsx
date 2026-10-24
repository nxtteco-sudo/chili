import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, Plus, ShieldAlert, ShieldCheck } from "lucide-react";
import { ActivityRow } from "@/components/activity-row";
import { PhotoTile } from "@/components/photo-tile";
import { InstallHint } from "@/components/pwa";
import {
  ButtonLink,
  Card,
  PageHeader,
  PageSkeleton,
  SectionTitle,
  StatusBadge,
  TextLink,
  TypeIcon,
} from "@/components/ui";
import {
  getActivities,
  getHarvestSafety,
  getLastByType,
  getMonthlySpend,
  getProblems,
  getProducts,
} from "@/lib/data";
import { addMonths, dayKey, formatFull, formatShort, formatWeekday, monthKey, relativeDay } from "@/lib/dates";
import { describeActivity } from "@/lib/describe";
import { ENTRY_META } from "@/lib/entry-meta";
import { formatRm, formatRmWhole } from "@/lib/format";
import type { Activity, ActivityType, Product } from "@/lib/types";

export default function HomePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Home />
    </Suspense>
  );
}

async function Home() {
  const [products, last, safety, openProblems, recent] = await Promise.all([
    getProducts(),
    getLastByType(),
    getHarvestSafety(),
    getProblems({ status: "open" }),
    getActivities({ sinceDays: 7 }),
  ]);
  const { today } = safety;
  const thisMonth = monthKey(today);
  const [spend, prevSpend] = await getMonthlySpend([thisMonth, addMonths(thisMonth, -1)]);
  const total = spend.pesticide + spend.fertilizer;
  const prevTotal = prevSpend.pesticide + prevSpend.fertilizer;

  return (
    <>
      <PageHeader
        title="Kebun Cili"
        subtitle={formatFull(today)}
        action={
          <ButtonLink href="/log" className="max-md:hidden">
            <Plus className="size-5" /> Add entry
          </ButtonLink>
        }
      />

      <div className="space-y-4">
        <HarvestBanner safety={safety} products={products} />

        <div className="grid gap-3 sm:grid-cols-3">
          {(["spray", "fertilizer", "water"] as const).map((type) => (
            <LastDoneTile key={type} type={type} activity={last[type]} today={today} products={products} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-3">
            <Card>
              <div className="px-4 pt-4">
                <SectionTitle action={<TextLink href="/timeline">See all</TextLink>}>
                  This week
                </SectionTitle>
              </div>
              <div className="divide-y divide-line border-t border-line">
                {recent.slice(0, 10).map((a) => (
                  <ActivityRow
                    key={a.id}
                    activity={a}
                    products={products}
                    dateLabel={relativeDay(dayKey(a.occurredAt), today)}
                  />
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-4 lg:col-span-2">
            <Card className="p-4">
              <SectionTitle action={<TextLink href="/problems">All problems</TextLink>}>
                Open problems
              </SectionTitle>
              {openProblems.length === 0 ? (
                <p className="text-[15px] text-muted">No open problems. Bagus!</p>
              ) : (
                <ul className="space-y-2">
                  {openProblems.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/problems/${p.id}`}
                        className="flex items-center gap-3 rounded-xl p-1.5 transition-colors hover:bg-surface-2"
                      >
                        {p.photos[0] && (
                          <PhotoTile photo={p.photos[0]} showCaption={false} className="size-14 shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-medium">{p.title}</p>
                          <p className="text-sm text-ink-2">Found {relativeDay(p.foundOn, today).toLowerCase()}</p>
                        </div>
                        <StatusBadge problem={p} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-4">
              <SectionTitle action={<TextLink href="/reports">Reports</TextLink>}>
                Spent this month
              </SectionTitle>
              <p className="text-4xl font-semibold tracking-tight">{formatRmWhole(total)}</p>
              <dl className="mt-3 space-y-1.5 text-[15px]">
                <SpendLine dot="bg-spray" label="Pesticide" value={spend.pesticide} />
                <SpendLine dot="bg-baja" label="Baja" value={spend.fertilizer} />
              </dl>
              <p className="mt-3 border-t border-line pt-3 text-sm text-muted">
                Last month: <span className="tabular text-ink-2">{formatRm(prevTotal)}</span>
              </p>
            </Card>

            <InstallHint />
          </div>
        </div>
      </div>
    </>
  );
}

function SpendLine({ dot, label, value }: { dot: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`size-2.5 rounded-full ${dot}`} />
      <dt className="text-ink-2">{label}</dt>
      <dd className="tabular ml-auto">{formatRm(value)}</dd>
    </div>
  );
}

function HarvestBanner({
  safety,
  products,
}: {
  safety: Awaited<ReturnType<typeof getHarvestSafety>>;
  products: Product[];
}) {
  const { blocking, today } = safety;
  if (!blocking)
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-good-soft p-4 text-good-ink">
        <ShieldCheck className="size-6 shrink-0" />
        <div>
          <p className="font-semibold">Selamat tuai: safe to harvest</p>
          <p className="text-sm opacity-90">No pesticide waiting period running.</p>
        </div>
      </div>
    );
  const p = products.find((x) => x.id === blocking.spray.productId);
  return (
    <Link
      href={`/entries/${blocking.id}`}
      className="flex items-center gap-3 rounded-2xl bg-warn-soft p-4 text-warn-ink"
    >
      <ShieldAlert className="size-6 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          Jangan tuai lagi: not safe to harvest until {formatWeekday(blocking.spray.safeHarvestOn)}
        </p>
        <p className="text-sm opacity-90">
          {p?.name} sprayed {relativeDay(dayKey(blocking.occurredAt), today).toLowerCase()} ·{" "}
          {p?.phiDays}-day waiting period ({relativeDay(blocking.spray.safeHarvestOn, today).toLowerCase()})
        </p>
      </div>
      <ChevronRight className="size-5 shrink-0" />
    </Link>
  );
}

function LastDoneTile({
  type,
  activity,
  today,
  products,
}: {
  type: ActivityType;
  activity?: Activity;
  today: string;
  products: Product[];
}) {
  const meta = ENTRY_META[type];
  const inner = (
    <>
      <div className="flex items-center gap-2.5">
        <TypeIcon type={type} size="sm" />
        <span className="text-sm text-ink-2">
          Last {meta.label.toLowerCase()}
          {meta.malay !== meta.label && <span className="text-muted"> · {meta.malay}</span>}
        </span>
      </div>
      {activity ? (
        <>
          <p className="mt-3 text-2xl font-semibold tracking-tight">
            {relativeDay(dayKey(activity.occurredAt), today)}
          </p>
          <p className="mt-0.5 truncate text-sm text-ink-2">
            {describeActivity(activity, products).title} · {formatShort(dayKey(activity.occurredAt))}
          </p>
        </>
      ) : (
        <p className="mt-3 text-[15px] text-muted">Nothing logged yet</p>
      )}
    </>
  );
  return activity ? (
    <Link href={`/entries/${activity.id}`} className="rounded-2xl border border-line bg-surface p-4 transition-colors hover:bg-surface-2">
      {inner}
    </Link>
  ) : (
    <div className="rounded-2xl border border-line bg-surface p-4">{inner}</div>
  );
}
