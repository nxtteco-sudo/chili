"use client";

import Link from "next/link";
import { saveDripReading } from "@/app/actions";
import { FormError, FormField, Input, Section, SubmitButton, useFormAction } from "./form-ui";

// EC / pH measured where the water leaves the drip line (not a tank mix).
export function DripForm({ defaults, cancelHref }: { defaults: { date: string; time: string }; cancelHref: string }) {
  const { state, onSubmit, onInput, err, pending } = useFormAction(saveDripReading);
  return (
    <form onSubmit={onSubmit} onInput={onInput} className="space-y-4" noValidate>
      <FormError state={state} />
      <Section title="When">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Date" error={err("date")}>
            <Input type="date" name="date" defaultValue={defaults.date} error={err("date")} />
          </FormField>
          <FormField label="Time" error={err("time")}>
            <Input type="time" name="time" defaultValue={defaults.time} error={err("time")} />
          </FormField>
        </div>
      </Section>
      <Section title="Reading at the drip line">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="EC (mS/cm)" hint="e.g. 1.8" error={err("ec")}>
            <Input name="ec" inputMode="decimal" error={err("ec")} />
          </FormField>
          <FormField label="pH" hint="e.g. 6.0" error={err("ph")}>
            <Input name="ph" inputMode="decimal" error={err("ph")} />
          </FormField>
        </div>
        {err("reading") && <p className="text-sm text-problem">{err("reading")}</p>}
      </Section>
      <div className="flex items-center gap-3">
        <SubmitButton pending={pending}>Save reading</SubmitButton>
        <Link href={cancelHref} className="inline-flex h-12 items-center px-4 text-base text-ink-2">
          Cancel
        </Link>
      </div>
    </form>
  );
}
