const rm = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const rmWhole = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  maximumFractionDigits: 0,
});

export const formatRm = (value: number) => rm.format(value);
export const formatRmWhole = (value: number) => rmWhole.format(value);

export function formatQty(value: number, unit: string): string {
  const n = Number.isInteger(value) ? value : Number(value.toFixed(1));
  return `${n.toLocaleString("en-MY")} ${unit}`;
}

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
