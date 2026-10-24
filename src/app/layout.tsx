import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { BottomNav, Sidebar, TopBar } from "@/components/nav";
import { ServiceWorkerRegister } from "@/components/pwa";
import "./globals.css";
import "./theme.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Kebun Cili", template: "%s · Kebun Cili" },
  description: "Farm log for spraying, baja, watering and problems on the chili farm",
  appleWebApp: { capable: true, title: "Kebun Cili", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f8f9f5",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="light" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-3 focus:text-white">Skip to content</a>
        <div className="flex min-h-dvh">
          <Sidebar />
          <main id="main-content" className="min-w-0 flex-1 pb-28 md:pb-10">
            <TopBar />
            <div className="app-content mx-auto max-w-[1480px] px-5 py-7 md:px-8 lg:px-10 lg:py-8">
              {children}
              <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-[11px] text-muted">
                <span>Kebun Cili <span className="mx-2 opacity-40">/</span> A little care. A better harvest.</span>
                <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-warn" /> Demo data · Saved online</span>
              </footer>
            </div>
          </main>
        </div>
        <BottomNav />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
