import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight, Sprout } from "lucide-react";
import { PageHeader, TypeIcon } from "@/components/ui";
import { ENTRY_META } from "@/lib/entry-meta";
import type { EntryType } from "@/lib/types";

export const metadata: Metadata = { title: "Add entry" };

const CHOICES: { type: EntryType; href: string; note: string }[] = [
  { type: "spray", href: "/log/new?type=spray", note: "Pesticide / fungicide sprayed" },
  { type: "tank_mix", href: "/log/new?type=tank_mix", note: "New AB tank mixed, with EC & pH" },
  { type: "fertilizer", href: "/log/new?type=fertilizer", note: "Baja not through the drip (foliar, tabur…)" },
  { type: "problem", href: "/problems/new", note: "Something wrong with the plants" },
];

export default function LogPage() {
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Add entry" subtitle="What do you want to log?" />
      <ul className="space-y-3">
        {CHOICES.map(({ type, href, note }) => (
          <li key={type}>
            <Choice href={href} icon={<TypeIcon type={type} size="lg" />} label={ENTRY_META[type].label} malay={ENTRY_META[type].malay} note={note} />
          </li>
        ))}
      </ul>
      <p className="mb-3 mt-8 text-sm font-medium text-ink-2">Planting</p>
      <Choice
        href="/batches/new"
        icon={
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
            <Sprout className="size-6" />
          </span>
        }
        label="New batch"
        malay="Musim tanam baru"
        note="Seeds sown or moved to polybags"
      />
    </div>
  );
}

function Choice({ href, icon, label, malay, note }: { href: string; icon: React.ReactNode; label: string; malay: string; note: string }) {
  return (
    <Link href={href} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition-colors hover:bg-surface-2">
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-semibold">
          {label}
          {malay !== label && <span className="font-normal text-muted"> · {malay}</span>}
        </span>
        <span className="block text-[15px] text-ink-2">{note}</span>
      </span>
      <ChevronRight className="size-5 text-muted" />
    </Link>
  );
}
