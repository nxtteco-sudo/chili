"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/format";

const rm = (n: number) =>
  `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function niceMax(value: number) {
  if (value <= 0) return 100;
  const mag = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => value / s <= 4) ?? mag * 10;
  return Math.ceil(value / step) * step;
}

function compact(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : String(n);
}

export type Series = { key: string; label: string; color: string };

function ChartCard({
  title,
  subtitle,
  legend,
  table,
  children,
}: {
  title: string;
  subtitle?: string;
  legend?: Series[];
  table: ReactNode;
  children: ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <section className="premium-card rounded-2xl border border-line bg-surface p-5 md:p-6">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="text-sm text-ink-2">{subtitle}</p>}
        </div>
        <button
          onClick={() => setShowTable((v) => !v)}
          className="min-h-11 shrink-0 rounded-lg border border-line px-2.5 py-1 text-sm text-ink-2 hover:text-ink"
          aria-pressed={showTable}
        >
          {showTable ? "Chart" : "Table"}
        </button>
      </div>
      {legend && legend.length > 1 && (
        <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
          {legend.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
      )}
      {showTable ? <div className="overflow-x-auto">{table}</div> : children}
    </section>
  );
}

export function StackedColumns({
  title,
  subtitle,
  series,
  data,
}: {
  title: string;
  subtitle?: string;
  series: Series[];
  data: { label: string; values: Record<string, number> }[];
}) {
  const [active, setActive] = useState<number | null>(null);
  const totals = data.map((d) => series.reduce((s, x) => s + (d.values[x.key] ?? 0), 0));
  const max = niceMax(Math.max(...totals));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      legend={series}
      table={
        <table className="tabular w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-muted">
              <th className="py-2 font-normal">Month</th>
              {series.map((s) => (
                <th key={s.key} className="py-2 text-right font-normal">{s.label}</th>
              ))}
              <th className="py-2 text-right font-normal">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={d.label} className="border-b border-line last:border-0">
                <td className="py-2">{d.label}</td>
                {series.map((s) => (
                  <td key={s.key} className="py-2 text-right">{rm(d.values[s.key] ?? 0)}</td>
                ))}
                <td className="py-2 text-right font-medium">{rm(totals[i])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div className="flex gap-2">
        <div className="relative h-60 w-10 shrink-0 text-right text-xs text-muted">
          <div className="absolute inset-x-0 bottom-0 top-6">
            {ticks.map((t) => (
              <span key={t} className="tabular absolute right-0 translate-y-1/2" style={{ bottom: `${(t / max) * 100}%` }}>
                {compact(t)}
              </span>
            ))}
          </div>
        </div>
        <div className="relative h-60 flex-1">
          <div className="absolute inset-x-0 bottom-0 top-6">
            {ticks.map((t) => (
              <div
                key={t}
                className={cn("absolute inset-x-0 h-px", t === 0 ? "bg-axis" : "bg-grid")}
                style={{ bottom: `${(t / max) * 100}%` }}
              />
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 top-6 flex justify-around">
            {data.map((d, i) => (
              <button
                key={d.label}
                type="button"
                className="relative flex h-full flex-1 flex-col items-center justify-end outline-none"
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                onClick={() => setActive((v) => (v === i ? null : i))}
                aria-label={`${d.label}: ${rm(totals[i])}`}
              >
                {active === i && <div className="absolute -top-6 bottom-0 left-1/2 w-10 -translate-x-1/2 rounded-md bg-ink/5" />}
                <div className="relative w-7 sm:w-9" style={{ height: `${(totals[i] / max) * 100}%` }}>
                  <span className="tabular absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap text-xs text-ink-2">
                    {Math.round(totals[i]).toLocaleString("en-MY")}
                  </span>
                  <div className="flex h-full flex-col-reverse gap-[2px]">
                    {series.map((s, si) => {
                      const v = d.values[s.key] ?? 0;
                      if (!v) return null;
                      const isTop = series.slice(si + 1).every((x) => !(d.values[x.key] ?? 0));
                      return (
                        <div
                          key={s.key}
                          className={cn(isTop && "rounded-t-[5px]")}
                          style={{ background: s.color, flexGrow: v, flexBasis: 0 }}
                        />
                      );
                    })}
                  </div>
                </div>
                {active === i && (
                  <div
                    className={cn(
                      "pointer-events-none absolute bottom-full z-10 mb-7 w-44 rounded-xl border border-line bg-surface p-2.5 text-left text-sm shadow-lg",
                      i === 0 ? "left-0" : i === data.length - 1 ? "right-0" : "left-1/2 -translate-x-1/2",
                    )}
                  >
                    <p className="font-medium">{d.label}</p>
                    {[...series].reverse().map((s) => (
                      <p key={s.key} className="tabular flex items-center gap-1.5 text-ink-2">
                        <span className="size-2 rounded-sm" style={{ background: s.color }} />
                        {s.label}
                        <span className="ml-auto text-ink">{rm(d.values[s.key] ?? 0)}</span>
                      </p>
                    ))}
                    <p className="tabular mt-1 flex border-t border-line pt-1 font-medium">
                      Total <span className="ml-auto">{rm(totals[i])}</span>
                    </p>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="ml-12 flex justify-around pt-2 text-xs text-muted">
        {data.map((d) => (
          <span key={d.label} className="flex-1 text-center">{d.label}</span>
        ))}
      </div>
    </ChartCard>
  );
}

export function HorizontalBars({
  title,
  subtitle,
  series,
  data,
}: {
  title: string;
  subtitle?: string;
  series: Series[];
  data: { label: string; value: number; seriesKey: string; note?: string }[];
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 1);
  const colorOf = (k: string) => series.find((s) => s.key === k)?.color;
  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      legend={series}
      table={
        <table className="tabular w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-muted">
              <th className="py-2 font-normal">Product</th>
              <th className="py-2 font-normal">Type</th>
              <th className="py-2 text-right font-normal">Spent</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label} className="border-b border-line last:border-0">
                <td className="py-2">{d.label}</td>
                <td className="py-2 text-ink-2">{series.find((s) => s.key === d.seriesKey)?.label}</td>
                <td className="py-2 text-right">{rm(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <ul className="space-y-2.5">
        {data.map((d, i) => (
          <li
            key={d.label}
            className="relative"
            onPointerEnter={() => setActive(i)}
            onPointerLeave={() => setActive(null)}
          >
            <div className="mb-1 flex justify-between gap-2 text-sm">
              <span className="truncate">{d.label}</span>
              {d.note && <span className="shrink-0 text-muted">{d.note}</span>}
            </div>
            <div className="flex items-center gap-2">
              <div className="h-5 flex-1">
                <div
                  className={cn("h-full rounded-r-[4px] transition-opacity", active !== null && active !== i && "opacity-60")}
                  style={{ width: `${(d.value / max) * 100}%`, background: colorOf(d.seriesKey) }}
                />
              </div>
              <span className="tabular w-24 shrink-0 text-right text-sm text-ink-2">{rm(d.value)}</span>
            </div>
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}
