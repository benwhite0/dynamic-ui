/** One row of AI spend, at the grain the source reports it. */
export type SpendRow = {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  provider: string;
  model: string;
  team: string;
  project: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  costUsd: number;
};

/** Dimensions a report can slice or split by. */
export type Dimension = "provider" | "model" | "team" | "project";

/** Measures a report can plot. */
export type Metric =
  | "costUsd"
  | "requests"
  | "inputTokens"
  | "outputTokens"
  | "totalTokens";

export type Bucket = "day" | "week" | "month";

/**
 * A report request. Deliberately narrow: the caller picks a question, never
 * writes SQL. Whatever backs it — the CSV fixture today, Athena later — builds
 * the query itself, which keeps cost and correctness on our side of the line.
 */
export type SpendQuery = {
  metric?: Metric;
  /** Split into one series per distinct value of this dimension. */
  groupBy?: Dimension;
  /** Bucket size for time-series results. */
  bucket?: Bucket;
  /** Inclusive ISO date bounds. */
  from?: string;
  to?: string;
  /** Keep only rows whose dimension value is in the list. */
  filters?: Partial<Record<Dimension, string[]>>;
  /** Fold everything past the top N series into "Other". */
  topN?: number;
};

/** One category and its value — for donut, bar and table output. */
export type CategoryValue = {
  key: string;
  value: number;
};

/** One time bucket, with a value per series key. */
export type SeriesPoint = {
  bucket: string;
  values: Record<string, number>;
};

/** A time-series result plus the series keys present, in plot order. */
export type TimeSeries = {
  points: SeriesPoint[];
  seriesKeys: string[];
};
