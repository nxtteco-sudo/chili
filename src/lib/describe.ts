import { FERT_METHOD_LABEL, WATER_METHOD_LABEL } from "./entry-meta";
import { formatQty } from "./format";
import type { Activity, Product } from "./types";

// One-line title + detail for lists, shared by every page that shows activities.
export function describeActivity(a: Activity, products: Product[]) {
  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? "Unknown product";

  if (a.type === "spray") {
    const s = a.spray;
    return {
      title: productName(s.productId),
      detail: `${formatQty(s.dosePerTank, s.doseUnit)}/tong × ${s.tanks} tong · ${s.target}`,
      cost: s.costRm,
    };
  }
  if (a.type === "fertilizer") {
    const f = a.fertilizer;
    return {
      title: productName(f.productId),
      detail: `${formatQty(f.quantity, f.unit)} · ${FERT_METHOD_LABEL[f.method]}`,
      cost: f.costRm,
    };
  }
  const w = a.water;
  return {
    title: `${WATER_METHOD_LABEL[w.method]}${w.durationMin ? ` ${w.durationMin} min` : ""}`,
    detail: [w.volumeL && `~${formatQty(w.volumeL, "L")}`, w.rained && "Light rain"]
      .filter(Boolean)
      .join(" · ") || "Watered",
    cost: 0,
  };
}
