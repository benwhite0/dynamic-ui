import { format, parseISO } from "date-fns";

import type { Bucket, Delta, Metric } from "./types";

/**
 * Thousands separators without `Intl`. Node and the browser ship different ICU
 * data — `toLocaleString("en-GB", {currency:"USD"})` yields "US$21,607.87" on
 * the server and "$21,607.87" in Chrome — which shows up as a React hydration
 * mismatch on any server-rendered figure. Formatting by hand keeps both sides
 * byte-identical.
 */
function group(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Whole number with separators: 21,608. */
export function formatInteger(value: number): string {
  const sign = value < 0 ? "−" : "";
  return `${sign}${group(Math.round(Math.abs(value)).toString())}`;
}

/**
 * Compact money for axis ticks and stat-tile values: $21.6k, $1.2M, $850.
 * Auto-compacting keeps labels short without dropping the unit.
 */
export function formatCurrency(value: number): string {
  if (value === 0) return "$0";

  const sign = value < 0 ? "−" : "";
  const abs = Math.abs(value);

  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${sign}$${group(Math.round(abs / 1000).toString())}k`;
  if (abs >= 1_000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  if (abs >= 1) return `${sign}$${Math.round(abs)}`;
  return `${sign}$${abs.toFixed(2)}`;
}

/** Full precision, for tooltips and table cells where the exact figure matters. */
export function formatCurrencyExact(value: number): string {
  const sign = value < 0 ? "−" : "";
  const [whole, decimals] = Math.abs(value).toFixed(2).split(".");
  return `${sign}$${group(whole)}.${decimals}`;
}

/** Compact counts: 7.1B, 1.2M, 45.3k, 812. */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";

  if (abs >= 1_000_000_000_000) return `${sign}${(abs / 1_000_000_000_000).toFixed(1)}T`;
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${sign}${group(Math.round(abs / 1000).toString())}k`;
  if (abs >= 1_000) return `${sign}${(abs / 1000).toFixed(1)}k`;
  return formatInteger(value);
}

export function formatPercent(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}%`;
}

const METRIC_LABELS: Record<Metric, string> = {
  costUsd: "Spend",
  inputTokens: "Input tokens",
  outputTokens: "Output tokens",
  totalTokens: "Tokens",
};

export function metricLabel(metric: Metric = "costUsd"): string {
  return METRIC_LABELS[metric];
}

/** Money for cost metrics, plain counts for everything else. */
export function formatMetric(value: number, metric: Metric = "costUsd"): string {
  return metric === "costUsd" ? formatCurrency(value) : formatCompact(value);
}

export function formatMetricExact(value: number, metric: Metric = "costUsd"): string {
  return metric === "costUsd" ? formatCurrencyExact(value) : formatInteger(value);
}

/** Axis and tooltip labels for a time bucket. */
export function formatBucket(bucket: string, granularity: Bucket = "day"): string {
  if (granularity === "month") return format(parseISO(`${bucket}-01`), "MMM yyyy");
  if (granularity === "week") return `w/c ${format(parseISO(bucket), "d MMM")}`;
  return format(parseISO(bucket), "d MMM");
}

/**
 * Axis ticks on round numbers — 0 / 1,000 / 2,000 rather than whatever the data
 * maximum happens to be. Recharts is given these explicitly, since letting it
 * derive ticks from a ragged domain produces labels like "$3.8k".
 */
export function niceTicks(max: number, count = 5): number[] {
  if (!Number.isFinite(max) || max <= 0) return [0, 1];

  const rawStep = max / (count - 1);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const step =
    (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;

  // Ceil to the next whole step so the top tick sits at or above the data
  // maximum — otherwise the tallest mark overshoots the plot and clips.
  const top = Math.ceil(max / step) * step;

  const ticks: number[] = [];
  for (let value = 0; value <= top + step / 1000; value += step) {
    ticks.push(Number(value.toFixed(6)));
  }
  return ticks;
}

/**
 * Period-over-period change. Returns null when there's no prior figure to
 * compare against, so callers render nothing rather than a fake 0%.
 */
export function delta(current: number, previous: number | null): Delta | null {
  if (previous === null || previous === 0) return null;

  const change = (current - previous) / previous;
  if (Math.abs(change) < 0.001) return { label: "0.0%", direction: "flat" };

  return {
    label: `${change > 0 ? "+" : "−"}${(Math.abs(change) * 100).toFixed(1)}%`,
    direction: change > 0 ? "up" : "down",
  };
}
