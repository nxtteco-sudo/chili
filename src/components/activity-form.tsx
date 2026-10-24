"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { saveActivity } from "@/app/actions";
import { FERT_METHOD_LABEL } from "@/lib/entry-meta";
import { formatQty } from "@/lib/format";
import type { Activity, ActivityType, FertilizerDetails, Product, TankMixDetails } from "@/lib/types";
import { FormError, FormField, Input, Section, Segmented, Select, SubmitButton, Textarea, useFormAction } from "./form-ui";
import { PhotoPicker } from "./photo-picker";

const WEATHER = ["Sunny", "Cloudy", "Hot", "Windy", "Rain after spray"];

export type ProblemOption = { id: string; title: string; status: "open" | "resolved" };
export type BatchOption = { id: string; name: string; stage: string };

export function ActivityForm({
  type,
  activity,
  products,
  problems,
  batches,
  defaults,
  lastTankMix,
  cancelHref,
  returnHref,
}: {
  type: ActivityType;
  activity?: Activity;
  products: Product[];
  problems: ProblemOption[];
  batches: BatchOption[];
  defaults: { date: string; time: string; productId?: string; problemId?: string; batchIds: string[] };
  lastTankMix?: TankMixDetails;
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
      {type === "tank_mix" && (
        <TankMixFields
          details={activity?.type === "tank_mix" ? activity.tankMix : undefined}
          last={lastTankMix}
          products={products.filter((p) => p.category === "fertilizer")}
          err={err}
          returnHref={returnHref}
        />
      )}
      {type === "fertilizer" && (
        <OtherBajaFields
          details={activity?.type === "fertilizer" ? activity.fertilizer : undefined}
          products={products.filter((p) => p.category === "fertilizer")}
          defaultProductId={defaults.productId}
          err={err}
          returnHref={returnHref}
        />
      )}

      <Section title="Which batch?">
        <BatchPicker batches={batches} selected={activity?.batchIds ?? defaults.batchIds} error={err("batchIds")} />
        <FormField label="For a problem?" hint="Link it if this was done to fix a problem." error={err("problemId")}>
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

function BatchPicker({ batches, selected, error }: { batches: BatchOption[]; selected: string[]; error?: string }) {
  if (batches.length === 0)
    return (
      <p className="rounded-xl bg-surface-2 px-3.5 py-3 text-[15px] text-ink-2">
        No active batch.{" "}
        <Link href="/batches/new" className="font-medium text-accent underline">
          Add a planting batch
        </Link>{" "}
        to link entries to it.
      </p>
    );
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-ink-2">Batch</p>
      <div className="flex flex-wrap gap-2">
        {batches.map((b) => (
          <label key={b.id} className="cursor-pointer">
            <input type="checkbox" name="batchIds" value={b.id} defaultChecked={selected.includes(b.id)} className="peer sr-only" />
            <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-[15px] text-ink-2 transition-colors peer-checked:border-accent/40 peer-checked:bg-accent-soft peer-checked:text-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
              {b.name}
              <span className="text-xs text-muted">{b.stage}</span>
            </span>
          </label>
        ))}
      </div>
      {error && <p className="mt-1 text-sm text-problem">{error}</p>}
    </div>
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

type Err = (k: string) => string | undefined;

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
  err: Err;
  returnHref: string;
}) {
  const s = activity?.spray;
  const [productId, setProductId] = useState(s?.productId ?? defaultProductId ?? "");
  const [dose, setDose] = useState(s ? String(s.dosePerTank) : "");
  const [tanks, setTanks] = useState(s ? String(s.tanks) : "");
  const [weather, setWeather] = useState(s?.weather || "Sunny");
  const product = products.find((p) => p.id === productId);
  const total = num(dose) !== undefined && num(tanks) !== undefined ? num(dose)! * num(tanks)! : undefined;
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
          {product.phiDays ? <> · {product.phiDays}-day wait before harvest</> : null}
        </p>
      )}
      <div>
        <p className="mb-1.5 text-sm font-medium text-ink-2">Weather</p>
        <Segmented name="weather" value={weather} onChange={setWeather} options={weatherOptions.map((w) => ({ value: w, label: w }))} />
      </div>
    </Section>
  );
}

