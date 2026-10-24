import { FERT_METHOD_LABEL } from "./entry-meta";
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
    };
  }
  if (a.type === "fertilizer") {
    const f = a.fertilizer;
    return {
      title: productName(f.productId),
      detail: `${formatQty(f.quantity, f.unit)} · ${FERT_METHOD_LABEL[f.method]}`,
    };
  }
  const t = a.tankMix;
  const readings = [t.ec !== undefined && `EC ${t.ec}`, t.ph !== undefined && `pH ${t.ph}`].filter(Boolean);
  return {
    title: `AB tank: A ${formatQty(t.aAmount, t.abUnit)} + B ${formatQty(t.bAmount, t.abUnit)}`,
    detail: [
      formatQty(t.waterL, "L water"),
      ...readings,
      t.additives.length > 0 && `+ ${t.additives.map((x) => productName(x.productId)).join(", ")}`,
    ]
      .filter(Boolean)
      .join(" · "),
  };
}
