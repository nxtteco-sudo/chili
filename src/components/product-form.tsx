"use client";

import Link from "next/link";
import { useState } from "react";
import { saveProduct } from "@/app/actions";
import type { Product } from "@/lib/types";
import { FormError, FormField, Input, Section, Segmented, Select, SubmitButton, Textarea, useFormAction } from "./form-ui";

const SUBTYPES = {
  pesticide: ["Insecticide", "Fungicide", "Herbicide", "Miticide", "Fungicide / bactericide", "Insecticide (organic)"],
  fertilizer: ["Granular", "Foliar", "Organic", "Fertigation"],
};

export function ProductForm({
  product,
  defaultCategory,
  returnTo,
  cancelHref,
}: {
  product?: Product;
  defaultCategory: Product["category"];
  returnTo?: string;
  cancelHref: string;
}) {
  const { state, onSubmit, onInput, err, pending } = useFormAction(saveProduct);
  const [category, setCategory] = useState<Product["category"]>(product?.category ?? defaultCategory);

  return (
    <form onSubmit={onSubmit} onInput={onInput} className="space-y-4" noValidate>
      {product && <input type="hidden" name="id" value={product.id} />}
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <FormError state={state} />

      <Section title="Product">
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink-2">Category</p>
          <Segmented
            name="category"
            value={category}
            onChange={setCategory}
            options={[
              { value: "pesticide", label: "Pesticide (racun)" },
              { value: "fertilizer", label: "Baja" },
            ]}
          />
          {err("category") && <p className="mt-1 text-sm text-problem">{err("category")}</p>}
        </div>
        <FormField label="Name (as on the bottle / bag)" error={err("name")}>
          <Input name="name" defaultValue={product?.name} error={err("name")} />
        </FormField>
        <FormField label="Type" error={err("subtype")}>
          <Input name="subtype" list={`subtypes-${category}`} defaultValue={product?.subtype} error={err("subtype")} />
          <datalist id={`subtypes-${category}`}>
            {SUBTYPES[category].map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </FormField>
        {category === "pesticide" ? (
          <FormField label="Active ingredient" hint="Optional, from the label" error={err("activeIngredient")}>
            <Input name="activeIngredient" defaultValue={product?.activeIngredient} error={err("activeIngredient")} />
          </FormField>
        ) : (
          <FormField label="NPK" hint="Optional, e.g. 15-15-15" error={err("npk")}>
            <Input name="npk" defaultValue={product?.npk} error={err("npk")} />
          </FormField>
        )}
      </Section>

      <Section title="Pack & price">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FormField label="Pack size" error={err("packSize")}>
            <Input name="packSize" inputMode="decimal" defaultValue={product?.packSize} error={err("packSize")} />
          </FormField>
          <FormField label="Unit" error={err("unit")}>
            <Select name="unit" defaultValue={product?.unit ?? (category === "pesticide" ? "ml" : "kg")} error={err("unit")}>
              {["ml", "L", "g", "kg", "karung", "pcs"].map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Price (RM)" error={err("packPriceRm")}>
            <Input name="packPriceRm" inputMode="decimal" defaultValue={product?.packPriceRm} error={err("packPriceRm")} />
          </FormField>
        </div>
        {category === "pesticide" && (
          <FormField
            label="Waiting period before harvest (days)"
            hint="Tempoh selamat, printed on the label. Used for the harvest warning."
            error={err("phiDays")}
          >
            <Input name="phiDays" inputMode="numeric" defaultValue={product?.phiDays} error={err("phiDays")} />
          </FormField>
        )}
        <FormField label="Notes" error={err("notes")}>
          <Textarea name="notes" defaultValue={product?.notes} className="min-h-20" error={err("notes")} />
        </FormField>
      </Section>

      <div className="flex items-center gap-3 pt-1">
        <SubmitButton pending={pending} className="flex-1 sm:flex-none">
          {product ? "Save changes" : "Add product"}
        </SubmitButton>
        <Link href={cancelHref} className="inline-flex h-12 items-center rounded-xl px-5 text-base text-ink-2 hover:bg-surface-2">
          Cancel
        </Link>
      </div>
    </form>
  );
}
