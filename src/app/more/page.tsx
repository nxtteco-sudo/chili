import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ChartColumn, ChevronRight, FileSpreadsheet, Package, Plus, Send } from "lucide-react";
import { resetDemoData } from "@/app/actions";
import { DeleteButton } from "@/components/form-ui";
import { InstallHint } from "@/components/pwa";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import { getStoreInfo } from "@/lib/data";
import { formatLong } from "@/lib/dates";

export const metadata: Metadata = { title: "More" };

const LINKS = [
  { href: "/log", label: "Add entry", note: "Spray, baja, water or a problem", icon: Plus },
  { href: "/products", label: "Products", note: "Racun & baja prices, usage", icon: Package },
  { href: "/reports", label: "Reports", note: "Spending and problem summary", icon: ChartColumn },
];

const EXPORTS = [
  { href: "/export/entries", label: "All entries", note: "Sprays, baja and watering" },
  { href: "/export/problems", label: "All problems", note: "With what was done and the lesson" },
];

export default function MorePage() {
  return (
    <>
      <PageHeader title="More" />
      <div className="space-y-6">
        <Card>
          <ul className="divide-y divide-line">
            {LINKS.map(({ href, label, note, icon: Icon }) => (
              <li key={href}>
                <Link href={href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-2">
                  <span className="grid size-10 place-items-center rounded-xl bg-surface-2 text-ink-2">
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium">{label}</span>
                    <span className="block text-sm text-ink-2">{note}</span>
                  </span>
                  <ChevronRight className="size-5 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <section>
          <SectionTitle>Download for Excel</SectionTitle>
          <Card>
            <ul className="divide-y divide-line">
              {EXPORTS.map(({ href, label, note }) => (
                <li key={href}>
                  <a href={href} download className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-2">
                    <span className="grid size-10 place-items-center rounded-xl bg-baja-soft text-baja">
                      <FileSpreadsheet className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-medium">{label} (.csv)</span>
                      <span className="block text-sm text-ink-2">{note}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        </section>

        <InstallHint always />

        <Card className="flex items-start gap-3 p-4">
          <Send className="mt-0.5 size-5 shrink-0 text-water" />
          <div className="text-[15px]">
            <p className="font-medium">Logging from Telegram</p>
            <p className="mt-0.5 text-ink-2">
              Soon dad can send spray, baja, watering and problems (with photos) to the farm bot, and
              they&apos;ll show up here automatically.
            </p>
          </div>
        </Card>

        <section>
          <SectionTitle>Demo data</SectionTitle>
          <Card className="p-4">
            <Suspense fallback={<p className="text-[15px] text-ink-2">Loading…</p>}>
              <DemoInfo />
            </Suspense>
            <DeleteButton
              action={resetDemoData}
              fields={{}}
              label="Reset to demo data"
              confirmText="Delete everything you added and go back to the demo data? This can't be undone."
              className="-ml-4 mt-2"
            />
          </Card>
        </section>
      </div>
    </>
  );
}

async function DemoInfo() {
  const { seededOn } = await getStoreInfo();
  return (
    <p className="text-[15px] text-ink-2">
      Data is saved in a file on this computer (started {formatLong(seededOn)}). When the online
      database is connected, the demo data will be cleared and dad&apos;s real entries start fresh.
    </p>
  );
}
