import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { CalendarDays, ChartColumn, ChevronRight, FileSpreadsheet, LogOut, Package, Plus, Send, UserRound, Wheat } from "lucide-react";
import { resetDemoData } from "@/app/actions";
import { signOut } from "@/app/login/actions";
import { DeleteButton } from "@/components/form-ui";
import { InstallHint } from "@/components/pwa";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import { getMember } from "@/lib/auth";

export const metadata: Metadata = { title: "More" };

const LINKS = [
  { href: "/log", label: "Add entry", note: "Spray, tank mix, other baja or a problem", icon: Plus },
  { href: "/calendar", label: "Calendar", note: "What was done each day, batch milestones", icon: CalendarDays },
  { href: "/products", label: "Products", note: "Racun & baja, waiting periods, usage", icon: Package },
  { href: "/varieties", label: "Varieties", note: "Jenis cili and their day counts", icon: Wheat },
  { href: "/reports", label: "Reports", note: "EC/pH trends, AB used, rotation, batches", icon: ChartColumn },
];

const EXPORTS = [
  { href: "/export/entries", label: "All entries", note: "Sprays, tank mixes and other baja" },
  { href: "/export/batches", label: "All batches", note: "Planting dates and milestones" },
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
              Soon dad can send sprays, tank mixes, baja and problems (with photos) to the farm bot, and
              they&apos;ll show up here automatically.
            </p>
          </div>
        </Card>

        <section>
          <SectionTitle>Account</SectionTitle>
          <Card className="flex flex-wrap items-center gap-3 p-4">
            <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
              <UserRound className="size-5" />
            </span>
            <Suspense fallback={<span className="flex-1 text-[15px] text-ink-2">Loading…</span>}>
              <WhoAmI />
            </Suspense>
            <form action={signOut}>
              <button type="submit" className="inline-flex h-11 items-center gap-2 rounded-xl border border-line px-4 text-[15px] font-medium hover:bg-surface-2">
                <LogOut className="size-4" /> Log out
              </button>
            </form>
          </Card>
        </section>

        <section>
          <SectionTitle>Demo data</SectionTitle>
          <Card className="p-4">
            <p className="text-[15px] text-ink-2">
              The farm records are saved online. Until dad starts logging for real, this resets everything
              to the demo farm. All entries and photos are replaced, for both of you.
            </p>
            <DeleteButton
              action={resetDemoData}
              fields={{}}
              label="Reset to demo data"
              confirmText="Delete ALL farm records and photos online and load the demo farm? This can't be undone."
              className="-ml-4 mt-2"
            />
          </Card>
        </section>
      </div>
    </>
  );
}

async function WhoAmI() {
  const member = await getMember();
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[15px] font-medium">{member?.name ?? "Not logged in"}</span>
      <span className="block truncate text-sm text-ink-2">{member?.email}</span>
    </span>
  );
}
