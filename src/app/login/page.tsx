import type { Metadata } from "next";
import { Suspense } from "react";
import { ChiliIcon } from "@/components/chili-icon";
import { param } from "@/lib/params";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

// Covers the whole screen so the app's menus (from the root layout) stay hidden.
export default function LoginPage(props: PageProps<"/login">) {
  return (
    <div className="login-screen fixed inset-0 z-50 overflow-y-auto bg-bg">
      <div className="mx-auto flex min-h-full max-w-sm flex-col justify-center px-6 py-12">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-[14px] bg-accent text-white">
            <ChiliIcon className="size-7" />
          </span>
          <span>
            <span className="block text-[24px] font-semibold tracking-[-.06em]">
              kebun<span className="font-normal">cili</span>
              <span className="text-spray">.</span>
            </span>
            <span className="block text-[10px] uppercase tracking-[.22em] text-muted">The farm journal</span>
          </span>
        </div>
        <h1 className="editorial text-[34px] leading-tight">Welcome back</h1>
        <p className="mb-6 mt-2 text-[15px] text-ink-2">Log in to see the farm records.</p>
        <Suspense fallback={null}>
          <Form searchParams={props.searchParams} />
        </Suspense>
        <p className="mt-8 text-center text-sm text-muted">Accounts are added by the farm admin.</p>
      </div>
    </div>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  return <LoginForm next={param(await searchParams, "next")} />;
}
