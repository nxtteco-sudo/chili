import { convertQty } from "./units";
import type { Activity, Product, Purchase } from "./types";

export type Stock = {
  bought: number;
  used: number;
  left: number; // in the product's own unit; can go negative if a purchase wasn't logged
  purchases: number;
};

// Stock left = everything bought minus everything used in sprays, baja and tank mixes.
export function stockOf(product: Product, purchases: Purchase[], activities: Activity[]): Stock {
  const mine = purchases.filter((p) => p.productId === product.id);
  const bought = mine.reduce((sum, p) => sum + (convertQty(p.quantity, p.unit, product.unit) ?? 0), 0);

  let used = 0;
  const add = (qty: number, unit: string) => {
    used += convertQty(qty, unit, product.unit) ?? 0;
  };
  for (const a of activities) {
    if (a.type === "spray" && a.spray.productId === product.id) add(a.spray.totalQty, a.spray.doseUnit);
    else if (a.type === "fertilizer" && a.fertilizer.productId === product.id) add(a.fertilizer.quantity, a.fertilizer.unit);
    else if (a.type === "tank_mix") for (const x of a.tankMix.additives) if (x.productId === product.id) add(x.quantity, x.unit);
  }
  return { bought, used, left: bought - used, purchases: mine.length };
}
