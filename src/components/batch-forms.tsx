"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import { markBatchMilestone, saveBatch, saveVariety } from "@/app/actions";
import type { Batch, Variety } from "@/lib/types";
import { FormError, FormField, Input, Section, Select, SubmitButton, Textarea, useFormAction } from "./form-ui";
import { PhotoPicker } from "./photo-picker";

export function BatchForm({
  batch,
  varieties,
  defaultVarietyId,
  cancelHref,
  returnHref,
}: {
  batch?: Batch;
  varieties: Variety[];
  defaultVarietyId?: string;
  cancelHref: string;
  returnHref: string;
}) {
  const { state, onSubmit, onInput, err, pending } = useFormAction(saveBatch);
  return (
    <form onSubmit={onSubmit} onInput={onInput} className="space-y-4" noValidate>
      {batch && <input type="hidden" name="id" value={batch.id} />}
      <FormError state={state} />

      <Section title="Batch">
        <FormField label="Batch name" hint="e.g. Batch Okt 2026" error={err("name")}>
          <Input name="name" defaultValue={batch?.name} error={err("name")} />
        </FormField>
        <FormField
          label="Variety (jenis cili)"
          error={err("varietyId")}
          hint={
            <Link href={`/varieties/new?return=${encodeURIComponent(returnHref)}`} className="inline-flex items-center gap-1 font-medium text-accent">
              <Plus className="size-4" /> New variety not in the list
            </Link>
          }
        >
          <Select name="varietyId" defaultValue={batch?.varietyId ?? defaultVarietyId ?? ""} error={err("varietyId")}>
            <option value="">Not set</option>
            {varieties.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </Select>
        </FormField>
      </Section>

      <Section title="Planting">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Seeds sown (semai)" error={err("sownOn")}>
            <Input type="date" name="sownOn" defaultValue={batch?.sownOn} error={err("sownOn")} />
          </FormField>
          <FormField label="Number of seeds" hint="Optional" error={err("seedsCount")}>
            <Input name="seedsCount" inputMode="numeric" defaultValue={batch?.seedsCount} error={err("seedsCount")} />
          </FormField>
          <FormField label="Moved to polybag" hint="Leave empty if not yet" error={err("transplantedOn")}>
            <Input type="date" name="transplantedOn" defaultValue={batch?.transplantedOn} error={err("transplantedOn")} />
          </FormField>
          <FormField label="Number of polybags" hint="Optional" error={err("polybagsCount")}>
            <Input name="polybagsCount" inputMode="numeric" defaultValue={batch?.polybagsCount} error={err("polybagsCount")} />
          </FormField>
        </div>
      </Section>

      {batch && (
        <Section title="Milestones">
          <p className="-mt-2 text-sm text-muted">Usually marked from the batch page. Fix the dates here if needed.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FormField label="First flowers" error={err("firstFlowerOn")}>
              <Input type="date" name="firstFlowerOn" defaultValue={batch.firstFlowerOn} error={err("firstFlowerOn")} />
            </FormField>
            <FormField label="First harvest" error={err("firstHarvestOn")}>
              <Input type="date" name="firstHarvestOn" defaultValue={batch.firstHarvestOn} error={err("firstHarvestOn")} />
            </FormField>
            <FormField label="Crop ended" error={err("endedOn")}>
              <Input type="date" name="endedOn" defaultValue={batch.endedOn} error={err("endedOn")} />
            </FormField>
          </div>
        </Section>
      )}

      <Section title="Photos & notes">
        <PhotoPicker existing={batch?.photos} error={err("photos")} />
        <FormField label="Notes" error={err("notes")}>
          <Textarea name="notes" defaultValue={batch?.notes} placeholder="Seed source, where on the farm…" error={err("notes")} />
        </FormField>
      </Section>

      <div className="flex items-center gap-3 pt-1">
        <SubmitButton pending={pending} className="flex-1 sm:flex-none">
          {batch ? "Save changes" : "Save batch"}
        </SubmitButton>
        <Link href={cancelHref} className="inline-flex h-12 items-center rounded-xl px-5 text-base text-ink-2 hover:bg-surface-2">
          Cancel
        </Link>
      </div>
    </form>
  );
}

// One-tap "it happened" for flowers / first harvest / end, with an editable date.
export function MilestoneForm({
  batchId,
  milestone,
  label,
  today,
}: {
  batchId: string;
  milestone: "flower" | "harvest" | "end";
  label: string;
  today: string;
}) {
  const { state, onSubmit, pending } = useFormAction(markBatchMilestone);
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-3.5 text-[13px] font-medium text-accent hover:bg-surface-2"
      >
        {label}
      </button>
    );
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2" noValidate>
      <input type="hidden" name="batchId" value={batchId} />
      <input type="hidden" name="milestone" value={milestone} />
      <Input type="date" name="date" defaultValue={today} aria-label="Date" className="h-11 w-auto" />
      <SubmitButton pending={pending} className="h-11 px-4 text-[13px]">
        Save
      </SubmitButton>
      <button type="button" onClick={() => setOpen(false)} className="h-11 rounded-lg px-3 text-[13px] text-ink-2 hover:bg-surface-2">
        Cancel
      </button>
      {state?.error && <p className="w-full text-sm text-problem">{state.error}</p>}
    </form>
  );
}

export function VarietyForm({
  variety,
  returnTo,
  cancelHref,
}: {
  variety?: Variety;
  returnTo?: string;
  cancelHref: string;
}) {
  const { state, onSubmit, onInput, err, pending } = useFormAction(saveVariety);
  const days = (name: keyof Variety, label: string, hint: string) => (
    <FormField label={label} hint={hint} error={err(name)}>
      <Input name={name} inputMode="numeric" defaultValue={variety?.[name] as number | undefined} error={err(name)} />
    </FormField>
  );
  return (
    <form onSubmit={onSubmit} onInput={onInput} className="space-y-4" noValidate>
      {variety && <input type="hidden" name="id" value={variety.id} />}
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <FormError state={state} />
      <Section title="Variety">
        <FormField label="Name" hint="e.g. Kulai 461, Centil" error={err("name")}>
          <Input name="name" defaultValue={variety?.name} error={err("name")} />
        </FormField>
      </Section>
      <Section title="Days, from your experience">
        <p className="-mt-2 text-sm text-muted">
          All optional. When filled in, each batch shows the expected dates for flowering and harvest.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {days("daysSowToTransplant", "Sowing → polybag", "Days from semai to pindah polibeg")}
          {days("daysTransplantToFlower", "Polybag → first flowers", "Days after transplant")}
          {days("daysTransplantToHarvest", "Polybag → first harvest", "Days after transplant")}
          {days("harvestSeasonDays", "Harvest season length", "Days from first harvest to the end")}
        </div>
        <FormField label="Notes" error={err("notes")}>
          <Textarea name="notes" defaultValue={variety?.notes} className="min-h-20" error={err("notes")} />
        </FormField>
      </Section>
      <div className="flex items-center gap-3 pt-1">
        <SubmitButton pending={pending} className="flex-1 sm:flex-none">
          {variety ? "Save changes" : "Add variety"}
        </SubmitButton>
        <Link href={cancelHref} className="inline-flex h-12 items-center rounded-xl px-5 text-base text-ink-2 hover:bg-surface-2">
          Cancel
        </Link>
      </div>
    </form>
  );
}
