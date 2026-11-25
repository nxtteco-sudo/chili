import { formatQty } from "./format";

// Pack sizes are written in kg / L but doses in g / ml, so quantities are
// converted into each product's own unit before they are added up.

const FACTOR: Record<string, { base: "g" | "ml"; times: number }> = {
  g: { base: "g", times: 1 },
  kg: { base: "g", times: 1000 },
  ml: { base: "ml", times: 1 },
  L: { base: "ml", times: 1000 },
  l: { base: "ml", times: 1000 },
};

// undefined when the units can't be compared (e.g. kg vs ml).
export function convertQty(qty: number, from: string, to: string): number | undefined {
  if (from === to) return qty;
  const a = FACTOR[from];
  const b = FACTOR[to];
  if (!a || !b || a.base !== b.base) return undefined;
  return (qty * a.times) / b.times;
}

// 1500 ml reads better as 1.5 L.
export function friendlyQty(qty: number, unit: string): string {
  if (unit === "ml" && Math.abs(qty) >= 1000) return formatQty(qty / 1000, "L");
  if (unit === "g" && Math.abs(qty) >= 1000) return formatQty(qty / 1000, "kg");
  return formatQty(qty, unit);
}
