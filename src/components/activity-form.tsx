"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import { saveActivity } from "@/app/actions";
import { FERT_METHOD_LABEL, STAGE_LABEL, WATER_METHOD_LABEL } from "@/lib/entry-meta";
import { formatQty, formatRm } from "@/lib/format";
import type { Activity, ActivityType, PlantStage, Product } from "@/lib/types";
import { FormError, FormField, Input, Section, Segmented, Select, SubmitButton, Textarea, useFormAction } from "./form-ui";
import { PhotoPicker } from "./photo-picker";

const WEATHER = ["Sunny", "Cloudy", "Hot", "Windy", "Rain after spray"];

export type ProblemOption = { id: string; title: string; status: "open" | "resolved" };

export function ActivityForm({
  type,
  activity,
  products,
  problems,
  defaults,
  cancelHref,
  returnHref,
}: {
  type: ActivityType;
  activity?: Activity;
  products: Product[];
  problems: ProblemOption[];
  defaults: { date: string; time: string; plantStage: PlantStage; productId?: string; problemId?: string };
  cancelHref: string;
  returnHref: string;
}) {
  const { state, onSubmit, onInput, err, pending } = useFormAction(saveActivity);
  const date = activity ? activity.occurredAt.slice(0, 10) : defaults.date;
  const time = activity ? activity.occurredAt.slice(11, 16) : defaults.time;

  return (
    <form onSubmit={onSubmit} onInput={onInput} className="space-y-4" noValidate>
      {activity && <input type="hidden" name="id" value={activity.id} />}
      <input type="hidden" name="type" value={type} />
      <FormError state={state} />

      <Section title="When">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Date" error={err("date")}>
            <Input type="date" name="date" defaultValue={date} error={err("date")} />
          </FormField>
          <FormField label="Time" error={err("time")}>
            <Input type="time" name="time" defaultValue={time} error={err("time")} />
          </FormField>
        </div>
      </Section>

      {type === "spray" && (
        <SprayFields
          activity={activity?.type === "spray" ? activity : undefined}
          products={products.filter((p) => p.category === "pesticide")}
          defaultProductId={defaults.productId}
          err={err}
          returnHref={returnHref}
        />
      )}
      {type === "fertilizer" && (
        <FertilizerFields
          activity={activity?.type === "fertilizer" ? activity : undefined}
          products={products.filter((p) => p.category === "fertilizer")}
          defaultProductId={defaults.productId}
          defaultStage={defaults.plantStage}
          err={err}
          returnHref={returnHref}
        />
      )}
      {type === "water" && <WaterFields activity={activity?.type === "water" ? activity : undefined} err={err} />}

      {type !== "water" && (
        <Section title="For a problem?">
          <FormField label="Linked problem" hint="Link it if this was done to fix a problem." error={err("problemId")}>
            <Select name="problemId" defaultValue={activity?.problemId ?? defaults.problemId ?? ""} error={err("problemId")}>
              <option value="">Not for a problem (routine)</option>
              {problems.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                  {p.status === "resolved" ? " (closed)" : ""}
                </option>
              ))}
            </Select>
          </FormField>
        </Section>
      )}

      <Section title="Photos & notes">
        <PhotoPicker existing={activity?.photos} error={err("photos")} />
        <FormField label="Notes" error={err("notes")}>
          <Textarea name="notes" defaultValue={activity?.notes} placeholder="Anything worth remembering" error={err("notes")} />
        </FormField>
      </Section>

      <div className="flex items-center gap-3 pt-1">
        <SubmitButton pending={pending} className="flex-1 sm:flex-none">{activity ? "Save changes" : "Save entry"}</SubmitButton>
        <Link href={cancelHref} className="inline-flex h-12 items-center rounded-xl px-5 text-base text-ink-2 hover:bg-surface-2">
          Cancel
        </Link>
      </div>
    </form>
  );
}


