import Link from "next/link";
import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, CircleX } from "lucide-react";
import { ENTRY_META, OUTCOME_META } from "@/lib/entry-meta";
import { cn } from "@/lib/format";
import type { EntryType, Outcome, Problem } from "@/lib/types";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="mb-5 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight md:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-ink-2">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-line bg-surface", className)}>
      {children}
    </section>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-[17px] font-semibold">{children}</h2>
      {action}
    </div>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-sm font-medium text-accent hover:underline">
      {children}
    </Link>
  );
}

export function TypeIcon({ type, size = "md" }: { type: EntryType; size?: "sm" | "md" | "lg" }) {
  const meta = ENTRY_META[type];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-xl",
        meta.soft,
        meta.text,
        size === "sm" && "size-8 rounded-lg",
        size === "md" && "size-10",
        size === "lg" && "size-12",
      )}
    >
      <Icon className={size === "lg" ? "size-6" : size === "md" ? "size-5" : "size-4"} />
    </span>
  );
}

export function TypeBadge({ type }: { type: EntryType }) {
  const meta = ENTRY_META[type];
  const Icon = meta.icon;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-0.5 text-xs font-medium text-ink-2">
      <Icon className={cn("size-3.5", meta.text)} />
      {meta.label}
    </span>
  );
}

const TONE = {
  good: { cls: "bg-good-soft text-good-ink", icon: CircleCheck },
  warn: { cls: "bg-warn-soft text-warn-ink", icon: CircleAlert },
  bad: { cls: "bg-problem-soft text-problem", icon: CircleX },
};

export function OutcomeBadge({ outcome }: { outcome: Outcome }) {
  const meta = OUTCOME_META[outcome];
  const tone = TONE[meta.tone];
  const Icon = tone.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", tone.cls)}>
      <Icon className="size-3.5" />
      {meta.label}
    </span>
  );
}

export function StatusBadge({ problem }: { problem: Problem }) {
  if (problem.status === "resolved" && problem.outcome)
    return <OutcomeBadge outcome={problem.outcome} />;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-problem-soft px-2.5 py-0.5 text-xs font-medium text-problem">
      <span className="size-1.5 rounded-full bg-problem" />
      Open
    </span>
  );
}

export function Chips({
  items,
}: {
  items: { href: string; label: ReactNode; active: boolean }[];
}) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          scroll={false}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
            it.active
              ? "border-transparent bg-ink text-bg"
              : "border-line bg-surface text-ink-2 hover:text-ink",
          )}
        >
          {it.label}
        </Link>
      ))}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center text-[15px] text-muted">
      {children}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-[15px] text-ink">{children === "" || children == null ? "—" : children}</dd>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-surface-2", className)} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24" />
      <Skeleton className="h-40" />
      <Skeleton className="h-64" />
    </div>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-medium transition-colors",
        variant === "primary"
          ? "bg-accent text-accent-ink hover:opacity-90"
          : "border border-line bg-surface text-ink hover:bg-surface-2",
        className,
      )}
    >
      {children}
    </Link>
  );
}
