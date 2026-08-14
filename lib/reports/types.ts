/** One row of AI spend, at the grain the source reports it. */
export type SpendRow = {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  provider: string;
  model: string;
  team: string;
  project: string;
  /**
   * The AWS identity the charge was authenticated as — an IAM user, role or
   * SSO principal. The closest thing to "who spent this" that billing data
   * carries on its own, and the only attribution available while no cost
   * allocation tags exist.
   */
  principal: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

/** Dimensions a report can slice or split by. */
export type Dimension = "provider" | "model" | "team" | "project" | "principal";

/**
 * Measures a report can plot.
 *
 * Request counts and cache-read tokens used to live here, and are deliberately
 * gone: AWS bills Bedrock per token, so no request count exists anywhere in
 * FOCUS/CUR, and this account has no cache-read SKUs. Leaving them in the union
 * would let the model offer a metric the warehouse can only answer with zeros,
 * and a confident zero is indistinguishable from a real one.
 */
export type Metric = "costUsd" | "inputTokens" | "outputTokens" | "totalTokens";

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

/** A period-over-period change, and which way it moved. */
export type Delta = {
  label: string;
  /** Direction of change, independent of whether that direction is good. */
  direction: "up" | "down" | "flat";
};

/**
 * What the renderSpendChart tool hands back to the client. The chart component
 * is chosen from `chartType`; everything the chart needs to draw travels with
 * it, so the renderer never re-queries.
 */
export type SpendChartPayload =
  | { chartType: "empty"; title: string; message: string }
  | {
      chartType: "stat";
      title: string;
      subtitle?: string;
      label: string;
      value: string;
      delta: Delta | null;
      comparison: string;
      trend: number[];
    }
  | {
      chartType: "line" | "bar";
      title: string;
      subtitle?: string;
      metric: Metric;
      granularity: Bucket;
      series: TimeSeries;
    }
  | {
      chartType: "donut" | "ranked";
      title: string;
      subtitle?: string;
      metric: Metric;
      data: CategoryValue[];
    };

/** One number a dashboard highlights, optionally with a period change and a trend. */
export type Stat = {
  label: string;
  value: string;
  delta?: Delta | null;
  comparison?: string;
  /** Whether a rise is a good outcome for this metric. */
  upIsGood?: boolean;
  trend?: number[];
};

/**
 * What the renderSpendDashboard tool hands back: a KPI row plus a fixed set of
 * charts, both built server-side from the same aggregation as renderSpendChart
 * — the model only picks the range and filters, never the numbers.
 */
export type SpendDashboardPayload =
  | { chartType: "empty"; title: string; message: string }
  | {
      chartType: "dashboard";
      title: string;
      subtitle?: string;
      stats: Stat[];
      charts: SpendChartPayload[];
    };
