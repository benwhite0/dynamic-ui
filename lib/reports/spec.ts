import { delta, formatMetric, metricLabel } from "./format";
import { byDimension, previousPeriod, timeSeries, total } from "./query";

import type {
  Bucket,
  Dimension,
  Metric,
  SpendChartPayload,
  SpendDashboardPayload,
  SpendQuery,
  SpendRow,
  Stat,
} from "./types";

export const DIMENSIONS = ["provider", "model", "team", "project"] as const;

/** What the model is allowed to ask for. Mirrors the tool's input schema. */
export type SpendChartInput = {
  chartType: "line" | "bar" | "donut" | "ranked" | "stat";
  title: string;
  subtitle?: string;
  metric?: Metric;
  groupBy?: Dimension;
  bucket?: Bucket;
  days?: number;
  from?: string;
  to?: string;
  filters?: Partial<Record<Dimension, string[]>>;
  topN?: number;
};

/** Past this, daily points stop being readable and the bucket steps up. */
const DAILY_LIMIT = 31;

const normalise = (value: string) => value.toLowerCase().replace(/[\s_-]+/g, "");

/**
 * Resolves loose filter text against the values actually present in the data.
 * The prompt lists the real vocabulary, but people ask for "sonnet 5" when the
 * stored value is "claude-sonnet-5" — so match on a normalised substring rather
 * than requiring an exact hit, and report back both what matched and what
 * didn't, so the caller can explain an empty result.
 */
export function resolveFilters(
  requested: Partial<Record<Dimension, string[]>> | undefined,
  available: Record<Dimension, string[]>,
): {
  filters: SpendQuery["filters"];
  matched: string[];
  unmatched: string[];
  /** A dimension was filtered on but nothing matched, so the answer is nothing. */
  unsatisfiable: boolean;
} {
  if (!requested) {
    return { filters: undefined, matched: [], unmatched: [], unsatisfiable: false };
  }

  const filters: SpendQuery["filters"] = {};
  const matched: string[] = [];
  const unmatched: string[] = [];
  let unsatisfiable = false;

  for (const dimension of DIMENSIONS) {
    const needles = requested[dimension];
    if (!needles?.length) continue;

    const hits = new Set<string>();
    for (const needle of needles) {
      const target = normalise(needle);
      const found = available[dimension].filter((value) => {
        const candidate = normalise(value);
        return candidate === target || candidate.includes(target);
      });

      if (found.length) found.forEach((value) => hits.add(value));
      else unmatched.push(needle);
    }

    if (hits.size) {
      filters[dimension] = [...hits];
      matched.push(...hits);
    } else {
      // Dropping the filter here would answer a different question than the one
      // asked — "GPT-9 spend" would silently return total spend for every model,
      // which looks authoritative and is wrong.
      unsatisfiable = true;
    }
  }

  return {
    filters: Object.keys(filters).length ? filters : undefined,
    matched,
    unmatched,
    unsatisfiable,
  };
}

/**
 * Turns a relative window ("last 10 days") or explicit bounds into a date
 * range, clamped to the data. Anchored to the newest date present rather than
 * to today, so "the last 10 days" can't land on an empty chart when the source
 * lags real time.
 */
export function resolveRange(
  input: { days?: number; from?: string; to?: string },
  bounds: { from: string; to: string },
): { from: string; to: string } {
  if (input.from || input.to) {
    return {
      from: input.from && input.from > bounds.from ? input.from : bounds.from,
      to: input.to && input.to < bounds.to ? input.to : bounds.to,
    };
  }

  if (input.days && input.days > 0) {
    const to = new Date(`${bounds.to}T00:00:00Z`);
    const from = new Date(to);
    from.setUTCDate(from.getUTCDate() - (input.days - 1));
    const iso = from.toISOString().slice(0, 10);
    return { from: iso < bounds.from ? bounds.from : iso, to: bounds.to };
  }

  return bounds;
}

