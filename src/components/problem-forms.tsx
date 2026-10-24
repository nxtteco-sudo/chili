"use client";

import Link from "next/link";
import { useState } from "react";
import { CircleAlert, CircleCheck, CircleX } from "lucide-react";
import { addProblemUpdate, closeProblem, saveProblem } from "@/app/actions";
import type { Problem } from "@/lib/types";
import { FormError, FormField, Input, Section, Segmented, Select, SubmitButton, Textarea, useFormAction } from "./form-ui";
import { PhotoPicker } from "./photo-picker";

const PARTS: Problem["affectedPart"][] = ["leaf", "stem", "root", "flower", "fruit", "whole plant"];
const CAUSES: { value: Problem["causeKind"]; label: string }[] = [
  { value: "pest", label: "Pest (serangga)" },
  { value: "disease", label: "Disease (penyakit / kulat)" },
  { value: "nutrient", label: "Nutrient (baja)" },
  { value: "water", label: "Water (air)" },
  { value: "weather", label: "Weather (cuaca)" },
  { value: "unknown", label: "Not sure yet" },
];

export function ProblemForm({
  problem,
  today,
  cancelHref,
}: {
  problem?: Problem;
  today: string;
  cancelHref: string;
}) {
  const { state, onSubmit, onInput, err, pending } = useFormAction(saveProblem);
  return (
    <form onSubmit={onSubmit} onInput={onInput} className="space-y-4" noValidate>
      {problem && <input type="hidden" name="id" value={problem.id} />}
      <FormError state={state} />

      <Section title="What's wrong?">
        <FormField label="Short title" hint="e.g. Daun kerinting, Buah reput" error={err("title")}>
          <Input name="title" defaultValue={problem?.title} error={err("title")} />
        </FormField>
        <FormField label="Symptoms" hint="What does it look like? Where on the farm?" error={err("symptoms")}>
          <Textarea name="symptoms" defaultValue={problem?.symptoms} error={err("symptoms")} />
        </FormField>
        <PhotoPicker existing={problem?.photos} error={err("photos")} />
      </Section>

      <Section title="Details">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Date found" error={err("foundOn")}>
            <Input type="date" name="foundOn" defaultValue={problem?.foundOn ?? today} error={err("foundOn")} />
          </FormField>
          <FormField label="Affected part" error={err("affectedPart")}>
            <Select name="affectedPart" defaultValue={problem?.affectedPart ?? "leaf"} error={err("affectedPart")}>
              {PARTS.map((p) => (
                <option key={p} value={p}>
                  {p[0].toUpperCase() + p.slice(1)}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink-2">How serious?</p>
          <Segmented
            name="severity"
            defaultValue={problem?.severity ?? "medium"}
            options={[
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
            ]}
          />
        </div>
        <FormField label="Cause type" error={err("causeKind")}>
          <Select name="causeKind" defaultValue={problem?.causeKind ?? "unknown"} error={err("causeKind")}>
            {CAUSES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Suspected cause" hint="Your best guess, e.g. Thrips, Kurang kalsium" error={err("suspectedCause")}>
          <Input name="suspectedCause" defaultValue={problem?.suspectedCause} error={err("suspectedCause")} />
        </FormField>
        <FormField
          label="Tags"
          hint="Comma separated words to find it again later, e.g. thrips, daun kerinting"
          error={err("tags")}
        >
          <Input name="tags" defaultValue={problem?.tags.join(", ")} error={err("tags")} />
        </FormField>
      </Section>

      <div className="flex items-center gap-3 pt-1">
        <SubmitButton pending={pending} className="flex-1 sm:flex-none">
          {problem ? "Save changes" : "Save problem"}
        </SubmitButton>
        <Link href={cancelHref} className="inline-flex h-12 items-center rounded-xl px-5 text-base text-ink-2 hover:bg-surface-2">
          Cancel
        </Link>
      </div>
    </form>
  );
}

export function ProblemUpdateForm({ problemId, today, now }: { problemId: string; today: string; now: string }) {
  const { state, onSubmit, onInput, err, pending } = useFormAction(addProblemUpdate);
  // A new key after each save clears the form, including the photo picker.
  return (
    <form key={state?.savedAt ?? 0} onSubmit={onSubmit} onInput={onInput} className="space-y-3" noValidate>
      <input type="hidden" name="problemId" value={problemId} />
      {state?.error && <FormError state={state} />}
      {state?.savedAt && !state.error && (
        <p className="flex items-center gap-2 text-sm text-good-ink">
          <CircleCheck className="size-4" /> Added
        </p>
      )}
      <Segmented
        name="kind"
        defaultValue="followup"
        options={[
          { value: "followup", label: "Follow-up (how it looks now)" },
          { value: "action", label: "Action (something we did)" },
        ]}
      />
      <Textarea name="body" placeholder="e.g. Lepas 5 hari dah kurang" error={err("body")} className="min-h-20" />
      {err("body") && <p className="-mt-2 text-sm text-problem">{err("body")}</p>}
      <PhotoPicker error={err("photos")} />
      <div className="grid grid-cols-2 gap-3">
        <Input type="date" name="date" defaultValue={today} aria-label="Date" error={err("date")} />
        <Input type="time" name="time" defaultValue={now} aria-label="Time" error={err("time")} />
      </div>
      <SubmitButton pending={pending} className="w-full sm:w-auto">
        Add update
      </SubmitButton>
    </form>
  );
}

export function CloseProblemForm({ problemId, today }: { problemId: string; today: string }) {
  const { state, onSubmit, onInput, err, pending } = useFormAction(closeProblem);
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface text-base font-medium hover:bg-surface-2"
      >
        <CircleCheck className="size-5 text-good" /> Close this problem
      </button>
    );
  return (
    <form onSubmit={onSubmit} onInput={onInput} className="space-y-3 rounded-2xl border border-line bg-surface p-4" noValidate>
      <input type="hidden" name="problemId" value={problemId} />
      <p className="text-[15px] font-semibold">Close problem</p>
      <FormError state={state} />
      <div>
        <p className="mb-1.5 text-sm font-medium text-ink-2">Did it work?</p>
        <Segmented
          name="outcome"
          defaultValue="solved"
          options={[
            { value: "solved", label: <><CircleCheck className="size-4" /> Solved</> },
            { value: "partly", label: <><CircleAlert className="size-4" /> Partly</> },
            { value: "not_solved", label: <><CircleX className="size-4" /> Not solved</> },
          ]}
        />
      </div>
      <FormField label="What did you learn? (Pengajaran)" hint="This is what shows up next time the same problem happens." error={err("lesson")}>
        <Textarea name="lesson" placeholder="e.g. Spray Movento petang, ulang selepas 7 hari" error={err("lesson")} />
      </FormField>
      <FormField label="Date closed" error={err("resolvedOn")}>
        <Input type="date" name="resolvedOn" defaultValue={today} error={err("resolvedOn")} />
      </FormField>
      <div className="flex gap-3">
        <SubmitButton pending={pending}>Close problem</SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className="h-12 rounded-xl px-5 text-ink-2 hover:bg-surface-2">
          Cancel
        </button>
      </div>
    </form>
  );
}
