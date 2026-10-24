import Link from "next/link";
import { Camera, ChevronRight, Link2 } from "lucide-react";
import { describeActivity } from "@/lib/describe";
import { formatRm } from "@/lib/format";
import { formatTime } from "@/lib/dates";
import type { Activity, Product } from "@/lib/types";
import { TypeIcon } from "./ui";

export function ActivityRow({
  activity,
  products,
  dateLabel,
}: {
  activity: Activity;
  products: Product[];
  dateLabel?: string;
}) {
  const { title, detail, cost } = describeActivity(activity, products);
  return (
    <Link
      href={`/entries/${activity.id}`}
      className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
    >
      <TypeIcon type={activity.type} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[15px] font-medium">{title}</span>
          {activity.problemId && <Link2 className="size-3.5 shrink-0 text-problem" aria-label="Linked to a problem" />}
          {activity.photos.length > 0 && <Camera className="size-3.5 shrink-0 text-muted" aria-label="Has photos" />}
        </div>
        <p className="truncate text-sm text-ink-2">{detail}</p>
      </div>
      <div className="shrink-0 text-right">
        <div className="tabular text-sm text-ink-2">{dateLabel ?? formatTime(activity.occurredAt)}</div>
        {cost > 0 && <div className="tabular text-sm text-muted">{formatRm(cost)}</div>}
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100 max-md:hidden" />
    </Link>
  );
}
