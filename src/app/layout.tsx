import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { BottomNav, Sidebar } from "@/components/nav";
import { ServiceWorkerRegister } from "@/components/pwa";
import "./globals.css";

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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0d" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <div className="flex min-h-dvh">
          <Sidebar />
          <main className="min-w-0 flex-1 pb-28 md:pb-12">
            <div className="mx-auto max-w-5xl px-4 pt-5 md:px-8 md:pt-8">
              <p className="mb-4 rounded-lg bg-warn-soft px-3 py-2 text-[13px] text-warn-ink">
                <b>Demo mode.</b> Saved on this computer only. Real entries will come from the Telegram bot.
              </p>
              {children}
            </div>
          </main>
        </div>
        <BottomNav />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