function ProductSelect({
  products,
  value,
  onChange,
  error,
  category,
  returnHref,
}: {
  products: Product[];
  value: string;
  onChange: (id: string) => void;
  error?: string;
  category: Product["category"];
  returnHref: string;
}) {
  return (
    <FormField
      label="Product"
      error={error}
      hint={
        <Link
          href={`/products/new?category=${category}&return=${encodeURIComponent(returnHref)}`}
          className="inline-flex items-center gap-1 font-medium text-accent"
        >
          <Plus className="size-4" /> New product not in the list
        </Link>
      }
    >
      <Select name="productId" value={value} onChange={(e) => onChange(e.target.value)} error={error}>
        <option value="" disabled>
          Choose…
        </option>
        {[...products]
          .sort((a, z) => a.name.localeCompare(z.name))
          .map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
      </Select>
    </FormField>
  );
}

const num = (v: string) => {
  const n = Number(v.replace(",", "."));
  return v.trim() && Number.isFinite(n) ? n : undefined;
};

function SprayFields({
  activity,
  products,
  defaultProductId,
  err,
  returnHref,
}: {
  activity?: Extract<Activity, { type: "spray" }>;
  products: Product[];
  defaultProductId?: string;
  err: (k: string) => string | undefined;
  returnHref: string;
}) {
  const s = activity?.spray;
  const [productId, setProductId] = useState(s?.productId ?? defaultProductId ?? "");
  const [dose, setDose] = useState(s ? String(s.dosePerTank) : "");
  const [tanks, setTanks] = useState(s ? String(s.tanks) : "");
  const [weather, setWeather] = useState(s?.weather ?? "Sunny");
  const product = products.find((p) => p.id === productId);
  const total = num(dose) !== undefined && num(tanks) !== undefined ? num(dose)! * num(tanks)! : undefined;
  const estCost = product && total !== undefined ? (total / product.packSize) * product.packPriceRm : undefined;
  const weatherOptions = WEATHER.includes(weather) ? WEATHER : [...WEATHER, weather];

  return (
    <Section title="Spray details">
      <ProductSelect products={products} value={productId} onChange={setProductId} error={err("productId")} category="pesticide" returnHref={returnHref} />
      <FormField label="Target / reason" hint="Pest, disease, or 'Pencegahan (preventive)'" error={err("target")}>
        <Input name="target" defaultValue={s?.target} placeholder="e.g. Thrips" error={err("target")} />
      </FormField>
      <div className="grid grid-cols-3 gap-3">
        <FormField label={`Dose / tong${product ? ` (${product.unit})` : ""}`} error={err("dosePerTank")}>
          <Input name="dosePerTank" inputMode="decimal" value={dose} onChange={(e) => setDose(e.target.value)} error={err("dosePerTank")} />
        </FormField>
        <FormField label="Tong" error={err("tanks")}>
          <Input name="tanks" inputMode="decimal" value={tanks} onChange={(e) => setTanks(e.target.value)} error={err("tanks")} />
        </FormField>
        <FormField label="Tong size (L)" error={err("tankSizeL")}>
          <Input name="tankSizeL" inputMode="decimal" defaultValue={s?.tankSizeL ?? 16} error={err("tankSizeL")} />
        </FormField>
      </div>
      {total !== undefined && product && (
        <p className="rounded-xl bg-surface-2 px-3.5 py-2.5 text-[15px] text-ink-2">
          Total used: <b className="font-medium text-ink">{formatQty(total, product.unit)}</b>
          {estCost !== undefined && <> · about <b className="font-medium text-ink">{formatRm(estCost)}</b></>}
          {product.phiDays ? <> · {product.phiDays}-day wait before harvest</> : null}
        </p>
      )}
      <FormField label="Cost (RM)" hint="Leave empty to calculate from the product price" error={err("costRm")}>
        <Input name="costRm" inputMode="decimal" defaultValue={activity ? s?.costRm : undefined} placeholder={estCost !== undefined ? estCost.toFixed(2) : "Auto"} error={err("costRm")} />
      </FormField>
      <div>
        <p className="mb-1.5 text-sm font-medium text-ink-2">Weather</p>
        <Segmented name="weather" value={weather} onChange={setWeather} options={weatherOptions.map((w) => ({ value: w, label: w }))} />
      </div>
    </Section>
  );
}

function FertilizerFields({
  activity,
  products,
  defaultProductId,
  defaultStage,
  err,
  returnHref,
}: {
  activity?: Extract<Activity, { type: "fertilizer" }>;
  products: Product[];
  defaultProductId?: string;
  defaultStage: PlantStage;
  err: (k: string) => string | undefined;
  returnHref: string;
}) {
  const f = activity?.fertilizer;
  const [productId, setProductId] = useState(f?.productId ?? defaultProductId ?? "");
  const [qty, setQty] = useState(f ? String(f.quantity) : "");
  const product = products.find((p) => p.id === productId);
  const estCost = product && num(qty) !== undefined ? (num(qty)! / product.packSize) * product.packPriceRm : undefined;

  return (
    <Section title="Baja details">
      <ProductSelect products={products} value={productId} onChange={setProductId} error={err("productId")} category="fertilizer" returnHref={returnHref} />
      <FormField label={`Quantity${product ? ` (${product.unit})` : ""}`} error={err("quantity")}>
        <Input name="quantity" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} error={err("quantity")} />
      </FormField>
      <div>
        <p className="mb-1.5 text-sm font-medium text-ink-2">Method</p>
        <Segmented
          name="method"
          defaultValue={f?.method ?? "tabur"}
          options={(Object.keys(FERT_METHOD_LABEL) as (keyof typeof FERT_METHOD_LABEL)[]).map((m) => ({ value: m, label: FERT_METHOD_LABEL[m] }))}
        />
        {err("method") && <p className="mt-1 text-sm text-problem">{err("method")}</p>}
      </div>
      <FormField label="Plant stage" error={err("plantStage")}>
        <Select name="plantStage" defaultValue={f?.plantStage ?? defaultStage} error={err("plantStage")}>
          {(Object.keys(STAGE_LABEL) as PlantStage[]).map((s) => (
            <option key={s} value={s}>
              {STAGE_LABEL[s]}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Cost (RM)" hint="Leave empty to calculate from the product price" error={err("costRm")}>
        <Input name="costRm" inputMode="decimal" defaultValue={activity ? f?.costRm : undefined} placeholder={estCost !== undefined ? estCost.toFixed(2) : "Auto"} error={err("costRm")} />
      </FormField>
    </Section>
  );
}

function WaterFields({
  activity,
  err,
}: {
  activity?: Extract<Activity, { type: "water" }>;
  err: (k: string) => string | undefined;
}) {
  const w = activity?.water;
  const [rained, setRained] = useState(w?.rained ?? false);
  return (
    <Section title="Watering details">
      <div>
        <p className="mb-1.5 text-sm font-medium text-ink-2">Method</p>
        <Segmented
          name="method"
          defaultValue={w?.method ?? "drip"}
          options={(Object.keys(WATER_METHOD_LABEL) as (keyof typeof WATER_METHOD_LABEL)[]).map((m) => ({ value: m, label: WATER_METHOD_LABEL[m] }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Duration (minutes)" error={err("durationMin")}>
          <Input name="durationMin" inputMode="numeric" defaultValue={w?.durationMin} error={err("durationMin")} />
        </FormField>
        <FormField label="Volume (litres)" hint="Optional" error={err("volumeL")}>
          <Input name="volumeL" inputMode="decimal" defaultValue={w?.volumeL} error={err("volumeL")} />
        </FormField>
      </div>
      <label className="flex items-center gap-3 text-[15px]">
        <input type="checkbox" name="rained" checked={rained} onChange={(e) => setRained(e.target.checked)} className="size-5 accent-[var(--accent)]" />
        It rained today (hujan)
      </label>
      {rained && (
        <FormField label="Rain note" error={err("rainNote")}>
          <Input name="rainNote" defaultValue={w?.rainNote} placeholder="e.g. Hujan renyai pagi" error={err("rainNote")} />
        </FormField>
      )}
    </Section>
  );
}
