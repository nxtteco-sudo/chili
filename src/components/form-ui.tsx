"use client";

import { useFormStatus } from "react-dom";
import { startTransition, useActionState, useState, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { CircleAlert, LoaderCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/format";
import type { FormState } from "@/lib/form-fields";

// Submits through onSubmit instead of <form action>, because React resets
// form fields after an action and we want typed values kept when validation fails.
// A field's error disappears as soon as that field is changed.
export function useFormAction(fn: (prev: FormState, fd: FormData) => Promise<FormState>) {
  const [state, action, pending] = useActionState(fn, undefined);
  const [edited, setEdited] = useState<{ state: FormState; names: string[] }>({ state: undefined, names: [] });
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };
  const onInput = (e: FormEvent<HTMLFormElement>) => {
    const name = (e.target as HTMLInputElement).name;
    if (!name || !state?.fieldErrors?.[name]) return;
    setEdited((d) => ({ state, names: d.state === state ? [...d.names, name] : [name] }));
  };
  const err = (name: string) =>
    edited.state === state && edited.names.includes(name) ? undefined : state?.fieldErrors?.[name];
  return { state, onSubmit, onInput, err, pending };
}

export const inputCls =
  "h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-base outline-none transition-colors placeholder:text-muted focus:border-accent aria-invalid:border-problem";

export function FormField({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className="mb-1.5 block text-sm font-medium text-ink-2">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-sm text-problem">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-sm text-muted">{hint}</span>
      )}
    </label>
  );
}

export function Input({ error, className, ...props }: ComponentProps<"input"> & { error?: string }) {
  return <input aria-invalid={error ? true : undefined} className={cn(inputCls, className)} {...props} />;
}

export function Select({ error, className, ...props }: ComponentProps<"select"> & { error?: string }) {
  return <select aria-invalid={error ? true : undefined} className={cn(inputCls, "appearance-auto pr-2", className)} {...props} />;
}

export function Textarea({ error, className, ...props }: ComponentProps<"textarea"> & { error?: string }) {
  return (
    <textarea
      aria-invalid={error ? true : undefined}
      className={cn(inputCls, "h-auto min-h-24 py-3 leading-relaxed", className)}
      {...props}
    />
  );
}

// Big tap-friendly radio pills for small fixed choices.
export function Segmented<T extends string>({
  name,
  options,
  value,
  onChange,
  defaultValue,
}: {
  name: string;
  options: { value: T; label: ReactNode }[];
  value?: T;
  onChange?: (v: T) => void;
  defaultValue?: T;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label key={o.value} className="cursor-pointer">
          <input
            type="radio"
            name={name}
            value={o.value}
            className="peer sr-only"
            {...(value !== undefined ? { checked: value === o.value } : { defaultChecked: defaultValue === o.value })}
            onChange={() => onChange?.(o.value)}
          />
          <span className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-line bg-surface px-4 text-[15px] text-ink-2 transition-colors peer-checked:border-transparent peer-checked:bg-ink peer-checked:text-bg peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4 premium-card rounded-2xl border border-line bg-surface p-5 md:p-6">
      <legend className="sr-only">{title}</legend>
      <p className="text-[15px] font-semibold">{title}</p>
      {children}
    </fieldset>
  );
}

export function FormError({ state }: { state: FormState }) {
  if (!state?.error) return null;
  return (
    <p role="alert" className="flex items-center gap-2 rounded-xl bg-problem-soft px-3.5 py-3 text-[15px] text-problem">
      <CircleAlert className="size-5 shrink-0" />
      {state.error}
    </p>
  );
}

export function SubmitButton({
  children,
  className,
  pending,
}: {
  children: ReactNode;
  className?: string;
  pending: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-6 text-base font-medium text-accent-ink transition-opacity disabled:opacity-60",
        className,
      )}
    >
      {pending && <LoaderCircle className="size-5 animate-spin" />}
      {children}
    </button>
  );
}

export function DeleteButton({
  action,
  fields,
  label = "Delete",
  confirmText,
  className,
}: {
  action: (fd: FormData) => Promise<void>;
  fields: Record<string, string>;
  label?: string;
  confirmText: string;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <DeleteSubmit label={label} className={className} />
    </form>
  );
}

function DeleteSubmit({ label, className }: { label: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={label || "Delete"}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-xl px-4 text-[15px] font-medium text-problem transition-colors hover:bg-problem-soft disabled:opacity-60",
        className,
      )}
    >
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      {label}
    </button>
  );
}
