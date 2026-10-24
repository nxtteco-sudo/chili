import Link from "next/link";
import { Suspense } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays, ChevronRight, Leaf, ShieldCheck, ShieldAlert, Sprout } from "lucide-react";
import { ActivityRow } from "@/components/activity-row";
import { GardenArt } from "@/components/garden-art";
import { StackedColumns } from "@/components/charts";
import { Card, PageSkeleton, SectionTitle, StatusBadge, TextLink, TypeIcon } from "@/components/ui";
import { getActivities, getHarvestSafety, getLastByType, getMonthlySpend, getProblems, getProducts } from "@/lib/data";
import { addDays, addMonths, dayKey, diffDays, formatFull, formatMonthShort, formatWeekday, monthKey, relativeDay } from "@/lib/dates";
import { describeActivity } from "@/lib/describe";
import { ENTRY_META } from "@/lib/entry-meta";
import { cn, formatRmWhole } from "@/lib/format";
import type { Activity, ActivityType, Product } from "@/lib/types";

export default function HomePage() { return <Suspense fallback={<PageSkeleton />}><Home /></Suspense>; }

async function Home() {
  const [products, last, safety, openProblems, recent] = await Promise.all([
    getProducts(), getLastByType(), getHarvestSafety(), getProblems({ status: "open" }), getActivities({ sinceDays: 6 }),
  ]);
  const { today } = safety;
  const months = Array.from({ length: 6 }, (_, i) => addMonths(monthKey(today), i - 5));
  const spending = await getMonthlySpend(months);
  const spend = spending[5];
  const total = spend.pesticide + spend.fertilizer;
  const previous = spending[4].pesticide + spending[4].fertilizer;
  const change = previous ? Math.round(((total - previous) / previous) * 100) : undefined;
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const counts = days.map(day => recent.filter(a => dayKey(a.occurredAt) === day).length);
  const max = Math.max(...counts, 1);

  return <div className="dashboard-home space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-2 text-[10px] font-medium uppercase tracking-[.2em] text-muted">Your farm, at a glance</p><h1 className="editorial text-[38px] leading-[1.1] sm:text-[46px]"><span className="hidden md:inline">A little closer to a better harvest</span><span className="md:hidden">Your farm, today</span><span className="text-[#95a877]">.</span></h1><p className="mt-3 text-[13px] text-ink-2">Here&apos;s what&apos;s growing, what&apos;s been done, and what needs your care.</p></div>
      <Link href={`/calendar?d=${today}`} className="flex shrink-0 items-center gap-2 rounded-lg border border-line bg-white px-3 py-2.5 text-[11px] text-ink-2"><CalendarDays className="size-3.5" />{formatFull(today)}</Link>
    </header>

    <section className="farm-hero relative isolate flex min-h-[222px] overflow-hidden rounded-[20px] border border-[#e2e8d6] bg-[#eef2e6]">
      <div className="farm-hero-copy relative z-10 flex max-w-[65%] flex-col justify-center px-5 py-7 sm:max-w-[58%] sm:px-8">
        <span className="mb-4 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[.16em] text-[#718356]"><span className="size-1.5 rounded-full bg-[#83965d]" /> The farm journal</span>
        <h2 className="editorial text-[29px] leading-[1.12] text-[#354f36] sm:text-[37px]">Small acts of care.<br />A season of growth.</h2>
        <p className="mt-3 max-w-[320px] text-[11px] leading-relaxed text-[#71806a] sm:text-xs">Keep the little details. Learn from every season.<br className="hidden sm:block" /> Grow a healthier farm, one entry at a time.</p>
        <Link href="/log" className="mt-5 inline-flex w-fit items-center gap-3 text-[11px] font-semibold text-accent">Log today&apos;s activity <ArrowRight className="size-3.5" /></Link>
      </div>
      <div className="farm-hero-art absolute -right-16 bottom-0 h-[225px] w-[355px] opacity-80 sm:right-2 sm:h-[255px] sm:w-[440px] sm:opacity-100 lg:right-6"><GardenArt /></div>
      <span className="absolute bottom-5 right-6 hidden text-[9px] uppercase tracking-[.18em] text-[#8a9676] lg:block">Rooted in everyday care</span>
    </section>

    <div className="dashboard-metrics grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {(["spray", "fertilizer", "water"] as const).map(type => <LastDoneTile key={type} type={type} activity={last[type]} today={today} products={products} />)}
      <Link href="/reports" className="metric-card rounded-2xl border border-line bg-white p-5">
        <div className="flex items-center justify-between"><span className="text-[11px] text-ink-2">Spent this month</span><span className="grid size-8 place-items-center rounded-full bg-[#f4f1e6] text-[#9d9166]"><span className="text-[10px] font-semibold">RM</span></span></div>
        <p className="mt-3 text-[29px] font-medium leading-none tracking-[-.06em]">{formatRmWhole(total)}</p>
        <p className="mt-3 flex items-center gap-1 text-[10px] text-muted">{change !== undefined ? <><span className={cn("inline-flex items-center", change <= 0 ? "text-good-ink" : "text-warn-ink")}>{change <= 0 ? <ArrowDownRight className="size-3" /> : <ArrowUpRight className="size-3" />}{Math.abs(change)}%</span> vs last month</> : "Pesticide & fertilizer"}</p>
      </Link>
    </div>

    <HarvestNotice safety={safety} products={products} />

    <div className="dashboard-analysis grid gap-5 xl:grid-cols-[1.65fr_1fr]">
      <StackedColumns title="A season in numbers" subtitle="Monthly spending · RM" series={[{ key: "pesticide", label: "Pesticide", color: "#c8936b" }, { key: "fertilizer", label: "Baja", color: "#91a67a" }]} data={spending.map(m => ({ label: formatMonthShort(m.month), values: { pesticide: m.pesticide, fertilizer: m.fertilizer } }))} />
      <Card className="flex flex-col p-5 md:p-6">
        <SectionTitle action={<Link href="/calendar" aria-label="View activity calendar" className="text-muted hover:text-accent"><ArrowUpRight className="size-4" /></Link>}>A week on the farm</SectionTitle>
        <p className="text-xs text-muted">Every bit of care, recorded.</p>
        <div className="mb-5 mt-5 flex items-baseline gap-2"><span className="text-[36px] font-medium leading-none tracking-[-.07em]">{recent.length}</span><span className="text-xs text-muted">activities this week</span></div>
        <div className="flex min-h-[133px] flex-1 items-end gap-2.5 border-b border-line pb-0 sm:gap-4">{days.map((day, i) => <Link key={day} href={`/calendar?m=${monthKey(day)}&d=${day}`} aria-label={`${formatWeekday(day)}: ${counts[i]} activities`} className="group flex h-[133px] flex-1 items-end justify-center rounded-t-lg bg-[#f5f6f0] pt-5"><span className={cn("relative block w-full rounded-t-md transition-colors", day === today ? "bg-[#526f43] group-hover:bg-[#3f5a33]" : "bg-[#d8e1c9] group-hover:bg-[#b1c199]")} style={{ height: `${counts[i] ? Math.max(12, counts[i] / max * 100) : 0}%` }}><span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-muted">{counts[i]}</span></span></Link>)}</div>
        <div className="mt-2 flex gap-2.5 sm:gap-4">{days.map(day => <span key={day} className={cn("flex-1 text-center text-[9px]", day === today ? "font-semibold text-accent" : "text-muted")}>{new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`))}</span>)}</div>
        <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-[10px]"><span className="text-muted">A good habit grows over time.</span><Leaf className="size-3.5 text-[#8da475]" /></div>
      </Card>
    </div>

    <div className="dashboard-recent grid items-start gap-5 xl:grid-cols-[1.65fr_1fr]">
      <Card>
        <div className="px-5 pb-1 pt-5 md:px-6"><SectionTitle action={<TextLink href="/timeline">View journal <ArrowRight className="ml-1 inline size-3" /></TextLink>}>Recent activity</SectionTitle><p className="mb-4 text-[11px] text-muted">The latest entries from your farm.</p></div>
        <div className="flex border-y border-line bg-[#fafbf7] px-5 py-2 text-[9px] uppercase tracking-[.12em] text-muted md:px-6"><span className="flex-1">Activity & details</span><span>When / cost</span></div>
        <div className="divide-y divide-line">{recent.length ? recent.slice(0, 5).map(a => <ActivityRow key={a.id} activity={a} products={products} dateLabel={relativeDay(dayKey(a.occurredAt), today)} />) : <p className="p-6 text-sm text-muted">Your week starts with a single entry. <Link href="/log" className="text-accent underline">Add one now.</Link></p>}</div>
        <Link href="/timeline" className="flex items-center justify-center gap-2 border-t border-line py-3.5 text-[10px] font-medium text-accent">Explore all activity <ArrowRight className="size-3" /></Link>
      </Card>
      <Card className="p-5 md:p-6">
        <SectionTitle action={<span className="rounded-full bg-problem-soft px-2 py-0.5 text-[10px] text-problem">{openProblems.length} open</span>}>A little extra attention</SectionTitle>
        <p className="mb-5 text-[11px] text-muted">Keep an eye on these plants.</p>
        {openProblems.length === 0 ? <p className="rounded-xl bg-good-soft p-4 text-sm text-good-ink">All looking good. No open problems.</p> : <ul className="divide-y divide-line">{openProblems.slice(0, 4).map(p => <li key={p.id}><Link href={`/problems/${p.id}`} className="group block py-4 first:pt-0"><div className="mb-2 flex items-start justify-between gap-2"><span className="flex size-9 items-center justify-center rounded-xl border border-[#e4e9dc] bg-[#f2f4eb]"><Sprout className="size-[18px] text-[#7c8e64]" strokeWidth={1.4} /></span><StatusBadge problem={p} /></div><h3 className="text-[13px] font-medium leading-relaxed group-hover:text-accent">{p.title}</h3><p className="mt-1 text-[10px] text-muted">Found {relativeDay(p.foundOn, today).toLowerCase()} · {p.severity} severity</p><div className="mt-3 flex items-center justify-between"><span className="text-[10px] text-ink-2">{p.updates.length} updates recorded</span><ArrowUpRight className="size-3.5 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></div></Link></li>)}</ul>}
        <Link href="/problems" className="mt-4 flex items-center justify-between border-t border-line pt-4 text-[11px] font-medium text-accent">Open plant health <ArrowRight className="size-3.5" /></Link>
      </Card>
    </div>
  </div>;
}

function HarvestNotice({ safety: { blocking, today }, products }: { safety: Awaited<ReturnType<typeof getHarvestSafety>>; products: Product[] }) {
  const product = blocking && products.find(p => p.id === blocking.spray.productId);
  const Icon = blocking ? ShieldAlert : ShieldCheck;
  const content = <><span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/75"><Icon className="size-[18px]" strokeWidth={1.5} /></span><div className="flex-1"><p className="text-xs font-medium">{blocking ? `Let the harvest wait until ${formatWeekday(blocking.spray.safeHarvestOn)}` : "Ready when you are. Safe to harvest."}</p><p className="mt-1 text-[10px] leading-relaxed opacity-80">{blocking ? `${product?.name ?? "Pesticide"} waiting period · ${diffDays(blocking.spray.safeHarvestOn, today)} days remaining. Jangan tuai lagi.` : "No recorded pesticide waiting period is running. Selamat tuai."}</p></div>{blocking && <ChevronRight className="size-4 shrink-0" />}</>;
  const cls = cn("harvest-notice flex items-center gap-3 rounded-xl border px-4 py-3", blocking ? "border-[#eddfc2] bg-[#fcf8ed] text-warn-ink" : "border-[#dce7cf] bg-good-soft text-good-ink");
  return blocking ? <Link href={`/entries/${blocking.id}`} className={cls}>{content}</Link> : <div className={cls}>{content}</div>;
}
function LastDoneTile({ type, activity, today, products }: { type: ActivityType; activity?: Activity; today: string; products: Product[] }) {
  const inner = <><div className="flex items-center justify-between"><span className="text-[11px] text-ink-2">Last {ENTRY_META[type].label.toLowerCase()}</span><TypeIcon type={type} size="sm" /></div><p className="mt-3 text-[27px] font-medium leading-none tracking-[-.05em]">{activity ? relativeDay(dayKey(activity.occurredAt), today) : "No entries"}</p><p className="mt-3 truncate text-[10px] text-muted">{activity ? describeActivity(activity, products).title : "A fresh start for your farm"}</p></>;
  return activity ? <Link href={`/entries/${activity.id}`} className="metric-card rounded-2xl border border-line bg-white p-5">{inner}</Link> : <div className="metric-card rounded-2xl border border-line bg-white p-5">{inner}</div>;
}
