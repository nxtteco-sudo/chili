"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { ArrowUpRight, CalendarDays, ChartColumn, ChevronDown, Ellipsis, House, Leaf, ListOrdered, Package, Plus, Search, Sprout, type LucideIcon } from "lucide-react";
import { ChiliIcon } from "./chili-icon";
import { cn } from "@/lib/format";

type Item = { href: string; label: string; icon: LucideIcon };
const MAIN: Item[] = [
  { href: "/", label: "Overview", icon: House },
  { href: "/timeline", label: "Activity log", icon: ListOrdered },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/problems", label: "Plant health", icon: Sprout },
];
const RESOURCES: Item[] = [
  { href: "/products", label: "Products", icon: Package },
  { href: "/reports", label: "Insights & reports", icon: ChartColumn },
];
const MOBILE = [
  { href: "/", label: "Home", icon: House },
  { href: "/timeline", label: "Journal", icon: ListOrdered },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/problems", label: "Health", icon: Sprout },
  { href: "/more", label: "More", icon: Ellipsis },
];
function isActive(path: string, href: string) {
  if (href === "/") return path === "/";
  if (href === "/more") return ["/more", "/products", "/reports"].some(p => path.startsWith(p));
  if (href === "/timeline") return path.startsWith(href) || path.startsWith("/entries");
  return path.startsWith(href);
}
function WithPathname({ View }: { View: (p: { pathname: string }) => ReactNode }) { return <View pathname={usePathname()} />; }
export function Sidebar() { return <Suspense fallback={<SidebarView pathname="" />}><WithPathname View={SidebarView} /></Suspense>; }
export function BottomNav() { return <Suspense fallback={<BottomNavView pathname="" />}><WithPathname View={BottomNavView} /></Suspense>; }
export function TopBar() { return <Suspense fallback={<TopBarView pathname="" />}><WithPathname View={TopBarView} /></Suspense>; }

function SidebarView({ pathname }: { pathname: string }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[226px] shrink-0 flex-col border-r border-line bg-[#fdfefa] px-5 py-7 md:flex lg:w-[244px]">
      <Link href="/" className="mb-9 flex items-center gap-2.5 px-1">
        <span className="grid size-10 place-items-center rounded-[13px] bg-accent text-white"><ChiliIcon className="size-6" /></span>
        <span><span className="block text-[20px] font-semibold tracking-[-.07em]">kebun<span className="font-normal">cili</span><span className="text-spray">.</span></span><span className="mt-0.5 block text-[9px] uppercase tracking-[.22em] text-muted">The farm journal</span></span>
      </Link>
      <Link href="/more" className="mb-8 flex items-center gap-2.5 rounded-xl border border-line bg-white px-3 py-3 transition-colors hover:border-accent/30">
        <span className="grid size-8 place-items-center rounded-lg bg-accent-soft"><Leaf className="size-4 text-accent" /></span>
        <span className="flex-1"><span className="block text-xs font-semibold">Our chili farm</span><span className="mt-0.5 block text-[10px] text-muted">Personal workspace</span></span><ChevronDown className="size-3.5 text-muted" />
      </Link>
      <p className="mb-3 px-3 text-[9px] font-medium uppercase tracking-[.18em] text-muted">Workspace</p>
      <nav aria-label="Main navigation" className="space-y-1">{MAIN.map(item => <NavItem key={item.href} item={item} pathname={pathname} />)}</nav>
      <p className="mb-3 mt-8 px-3 text-[9px] font-medium uppercase tracking-[.18em] text-muted">Resources</p>
      <nav aria-label="Resources" className="space-y-1">{RESOURCES.map(item => <NavItem key={item.href} item={item} pathname={pathname} />)}</nav>
      <div className="mt-auto pt-8">
        <div className="rounded-2xl bg-[#f0f3e9] p-4">
          <Sprout className="mb-3 size-6 text-[#748956]" strokeWidth={1.4} />
          <p className="editorial text-[21px] leading-tight">Good things<br />take growing.</p>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-2">Every entry is a little more<br />knowledge for the next harvest.</p>
          <Link href="/log" className="mt-4 flex items-center gap-2 text-[11px] font-semibold text-accent">Make an entry <ArrowUpRight className="size-3.5" /></Link>
        </div>
        <Link href="/more" className="mt-5 flex items-center gap-2.5 border-t border-line px-1 pt-5">
          <span className="grid size-8 place-items-center rounded-full border border-[#dce3d4] bg-[#eaf0df] font-serif text-sm text-accent">KC</span>
          <span className="flex-1"><span className="block text-xs font-medium">Farm workspace</span><span className="text-[10px] text-muted">Settings & exports</span></span><Ellipsis className="size-4 text-muted" />
        </Link>
      </div>
    </aside>
  );
}
function NavItem({ item: { href, label, icon: Icon }, pathname }: { item: Item; pathname: string }) {
  const active = isActive(pathname, href);
  return <Link href={href} aria-current={active ? "page" : undefined} className={cn("nav-item relative flex items-center gap-3 rounded-lg px-3 py-3 text-[12px]", active ? "bg-[#eaf0e2] font-semibold text-accent" : "text-ink-2 hover:bg-surface-2 hover:text-accent")}><Icon className="size-[17px]" strokeWidth={1.6} />{label}</Link>;
}
function TopBarView({ pathname }: { pathname: string }) {
  const current = [...MAIN, ...RESOURCES].find(item => isActive(pathname, item.href));
  return <div className="app-topbar flex h-[74px] items-center justify-between gap-3 border-b border-line bg-white/70 px-5 md:px-8 lg:px-10">
    <div className="flex items-center gap-2 text-[11px] text-muted"><ChiliIcon className="size-5 text-accent md:hidden" /><span className="hidden sm:inline">Workspace</span><span className="hidden text-[#bac3b6] sm:inline">/</span><span className="font-medium text-ink">{current?.label ?? (pathname.startsWith('/log') ? 'New entry' : 'Farm journal')}</span></div>
    <div className="flex items-center gap-3 sm:gap-5">
      <Link href="/timeline" className="flex min-h-11 min-w-11 items-center justify-center gap-2 text-muted transition-colors hover:text-accent" aria-label="Search farm records"><Search className="size-4" strokeWidth={1.6} /><span className="hidden text-[11px] lg:inline">Search your journal</span></Link>
      <span className="hidden h-5 w-px bg-line sm:block" />
      <span className="hidden items-center gap-1.5 rounded-full bg-[#f3f4e9] px-2.5 py-1 text-[10px] text-[#72784e] sm:flex"><span className="size-1.5 rounded-full bg-[#9aa76c]" />Demo farm</span>
      <Link href="/log" className="flex h-11 items-center gap-1.5 rounded-lg bg-accent px-3 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-[#244b33]"><Plus className="size-3.5" />Add entry</Link>
    </div>
  </div>;
}
function BottomNavView({ pathname }: { pathname: string }) {
  return <>
    <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-[#fdfefa]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"><ul className="mx-auto grid max-w-lg grid-cols-5">{MOBILE.map(({ href, label, icon: Icon }) => <li key={href}><Link href={href} aria-current={isActive(pathname, href) ? "page" : undefined} className={cn("flex flex-col items-center gap-1.5 min-h-[72px] py-2.5 text-[11px]", isActive(pathname, href) ? "font-semibold text-accent" : "text-muted")}><span className={cn("rounded-lg px-3 py-1", isActive(pathname, href) && "bg-accent-soft")}><Icon className="size-[19px]" strokeWidth={1.6} /></span>{label}</Link></li>)}</ul></nav>
  </>;
}
