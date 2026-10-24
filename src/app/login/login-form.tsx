"use client";

import { useState, type ReactNode } from "react";
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { FormError, useFormAction } from "@/components/form-ui";
import { cn } from "@/lib/format";
import { signIn } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const { state, onSubmit, onInput, err, pending } = useFormAction(signIn);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form onSubmit={onSubmit} onInput={onInput} className="space-y-5" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <FormError state={state} />

      <Field id="login-email" label="Email" error={err("email")} icon={<Mail className="size-[18px]" strokeWidth={1.7} />}>
        <input
          id="login-email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="you@example.com"
          aria-invalid={err("email") ? true : undefined}
          className={inputClass}
        />
      </Field>

      <Field
        id="login-password"
        label="Password"
        error={err("password")}
        icon={<LockKeyhole className="size-[18px]" strokeWidth={1.7} />}
        trailing={
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="grid size-11 place-items-center rounded-lg text-muted transition-colors duration-150 hover:text-ink"
          >
            {showPassword ? <EyeOff className="size-[18px]" strokeWidth={1.7} /> : <Eye className="size-[18px]" strokeWidth={1.7} />}
          </button>
        }
      >
        <input
          id="login-password"
          type={showPassword ? "text" : "password"}
          name="password"
          autoComplete="current-password"
          placeholder="••••••••"
          aria-invalid={err("password") ? true : undefined}
          className={cn(inputClass, "pr-12")}
        />
      </Field>

      <button
        type="submit"
        disabled={pending}
        className="group relative flex h-[52px] w-full items-center justify-center gap-2 overflow-hidden rounded-[14px] bg-[linear-gradient(180deg,#3a6b4b,#2b5039)] text-[15px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(16,40,26,0.25),0_10px_24px_-10px_rgba(43,80,57,0.7)] transition-[transform,box-shadow,opacity] duration-150 ease-out hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_1px_2px_rgba(16,40,26,0.25),0_14px_28px_-10px_rgba(43,80,57,0.8)] active:scale-[0.98] disabled:opacity-80"
      >
        {pending ? (
          <>
            <LoaderCircle className="size-5 animate-spin" /> Logging in…
          </>
        ) : (
          <>
            Log in <span className="font-normal text-white/70">· Log masuk</span>
            <ArrowRight className="size-[18px] transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
          </>
        )}
      </button>
    </form>
  );
}

const inputClass =
  "h-[52px] w-full rounded-[14px] border border-[#dfe5d8] bg-[#fbfcf8] pl-11 pr-4 text-base text-ink outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-[#a7b0a6] hover:border-[#cdd6c4] focus:border-accent focus:bg-white focus:shadow-[0_0_0_4px_rgba(49,92,65,0.12)] aria-invalid:border-problem aria-invalid:shadow-[0_0_0_4px_rgba(186,101,81,0.12)]";

// The show/hide button sits beside the input, outside the <label>, so the
// field's accessible name stays just "Password".
function Field({
  id,
  label,
  error,
  icon,
  trailing,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  icon: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[13px] font-medium text-ink-2">
        {label}
      </label>
      <div className="relative text-muted focus-within:text-accent">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-150">{icon}</span>
        {children}
        {trailing && <span className="absolute right-1 top-1/2 -translate-y-1/2">{trailing}</span>}
      </div>
      {error && <p className="mt-1.5 text-sm text-problem">{error}</p>}
    </div>
  );
}
