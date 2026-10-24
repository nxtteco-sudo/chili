import type { Metadata } from "next";
import { Suspense, type CSSProperties, type ReactNode } from "react";
import { Droplets, History, ShieldCheck, Sprout } from "lucide-react";
import { ChiliIcon } from "@/components/chili-icon";
import { GardenArt } from "@/components/garden-art";
import { param } from "@/lib/params";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as CSSProperties;

// Covers the whole screen so the app's menus (from the root layout) stay hidden.
// Laptop: brand panel left, form right. Phone: brand banner, form as a sheet.
export default function LoginPage(props: PageProps<"/login">) {
  return (
    <div className="login-screen fixed inset-0 z-50 overflow-y-auto bg-[#f6f7f2] lg:grid lg:grid-cols-[1.1fr_1fr]">
      <BrandPanel />

      <main className="relative -mt-8 flex min-h-[calc(100dvh-14rem)] flex-col rounded-t-[28px] bg-[#f6f7f2] px-6 pb-10 pt-10 lg:mt-0 lg:min-h-dvh lg:justify-center lg:rounded-none lg:px-12">
        <div className="mx-auto w-full max-w-[400px]">
          <h1 className="login-rise editorial text-[38px] leading-[1.05] text-ink [text-wrap:balance] sm:text-[44px]" style={delay(140)}>
            Welcome back<span className="text-spray">.</span>
          </h1>
          <p className="login-rise mt-3 text-[15px] leading-relaxed text-ink-2 [text-wrap:pretty]" style={delay(200)}>
            Selamat kembali. Log in to see today&apos;s farm.
          </p>

          <div
            className="login-rise mt-8 rounded-[24px] border border-[#e3e8dc] bg-white p-6 shadow-[0_1px_2px_rgba(36,59,48,0.04),0_12px_32px_-12px_rgba(36,59,48,0.18)] sm:p-7"
            style={delay(260)}
          >
            <Suspense fallback={<div className="h-[264px]" />}>
              <Form searchParams={props.searchParams} />
            </Suspense>
          </div>

          <p className="login-rise mt-6 flex items-center justify-center gap-2 text-[13px] text-muted" style={delay(340)}>
            <ShieldCheck className="size-4 text-accent" strokeWidth={1.8} />
            Private to the farm. Accounts are added by the admin.
          </p>
        </div>
      </main>
    </div>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  return <LoginForm next={param(await searchParams, "next")} />;
}

function Logo() {
  return (
    <>
      <span className="grid size-11 place-items-center rounded-[14px] bg-white/12 text-white ring-1 ring-white/20 backdrop-blur">
        <ChiliIcon className="size-6" />
      </span>
      <span>
        <span className="block text-[22px] font-semibold leading-none tracking-[-.06em] text-white">
          kebun<span className="font-normal">cili</span>
          <span className="text-[#e3a06f]">.</span>
        </span>
        <span className="mt-1 block text-[10px] uppercase tracking-[.24em] text-white/60">The farm journal</span>
      </span>
    </>
  );
}

function BrandPanel() {
  return (
    <aside className="relative isolate overflow-hidden bg-[linear-gradient(160deg,#2b5039_0%,#1d3a29_55%,#16301f_100%)] px-6 pb-16 pt-8 text-white lg:flex lg:min-h-dvh lg:flex-col lg:justify-between lg:gap-8 lg:px-12 lg:py-10">
      {/* Soft light and a faint dot texture, so the green isn't a flat block. */}
      <div aria-hidden className="pointer-events-none absolute -left-32 -top-40 -z-10 size-[520px] rounded-full bg-[#7fae6e]/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-48 right-[-120px] -z-10 size-[460px] rounded-full bg-[#e3a06f]/15 blur-3xl" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-60 [background-image:radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
      />

      <div className="login-rise flex items-center gap-3" style={delay(0)}>
        <Logo />
      </div>

      <div className="mt-8 lg:mt-0">
        <p className="login-rise text-[11px] font-medium uppercase tracking-[.24em] text-[#b9d4a8]" style={delay(60)}>
          Musim demi musim
        </p>
        <h2
          className="login-rise editorial mt-3 max-w-[520px] text-[34px] leading-[1.05] [text-wrap:balance] sm:text-[44px] lg:text-[56px]"
          style={delay(120)}
        >
          Every season, remembered.
        </h2>

        {/* The illustration sits in a cream "window" so its colours stay true. */}
        <div
          className="login-rise relative mt-8 hidden aspect-[16/9] w-[min(100%,560px,62dvh)] overflow-hidden rounded-[28px] bg-[#eef2e6] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)] ring-1 ring-white/15 lg:block"
          style={delay(200)}
        >
          <div className="absolute inset-x-0 bottom-0 h-[92%]">
            <GardenArt />
          </div>
          <span className="absolute left-5 top-5 rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium text-[#4b6a43] backdrop-blur">
            Batch Ogos · Day 47 · Berbunga
          </span>
        </div>

        <ul className="mt-8 hidden max-w-[520px] gap-3 lg:grid [@media(max-height:760px)]:!hidden">
          <Feature icon={<Sprout className="size-[18px]" />} ms={280}>
            Every batch from <b className="font-medium text-white">semai</b> to the last harvest
          </Feature>
          <Feature icon={<Droplets className="size-[18px]" />} ms={340}>
            AB tanks with <b className="font-medium text-white">EC &amp; pH</b>, sprays and baja in one place
          </Feature>
          <Feature icon={<History className="size-[18px]" />} ms={400}>
            Problem came back? See <b className="font-medium text-white">what worked last time</b>
          </Feature>
        </ul>
      </div>

      <p className="login-rise mt-10 hidden text-[12px] text-white/50 lg:block" style={delay(460)}>
        Kebun Cili · A little care. A better harvest.
      </p>
    </aside>
  );
}

function Feature({ icon, ms, children }: { icon: ReactNode; ms: number; children: ReactNode }) {
  return (
    <li className="login-rise flex items-center gap-3.5 text-[15px] text-white/75" style={delay(ms)}>
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 text-[#cfe3c0] ring-1 ring-white/10">
        {icon}
      </span>
      <span className="[text-wrap:pretty]">{children}</span>
    </li>
  );
}
