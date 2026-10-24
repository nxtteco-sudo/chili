import Link from "next/link";
import { STAGE_META } from "@/lib/batches";
import type { BatchView } from "@/lib/data";
import { formatLong, relativeDay } from "@/lib/dates";

export function BatchCard({ view: { batch, variety, info }, today }: { view: BatchView; today: string }) {
  const next = info.next;
  const nextDate = next?.expected;
  return <Link href={`/batches/${batch.id}`} className="metric-card block rounded-2xl border border-line bg-white p-5">
    <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate text-[15px] font-semibold">{batch.name}</h3><p className="mt-0.5 truncate text-[11px] text-muted">{variety?.name ?? "Variety not set"}{batch.polybagsCount ? ` · ${batch.polybagsCount.toLocaleString("en-MY")} polybags` : ""}</p></div><span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent">{STAGE_META[info.stage].malay}</span></div>
    <p className="mt-4 text-[22px] font-medium leading-none tracking-[-.04em]">{info.dayLabel ?? "Not started"}</p>
    {info.progress !== undefined && <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#eef1e8]" role="progressbar" aria-label="Crop progress" aria-valuenow={Math.round(info.progress * 100)} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-accent" style={{ width: `${info.progress * 100}%` }} /></div>}
    <p className="mt-3 text-[11px] text-ink-2">{next ? <>{next.label}{nextDate ? <> expected <b className="font-medium text-ink">{formatLong(nextDate)}</b> ({relativeDay(nextDate, today).toLowerCase()})</> : <>: tap to mark when it happens</>}</> : "Crop finished"}</p>
  </Link>;
}
