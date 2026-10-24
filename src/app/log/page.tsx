import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { PageHeader, TypeIcon } from "@/components/ui";
import { ENTRY_META } from "@/lib/entry-meta";
import type { EntryType } from "@/lib/types";

export const metadata: Metadata = { title: "Add entry" };

const CHOICES: { type: EntryType; href: string; note: string }[] = [
  { type: "spray", href: "/log/new?type=spray", note: "Pesticide / fungicide sprayed" },
  { type: "fertilizer", href: "/log/new?type=fertilizer", note: "Baja given" },
  { type: "water", href: "/log/new?type=water", note: "Watering (siram)" },
  { type: "problem", href: "/problems/new", note: "Something wrong with the plants" },
];

export default function LogPage() {
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Add entry" subtitle="What do you want to log?" />
      <ul className="space-y-3">
        {CHOICES.map(({ type, href, note }) => (
          <li key={type}>
            <Link
              href={href}
              className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition-colors hover:bg-surface-2"
            >
              <TypeIcon type={type} size="lg" />
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-semibold">
                  {ENTRY_META[type].label}
                  {ENTRY_META[type].malay !== ENTRY_META[type].label && (
                    <span className="font-normal text-muted"> · {ENTRY_META[type].malay}</span>
                  )}
                </span>
                <span className="block text-[15px] text-ink-2">{note}</span>
              </span>
              <ChevronRight className="size-5 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
