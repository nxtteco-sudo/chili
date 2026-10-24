"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/format";

// Single-series line over time (EC or pH), with problem dates marked.
// One value scale per chart: EC and pH are drawn as two charts, never one dual-axis chart.

export type LinePoint = { date: string; value: number; href?: string };
export type LineEvent = { date: string; label: string; href?: string };

const H = 190;
const PAD = { top: 18, right: 12, bottom: 26, left: 36 };

const day = (d: string) => Date.parse(`${d}T00:00:00Z`) / 86_400_000;
const shortDate = new Intl.DateTimeFormat("en-MY", { day: "numeric", month: "short", timeZone: "UTC" });
const fmtDate = (d: string) => shortDate.format(new Date(`${d}T00:00:00Z`));

function ticksFor(min: number, max: number) {
  const span = max - min || 1;
  const step = [0.1, 0.2, 0.25, 0.5, 1, 2, 5].find((s) => span / s <= 4) ?? 10;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) out.push(Math.round(v * 100) / 100);
  return out;
}

export function LineChart({
  title,
  subtitle,
  unit,
  color,
  points,
  events = [],
}: {
  title: string;
  subtitle?: string;
  unit?: string;
  color: string;
  points: LinePoint[];
  events?: LineEvent[];
}) {
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(240, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const values = points.map((p) => p.value);
  const ticks = ticksFor(Math.min(...values), Math.max(...values));
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];
  const x0 = points.length ? day(points[0].date) : 0;
  const x1 = points.length ? day(points[points.length - 1].date) : 1;
  const innerW = width - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (d: string) => PAD.left + ((day(d) - x0) / (x1 - x0 || 1)) * innerW;
  const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin || 1)) * innerH;
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
  const visibleEvents = events.filter((e) => points.length && e.date >= points[0].date && e.date <= points[points.length - 1].date);
  // About 4 date labels across the axis.
  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(innerW / 90))));

  function nearest(clientX: number) {
    const rect = box.current!.getBoundingClientRect();
    const px = clientX - rect.left;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(x(p.date) - px) < Math.abs(x(points[best].date) - px)) best = i;
    });
    return best;
  }

  const a = active !== null ? points[active] : undefined;

  return (
    <section className="premium-card min-w-0 rounded-2xl border border-line bg-surface p-5 md:p-6">
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

      {points.length === 0 ? (
        <p className="py-10 text-center text-[15px] text-muted">No readings yet.</p>
      ) : showTable ? (
        <div className="max-h-72 overflow-auto">
          <table className="tabular w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="py-2 font-normal">Date</th>
                <th className="py-2 text-right font-normal">{unit ? `${title} (${unit})` : title}</th>
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((p) => (
                <tr key={p.date + p.value} className="border-b border-line last:border-0">
                  <td className="py-2">{fmtDate(p.date)}</td>
                  <td className="py-2 text-right">{p.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div
            ref={box}
            className="relative w-full min-w-0 touch-pan-y overflow-hidden"
            onPointerMove={(e) => setActive(nearest(e.clientX))}
            onPointerLeave={() => setActive(null)}
            onClick={(e) => {
              const p = points[nearest(e.clientX)];
              if (p.href) router.push(p.href);
            }}
          >
            <svg width={width} height={H} role="img" aria-label={`${title} over time`} className="block cursor-pointer">
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth={1} />
                  <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="tabular fill-[var(--muted)] text-[11px]">
                    {t}
                  </text>
                </g>
              ))}
              {visibleEvents.map((e, i) => (
                <g key={i}>
                  <line x1={x(e.date)} x2={x(e.date)} y1={PAD.top - 6} y2={H - PAD.bottom} stroke="var(--problem)" strokeWidth={1} opacity={0.55} />
                  <path d={`M${x(e.date) - 4},${PAD.top - 12}h8l-4,6z`} fill="var(--problem)" />
                </g>
              ))}
              <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {points.map((p, i) => (
                <circle
                  key={i}
                  cx={x(p.date)}
                  cy={y(p.value)}
                  r={active === i ? 5 : 3.5}
                  fill={color}
                  stroke="var(--surface)"
                  strokeWidth={2}
                />
              ))}
              {a && <line x1={x(a.date)} x2={x(a.date)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--axis)" strokeWidth={1} />}
              {points.map((p, i) =>
                i % labelEvery === 0 ? (
                  <text key={`l${i}`} x={x(p.date)} y={H - 6} textAnchor={i === 0 ? "start" : x(p.date) > width - PAD.right - 30 ? "end" : "middle"} className="fill-[var(--muted)] text-[11px]">
                    {fmtDate(p.date)}
                  </text>
                ) : null,
              )}
            </svg>
            {a && (
              <div
                className={cn(
                  "pointer-events-none absolute top-0 z-10 w-44 rounded-xl border border-line bg-surface p-2.5 text-sm shadow-lg",
                  x(a.date) > width / 2 ? "-translate-x-[calc(100%+10px)]" : "translate-x-[10px]",
                )}
                style={{ left: x(a.date) }}
              >
                <p className="text-muted">{fmtDate(a.date)}</p>
                <p className="tabular font-medium">
                  {title}: {a.value}
                  {unit ? ` ${unit}` : ""}
                </p>
                {visibleEvents
                  .filter((e) => Math.abs(day(e.date) - day(a.date)) <= 3)
                  .map((e, i) => (
                    <p key={i} className="mt-1 text-xs text-problem">
                      ⚠ {e.label}
                    </p>
                  ))}
                {a.href && <p className="mt-1 text-xs text-muted">Tap to open the tank mix</p>}
              </div>
            )}
          </div>
          {visibleEvents.length > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-2">
              <svg width="10" height="8" aria-hidden>
                <path d="M1,0h8l-4,7z" fill="var(--problem)" />
              </svg>
              Problem found
            </p>
          )}
        </>
      )}
    </section>
  );
}
