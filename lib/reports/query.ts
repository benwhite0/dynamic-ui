import type {
  Bucket,
  CategoryValue,
  Dimension,
  Metric,
  SpendQuery,
  SpendRow,
  TimeSeries,
} from "./types";

/** Everything past the top N series folds into this bucket. */
export const OTHER_KEY = "Other";

/** Series cap. Past this, the palette runs out of gate-safe hues. */
const MAX_SERIES = 6;

function measure(row: SpendRow, metric: Metric): number {
  if (metric === "totalTokens") {
    return row.inputTokens + row.outputTokens;
  }
  return row[metric];
}

/** Monday of the week containing `date`, so week buckets are stable. */
function weekStart(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const dayOfWeek = d.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  d.setUTCDate(d.getUTCDate() - daysSinceMonday);
  return d.toISOString().slice(0, 10);
}

function bucketOf(date: string, bucket: Bucket): string {
  if (bucket === "month") return date.slice(0, 7);
  if (bucket === "week") return weekStart(date);
  return date;
}

function matchesFilters(row: SpendRow, filters: SpendQuery["filters"]): boolean {
  if (!filters) return true;
  return Object.entries(filters).every(([dimension, allowed]) => {
    if (!allowed?.length) return true;
    return allowed.includes(row[dimension as Dimension]);
  });
}

/** Rows narrowed to the query's date range and filters. */
export function selectRows(rows: SpendRow[], query: SpendQuery = {}): SpendRow[] {
  return rows.filter(
    (row) =>
      (!query.from || row.date >= query.from) &&
      (!query.to || row.date <= query.to) &&
      matchesFilters(row, query.filters),
  );
}

/** Single total for the query — the KPI case. */
export function total(rows: SpendRow[], query: SpendQuery = {}): number {
  const metric = query.metric ?? "costUsd";
  return selectRows(rows, query).reduce((sum, row) => sum + measure(row, metric), 0);
}

/**
 * Totals per distinct value of `groupBy`, highest first, with the tail folded
 * into "Other" once the series count would exceed the palette.
 */
export function byDimension(rows: SpendRow[], query: SpendQuery = {}): CategoryValue[] {
  const metric = query.metric ?? "costUsd";
  const dimension = query.groupBy ?? "model";

  const totals = new Map<string, number>();
  for (const row of selectRows(rows, query)) {
    const key = row[dimension];
    totals.set(key, (totals.get(key) ?? 0) + measure(row, metric));
  }

  const ranked = [...totals]
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value);

  const limit = Math.min(query.topN ?? MAX_SERIES, MAX_SERIES);
  if (ranked.length <= limit) return ranked;

  const head = ranked.slice(0, limit);
  const tail = ranked.slice(limit).reduce((sum, entry) => sum + entry.value, 0);
  return [...head, { key: OTHER_KEY, value: tail }];
}

/**
 * One point per time bucket. Without `groupBy` there is a single "total"
 * series; with it, one series per dimension value using the same ranking and
 * "Other" folding as `byDimension`, so a value keeps its colour between charts.
 */
export function timeSeries(rows: SpendRow[], query: SpendQuery = {}): TimeSeries {
  const metric = query.metric ?? "costUsd";
  const bucket = query.bucket ?? "day";
  const selected = selectRows(rows, query);

  const seriesKeys = query.groupBy
    ? byDimension(rows, query).map((entry) => entry.key)
    : ["total"];
  const known = new Set(seriesKeys);

  const buckets = new Map<string, Record<string, number>>();
  for (const row of selected) {
    const bucketKey = bucketOf(row.date, bucket);
    const values = buckets.get(bucketKey) ?? {};

    let seriesKey = "total";
    if (query.groupBy) {
      const raw = row[query.groupBy];
      seriesKey = known.has(raw) ? raw : OTHER_KEY;
    }

    values[seriesKey] = (values[seriesKey] ?? 0) + measure(row, metric);
    buckets.set(bucketKey, values);
  }

  const points = [...buckets]
    .sort(([a], [b]) => a.localeCompare(b))
    // Fill missing series with 0 so stacks and lines have no holes.
    .map(([bucketKey, values]) => ({
      bucket: bucketKey,
      values: Object.fromEntries(seriesKeys.map((key) => [key, values[key] ?? 0])),
    }));

  return { points, seriesKeys };
}

/**
 * The same-length window immediately before the query's range, for period-over-
 * period deltas. Returns null when the range isn't bounded at both ends.
 */
export function previousPeriod(query: SpendQuery): SpendQuery | null {
  if (!query.from || !query.to) return null;

  const from = new Date(`${query.from}T00:00:00Z`);
  const to = new Date(`${query.to}T00:00:00Z`);
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;

  const previousTo = new Date(from);
  previousTo.setUTCDate(previousTo.getUTCDate() - 1);
  const previousFrom = new Date(previousTo);
  previousFrom.setUTCDate(previousFrom.getUTCDate() - (days - 1));

  return {
    ...query,
    from: previousFrom.toISOString().slice(0, 10),
    to: previousTo.toISOString().slice(0, 10),
  };
}
