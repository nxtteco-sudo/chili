export function formatQty(value: number, unit: string): string {
  const n = Number.isInteger(value) ? value : Number(value.toFixed(2));
  return `${n.toLocaleString("en-MY")} ${unit}`;
}

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