/** Inclusive day count between two ISO dates. */
export function spanInDays(from: string, to: string): number {
  const ms =
    new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

/**
 * The whole tool body, minus the data loading — pure, so it can be exercised
 * without a server context. Builds the finished chart payload: the caller picks
 * the question, this decides nothing about presentation the charts don't need,
 * and the numbers come from the aggregation rather than from the model.
 */
export function buildSpendChartPayload(
  rows: SpendRow[],
  available: Record<Dimension, string[]>,
  bounds: { from: string; to: string },
  input: SpendChartInput,
): SpendChartPayload & { range?: { from: string; to: string }; matched?: string[]; unmatched?: string[] } {
  const range = resolveRange(input, bounds);
  const { filters, matched, unmatched, unsatisfiable } = resolveFilters(
    input.filters,
    available,
  );
  const metric = input.metric ?? "costUsd";
  const span = spanInDays(range.from, range.to);
  const bucket = input.bucket ?? (span > DAILY_LIMIT ? "week" : "day");

  const query: SpendQuery = {
    metric,
    from: range.from,
    to: range.to,
    filters,
    groupBy: input.groupBy,
    bucket,
    topN: input.topN,
  };

  const grandTotal = unsatisfiable ? 0 : total(rows, query);

  // Say what happened rather than drawing a chart that answers a different
  // question — either nothing matched, or the period genuinely has no spend.
  if (grandTotal === 0) {
    return {
      chartType: "empty",
      title: input.title,
      message: unmatched.length
        ? `No data for ${unmatched.join(", ")}. Available values — ${DIMENSIONS.map(
            (dimension) => `${dimension}: ${available[dimension].join(", ")}`,
          ).join("; ")}`
        : "No spend recorded for that period.",
    };
  }

  // Partial matches still draw, but the chart has to admit what it left out.
  const caveat = unmatched.length ? `excludes unknown: ${unmatched.join(", ")}` : "";
  const subtitle = [input.subtitle, caveat].filter(Boolean).join(" · ") || undefined;

  const shared = { title: input.title, subtitle, range, matched, unmatched };

  if (input.chartType === "stat") {
    const prior = previousPeriod(query);
    const priorTotal = prior ? total(rows, prior) : null;

    return {
      ...shared,
      chartType: "stat",
      label: input.subtitle ?? metricLabel(metric),
      value: formatMetric(grandTotal, metric),
      delta: priorTotal ? delta(grandTotal, priorTotal) : null,
      comparison: `vs previous ${span} days`,
      trend: timeSeries(rows, { ...query, groupBy: undefined }).points.map(
        (point) => point.values.total,
      ),
    };
  }

  if (input.chartType === "donut" || input.chartType === "ranked") {
    return {
      ...shared,
      chartType: input.chartType,
      metric,
      data: byDimension(rows, { ...query, groupBy: input.groupBy ?? "model" }),
    };
  }

  return {
    ...shared,
    chartType: input.chartType,
    metric,
    granularity: bucket,
    series: timeSeries(rows, query),
  };
}

/** What the model is allowed to ask for. Mirrors the dashboard tool's input schema. */
export type SpendDashboardInput = {
  title: string;
  subtitle?: string;
  days?: number;
  from?: string;
  to?: string;
  filters?: Partial<Record<Dimension, string[]>>;
};

/** Pulls the stat fields back out of a chart payload built as chartType: "stat". */
function toStat(label: string, payload: SpendChartPayload): Stat {
  if (payload.chartType !== "stat") return { label, value: "—" };
  return {
    label,
    value: payload.value,
    delta: payload.delta,
    comparison: payload.comparison,
    trend: payload.trend,
  };
}

/**
 * A fixed dashboard: a KPI row (total spend, most used model, total requests,
 * top team) plus a trend and a breakdown, all built from the same aggregation
 * as a single renderSpendChart call. The model picks the range and filters;
 * which cards appear and their numbers are decided here, not by the model.
 */
export function buildSpendDashboardPayload(
  rows: SpendRow[],
  available: Record<Dimension, string[]>,
  bounds: { from: string; to: string },
  input: SpendDashboardInput,
): SpendDashboardPayload {
  const range = resolveRange(input, bounds);
  const { filters, unmatched, unsatisfiable } = resolveFilters(input.filters, available);
  const query: SpendQuery = { from: range.from, to: range.to, filters };

  const grandTotal = unsatisfiable ? 0 : total(rows, { ...query, metric: "costUsd" });

  if (grandTotal === 0) {
    return {
      chartType: "empty",
      title: input.title,
      message: unmatched.length
        ? `No data for ${unmatched.join(", ")}. Available values — ${DIMENSIONS.map(
            (dimension) => `${dimension}: ${available[dimension].join(", ")}`,
          ).join("; ")}`
        : "No spend recorded for that period.",
    };
  }

  const chartInputBase = {
    days: input.days,
    from: input.from,
    to: input.to,
    filters: input.filters,
  };

  const spendStat = buildSpendChartPayload(rows, available, bounds, {
    ...chartInputBase,
    chartType: "stat",
    title: "Total spend",
    metric: "costUsd",
  });
  const tokensStat = buildSpendChartPayload(rows, available, bounds, {
    ...chartInputBase,
    chartType: "stat",
    title: "Total tokens",
    metric: "totalTokens",
  });
  const trendChart = buildSpendChartPayload(rows, available, bounds, {
    ...chartInputBase,
    chartType: "line",
    title: "Spend over time",
    metric: "costUsd",
  });
  const breakdownChart = buildSpendChartPayload(rows, available, bounds, {
    ...chartInputBase,
    chartType: "ranked",
    title: "Spend by model",
    metric: "costUsd",
    groupBy: "model",
  });

  // Ranked by tokens rather than requests: AWS bills Bedrock per token, so no
  // request count exists in the billing data to rank by.
  const topModel = byDimension(rows, { ...query, groupBy: "model", metric: "totalTokens" })[0];
  const topTeam = byDimension(rows, { ...query, groupBy: "team", metric: "costUsd" })[0];

  const stats: Stat[] = [
    toStat("Total spend", spendStat),
    {
      label: "Most used model",
      value: topModel?.key ?? "—",
      comparison: topModel
        ? `${formatMetric(topModel.value, "totalTokens")} tokens`
        : undefined,
    },
    toStat("Total tokens", tokensStat),
    {
      label: "Top team by spend",
      value: topTeam?.key ?? "—",
      comparison: topTeam ? formatMetric(topTeam.value, "costUsd") : undefined,
    },
  ];

  return {
    chartType: "dashboard",
    title: input.title,
    subtitle: input.subtitle,
    stats,
    charts: [trendChart, breakdownChart],
  };
}
