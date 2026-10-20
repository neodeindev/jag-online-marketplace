"use client";

import { useEffect, useId, useRef, useState } from "react";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface DailyPoint {
  day: string; // YYYY-MM-DD in the store's timezone
  orders: number;
  revenue: number;
}

const PLOT_HEIGHT = 200;
const AXIS_BAND = 26;
const LEFT_GUTTER = 48;
const TOP_PAD = 8;
const BAR_MAX = 24;
const GAP = 2;
const RADIUS = 4;

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/** Parses "2026-10-19" as a calendar date (no timezone shifting). */
function dayLabel(day: string, style: "short" | "long" | "weekday") {
  const date = new Date(`${day}T12:00:00Z`);
  const options: Intl.DateTimeFormatOptions =
    style === "weekday"
      ? { weekday: "short", timeZone: "UTC" }
      : style === "short"
        ? { month: "short", day: "numeric", timeZone: "UTC" }
        : { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" };
  return new Intl.DateTimeFormat("en-GY", options).format(date);
}

function niceMax(value: number) {
  if (value <= 0) return 1000;
  const exponent = Math.floor(Math.log10(value));
  const base = 10 ** exponent;
  const fraction = value / base;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * base;
}

/** Column with a 4px rounded top and a square base. */
function barPath(x: number, y: number, width: number, base: number) {
  const height = base - y;
  const r = Math.min(RADIUS, width / 2, height);
  return `M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${base}Z`;
}

/**
 * Daily revenue as columns. Hover, tap or arrow-key through the days to read
 * each value; the same numbers are available in the table below the chart.
 */
export function RevenueChart({ data, title }: { data: DailyPoint[]; title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [active, setActive] = useState<number | null>(null);
  const tableId = useId();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.floor(entry.contentRect.width))));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const n = Math.max(1, data.length);
  const plotWidth = width - LEFT_GUTTER;
  const band = plotWidth / n;
  const barWidth = Math.max(2, Math.min(BAR_MAX, band - GAP));
  const max = niceMax(Math.max(0, ...data.map((d) => d.revenue)));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const base = TOP_PAD + PLOT_HEIGHT;
  const yFor = (v: number) => base - (v / max) * PLOT_HEIGHT;

  // Roughly six evenly spaced date labels; every day when the range is a week.
  const labelEvery = n <= 8 ? 1 : Math.ceil(n / 6);
  const total = data.reduce((sum, d) => sum + d.revenue, 0);
  const activePoint = active !== null ? data[active] : null;

  const tooltipLeft =
    active !== null ? Math.min(Math.max(LEFT_GUTTER + band * active + band / 2, 70), width - 70) : 0;

  return (
    <div>
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-canopy"
        tabIndex={0}
        role="group"
        aria-label={`${title}. Use the left and right arrow keys to read each day.`}
        aria-describedby={tableId}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            setActive((a) => (a === null ? 0 : Math.min(n - 1, a + 1)));
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            setActive((a) => (a === null ? n - 1 : Math.max(0, a - 1)));
          } else if (e.key === "Escape") {
            setActive(null);
          }
        }}
        onBlur={() => setActive(null)}
        onPointerLeave={() => setActive(null)}
      >
        <svg width={width} height={TOP_PAD + PLOT_HEIGHT + AXIS_BAND} className="block" aria-hidden>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={LEFT_GUTTER} x2={width} y1={yFor(t)} y2={yFor(t)} stroke="#e6ebe8" strokeWidth={1} />
              <text
                x={LEFT_GUTTER - 8}
                y={yFor(t)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted text-[11px] tabular-nums"
              >
                {t === 0 ? "0" : compact.format(t)}
              </text>
            </g>
          ))}

          {data.map((d, i) => {
            const x = LEFT_GUTTER + band * i + (band - barWidth) / 2;
            const isActive = active === i;
            return (
              <g key={d.day}>
                {d.revenue > 0 && (
                  <path
                    d={barPath(x, yFor(d.revenue), barWidth, base)}
                    className={cn("transition-colors", isActive ? "fill-canopy-700" : "fill-canopy")}
                  />
                )}
                {isActive && d.revenue === 0 && (
                  <line x1={x} x2={x + barWidth} y1={base - 1} y2={base - 1} stroke="#0c5a3f" strokeWidth={2} />
                )}
                {/* Hit area: the whole column of the band, not just the painted bar. */}
                <rect
                  x={LEFT_GUTTER + band * i}
                  y={TOP_PAD}
                  width={band}
                  height={PLOT_HEIGHT}
                  fill="transparent"
                  onPointerEnter={() => setActive(i)}
                  onPointerDown={() => setActive(i)}
                />
                {i % labelEvery === 0 && (
                  <text
                    x={LEFT_GUTTER + band * i + band / 2}
                    y={base + 17}
                    textAnchor="middle"
                    className="fill-muted text-[11px]"
                  >
                    {dayLabel(d.day, n <= 8 ? "weekday" : "short")}
                  </text>
                )}
              </g>
            );
          })}
          <line x1={LEFT_GUTTER} x2={width} y1={base} y2={base} stroke="#c3cec9" strokeWidth={1} />
        </svg>

        {activePoint && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-line bg-white px-3 py-2 text-center shadow-pop"
            style={{ left: tooltipLeft }}
          >
            <p className="text-[15px] font-bold text-ink">{formatPrice(activePoint.revenue)}</p>
            <p className="whitespace-nowrap text-[12px] text-muted">
              {dayLabel(activePoint.day, "long")} · {activePoint.orders} {activePoint.orders === 1 ? "order" : "orders"}
            </p>
          </div>
        )}
        <p className="sr-only" aria-live="polite">
          {activePoint
            ? `${dayLabel(activePoint.day, "long")}: ${formatPrice(activePoint.revenue)} from ${activePoint.orders} orders`
            : ""}
        </p>
      </div>

      <details className="mt-3 text-[13px]">
        <summary className="cursor-pointer font-semibold text-canopy hover:underline">Show as table</summary>
        <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-line">
          <table id={tableId} className="w-full text-left">
            <caption className="sr-only">{title}</caption>
            <thead className="sticky top-0 bg-mist">
              <tr>
                <th className="px-3 py-1.5 font-semibold">Day</th>
                <th className="px-3 py-1.5 text-right font-semibold">Orders</th>
                <th className="px-3 py-1.5 text-right font-semibold">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.day} className="border-t border-line">
                  <td className="px-3 py-1.5">{dayLabel(d.day, "long")}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{d.orders}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatPrice(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line font-semibold">
                <td className="px-3 py-1.5">Total</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{data.reduce((s, d) => s + d.orders, 0)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{formatPrice(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </details>
    </div>
  );
}
