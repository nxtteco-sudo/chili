"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import {
  CalendarDays,
  ChartColumn,
  Ellipsis,
  House,
  ListOrdered,
  Package,
  Plus,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { ChiliIcon } from "./chili-icon";
import { cn } from "@/lib/format";

type Item = { href: string; label: string; icon: LucideIcon };

const MAIN: Item[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/timeline", label: "Timeline", icon: ListOrdered },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/problems", label: "Problems", icon: TriangleAlert },
];

const SIDEBAR: Item[] = [
  ...MAIN,
  { href: "/products", label: "Products", icon: Package },
  { href: "/reports", label: "Reports", icon: ChartColumn },
];

const MOBILE: Item[] = [...MAIN, { href: "/more", label: "More", icon: Ellipsis }];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/more")
    return ["/more", "/products", "/reports"].some((p) => pathname.startsWith(p));
  if (href === "/timeline") return pathname.startsWith("/timeline") || pathname.startsWith("/entries");
  return pathname.startsWith(href);
}

// usePathname is request data, so the nav first renders without a highlight
// (static shell) and the active item streams in.
export function Sidebar() {
  return (
    <Suspense fallback={<SidebarView pathname="" />}>
      <WithPathname View={SidebarView} />
    </Suspense>
  );
}

export function BottomNav() {
  return (
    <Suspense fallback={<BottomNavView pathname="" />}>
      <WithPathname View={BottomNavView} />
    </Suspense>
  );
}

function WithPathname({ View }: { View: (p: { pathname: string }) => ReactNode }) {
  return <View pathname={usePathname()} />;
}

function SidebarView({ pathname }: { pathname: string }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface px-3 py-5 md:flex">
      <Link href="/" className="mb-6 flex items-center gap-2.5 px-3">
        <span className="grid size-9 place-items-center rounded-xl bg-accent text-accent-ink">
          <ChiliIcon className="size-5" />
        </span>
        <span className="leading-tight">
          <span className="block text-[15px] font-semibold">Kebun Cili</span>
          <span className="block text-xs text-muted">Farm log</span>
        </span>
      </Link>
      <Link
        href="/log"
        className="mb-4 flex h-11 items-center justify-center gap-2 rounded-xl bg-accent text-[15px] font-medium text-accent-ink transition-opacity hover:opacity-90"
      >
        <Plus className="size-5" /> Add entry
      </Link>
      <nav className="flex flex-col gap-0.5">
        {SIDEBAR.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] transition-colors",
                active
                  ? "bg-accent-soft font-medium text-ink"
                  : "text-ink-2 hover:bg-surface-2 hover:text-ink",
              )}
            >
              <Icon className={cn("size-[18px]", active && "text-accent")} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

// Forms have their own save button, so the floating Add button stays out of the way there.
const isForm = (pathname: string) => pathname.startsWith("/log") || /\/(new|edit)$/.test(pathname);

function BottomNavView({ pathname }: { pathname: string }) {
  return (
    <>
      {!isForm(pathname) && (
        <Link
          href="/log"
          aria-label="Add entry"
          className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] right-4 z-20 grid size-14 place-items-center rounded-2xl bg-accent text-accent-ink shadow-lg shadow-black/20 md:hidden"
        >
          <Plus className="size-7" />
        </Link>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {MOBILE.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2.5 text-[11px]",
                    active ? "font-medium text-accent" : "text-muted",
                  )}
                >
                  <Icon className="size-[22px]" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