function TankMixFields({
  details,
  last,
  products,
  err,
  returnHref,
}: {
  details?: TankMixDetails;
  last?: TankMixDetails;
  products: Product[];
  err: Err;
  returnHref: string;
}) {
  // New tanks start from the previous tank's recipe; readings are always fresh.
  const start = details ?? last;
  const nextKey = useRef(0);
  const [rows, setRows] = useState(() =>
    (details?.additives ?? []).map((a, i) => ({ key: -1 - i, productId: a.productId, qty: String(a.quantity) })),
  );
  const unitOf = (id: string) => products.find((p) => p.id === id)?.unit;

  return (
    <Section title="AB tank mix">
      {!details && last && <p className="-mt-2 text-sm text-muted">Filled in from the last tank. Change anything that&apos;s different.</p>}
      <div className="grid grid-cols-3 gap-3">
        <FormField label="A" error={err("aAmount")}>
          <Input name="aAmount" inputMode="decimal" defaultValue={start?.aAmount} error={err("aAmount")} />
        </FormField>
        <FormField label="B" error={err("bAmount")}>
          <Input name="bAmount" inputMode="decimal" defaultValue={start?.bAmount} error={err("bAmount")} />
        </FormField>
        <FormField label="Unit" error={err("abUnit")}>
          <Select name="abUnit" defaultValue={start?.abUnit ?? "L"} error={err("abUnit")}>
            {["L", "ml", "kg", "g"].map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      <FormField label="Water in the tank (litres)" error={err("waterL")}>
        <Input name="waterL" inputMode="decimal" defaultValue={start?.waterL ?? 1000} error={err("waterL")} />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="EC (mS/cm)" hint={last?.ec !== undefined && !details ? `Last tank: ${last.ec}` : undefined} error={err("ec")}>
          <Input name="ec" inputMode="decimal" defaultValue={details?.ec} placeholder="e.g. 2.2" error={err("ec")} />
        </FormField>
        <FormField label="pH" hint={last?.ph !== undefined && !details ? `Last tank: ${last.ph}` : undefined} error={err("ph")}>
          <Input name="ph" inputMode="decimal" defaultValue={details?.ph} placeholder="e.g. 6.0" error={err("ph")} />
        </FormField>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-ink-2">Extra fertilizer added to the tank</p>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center gap-2">
              <Select
                name="additiveProductId"
                aria-label="Extra fertilizer"
                value={r.productId}
                onChange={(e) => setRows((list) => list.map((x) => (x.key === r.key ? { ...x, productId: e.target.value } : x)))}
                className="min-w-0 flex-1"
              >
                <option value="">Choose…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              <div className="relative w-28 shrink-0">
                <Input
                  name="additiveQty"
                  aria-label="Amount"
                  inputMode="decimal"
                  value={r.qty}
                  onChange={(e) => setRows((list) => list.map((x) => (x.key === r.key ? { ...x, qty: e.target.value } : x)))}
                  className="pr-12"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">{unitOf(r.productId) ?? ""}</span>
              </div>
              <button
                type="button"
                onClick={() => setRows((list) => list.filter((x) => x.key !== r.key))}
                aria-label="Remove row"
                className="grid size-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
        {err("additives") && <p className="mt-1 text-sm text-problem">{err("additives")}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <button
            type="button"
            onClick={() => setRows((list) => [...list, { key: nextKey.current++, productId: "", qty: "" }])}
            className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-medium text-accent"
          >
            <Plus className="size-4" /> Add extra fertilizer
          </button>
          <Link href={`/products/new?category=fertilizer&return=${encodeURIComponent(returnHref)}`} className="text-sm text-muted underline">
            New fertilizer not in the list
          </Link>
        </div>
      </div>
    </Section>
  );
}

function OtherBajaFields({
  details,
  products,
  defaultProductId,
  err,
  returnHref,
}: {
  details?: FertilizerDetails;
  products: Product[];
  defaultProductId?: string;
  err: Err;
  returnHref: string;
}) {
  const [productId, setProductId] = useState(details?.productId ?? defaultProductId ?? "");
  const product = products.find((p) => p.id === productId);
  return (
    <Section title="Baja details">
      <p className="-mt-2 text-sm text-muted">For fertilizer not given through the drip tank.</p>
      <ProductSelect products={products} value={productId} onChange={setProductId} error={err("productId")} category="fertilizer" returnHref={returnHref} />
      <FormField label={`Quantity${product ? ` (${product.unit})` : ""}`} error={err("quantity")}>
        <Input name="quantity" inputMode="decimal" defaultValue={details?.quantity} error={err("quantity")} />
      </FormField>
      <div>
        <p className="mb-1.5 text-sm font-medium text-ink-2">Method</p>
        <Segmented
          name="method"
          defaultValue={details?.method ?? "foliar"}
          options={(Object.keys(FERT_METHOD_LABEL) as FertilizerDetails["method"][]).map((m) => ({ value: m, label: FERT_METHOD_LABEL[m] }))}
        />
        {err("method") && <p className="mt-1 text-sm text-problem">{err("method")}</p>}
      </div>
    </Section>
  );
}
