"use client";

import { useState } from "react";

import type { TimeSeries } from "@/lib/reports/types";

/**
 * The six validated categorical slots, in fixed order. Assign by index and
 * never cycle — a seventh series folds into "Other" upstream (see query.ts)
 * rather than inventing a hue that no longer clears the CVD gates.
 */
export const SERIES_COLORS = [
  "var(--viz-1)",
  "var(--viz-2)",
  "var(--viz-3)",
  "var(--viz-4)",
  "var(--viz-5)",
  "var(--viz-6)",
] as const;

/**
 * Colour follows the entity, not its rank, so a series keeps its hue when a
 * filter changes the row count. Callers pass the full ordered key list once and
 * look each key up by name.
 */
export function colorScale(keys: string[]): (key: string) => string {
  const assigned = new Map(keys.map((key, index) => [key, SERIES_COLORS[index % 6]]));
  return (key) => assigned.get(key) ?? "var(--viz-1)";
}

/** White doing the separating: a 2px surface gap between touching marks. */
export const SURFACE_GAP = {
  stroke: "var(--viz-surface)",
  strokeWidth: 2,
} as const;

/**
 * Entry animations are off everywhere. They add nothing to a report, and
 * Recharts animates a clip path from zero — so if the animation never runs to
 * completion (headless capture, reduced-motion, a slow hydrate) the marks stay
 * in the DOM but invisible. The data should be on screen at first paint.
 */
export const NO_ANIMATION = { isAnimationActive: false } as const;

/** Recessive hairline grid — solid, never dashed. */
export const GRID_PROPS = {
  stroke: "var(--viz-grid)",
  strokeWidth: 1,
  strokeDasharray: "0",
  vertical: false,
} as const;

/**
 * Fill for SVG text (direct labels, category ticks). Must be a real colour:
 * the app's `--foreground` is a bare HSL triplet that Tailwind wraps in
 * `hsl(...)`, so using it raw in an SVG `fill` silently falls back to black —
 * which looks right in light mode and disappears in dark.
 */
export const INK = "var(--viz-ink)";

/** Axis text wears muted ink, never a series colour. Ticks align, so tabular. */
export const AXIS_PROPS = {
  stroke: "var(--viz-axis)",
  tick: {
    fill: "var(--viz-muted)",
    fontSize: 11,
    style: { fontVariantNumeric: "tabular-nums" as const },
  },
  tickLine: false,
} as const;

/** One flattened row per bucket, with a column per series key. */
export type ChartDatum = Record<string, number | string> & { bucket: string };

/** Flattens a TimeSeries into the row-per-bucket shape Recharts expects. */
export function toChartData(series: TimeSeries): ChartDatum[] {
  return series.points.map((point) => ({ bucket: point.bucket, ...point.values }));
}

type TooltipRow = { key: string; color: string; value: string };

/**
 * Shared tooltip body. Values are also reachable from the table view, so the
 * tooltip enhances rather than gates.
 */
export function TooltipCard({ label, rows }: { label: string; rows: TooltipRow[] }) {
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
      <div className="mb-1.5 text-xs font-medium text-foreground">{label}</div>
      <div className="flex flex-col gap-1">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center gap-2 text-xs">
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ background: row.color }}
            />
            <span className="text-muted-foreground">{row.key}</span>
            <span className="ml-auto pl-3 font-medium tabular-nums text-foreground">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Always present for two or more series, so identity never rests on colour
 * alone. A single-series chart gets none — its title already says what's plotted.
 */
function Legend({ items }: { items: { key: string; color: string }[] }) {
  if (items.length < 2) return null;

  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full"
            style={{ background: item.color }}
          />
          {item.key}
        </li>
      ))}
    </ul>
  );
}

export type TableView = {
  columns: string[];
  rows: (string | number)[][];
};

/** The WCAG-clean twin of every chart: same numbers, no reliance on colour. */
function DataTable({ view }: { view: TableView }) {
  return (
    <div className="max-h-[280px] overflow-auto rounded-md border border-border">
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 bg-muted/60 backdrop-blur">
          <tr>
            {view.columns.map((column, index) => (
              <th
                key={column}
                scope="col"
                className={`px-3 py-2 font-medium text-muted-foreground ${
                  index === 0 ? "" : "text-right"
                }`}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {view.rows.map((row) => (
            <tr key={String(row[0])} className="border-t border-border">
              {row.map((cell, index) => (
                <td
                  key={index}
                  className={`px-3 py-1.5 ${
                    index === 0
                      ? "text-foreground"
                      : "text-right tabular-nums text-muted-foreground"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Card frame every chart sits in. Owns the title block, the legend and the
 * chart/table toggle, so the relief rule is satisfied once here rather than
 * remembered per chart.
 */
export function ChartCard({
  title,
  subtitle,
  legend = [],
  table,
  height = 260,
  children,
}: {
  title: string;
  subtitle?: string;
  legend?: { key: string; color: string }[];
  table: TableView;
  height?: number;
  children: React.ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium text-foreground">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowTable((open) => !open)}
          aria-pressed={showTable}
          className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {showTable ? "Chart" : "Table"}
        </button>
      </header>

      {legend.length > 1 && <Legend items={legend} />}

      {showTable ? (
        <DataTable view={table} />
      ) : (
        <div style={{ height }} className="w-full">
          {children}
        </div>
      )}
    </section>
  );
}
