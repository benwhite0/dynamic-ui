import "server-only";

import { tool } from "ai";
import { z } from "zod";

import { previousPeriod } from "./query";
import { loadSpendRows, spendDateRange, spendDimensions } from "./source";
import {
  DIMENSIONS,
  buildSpendChartPayload,
  buildSpendDashboardPayload,
  resolveFilters,
  resolveRange,
  type SpendChartInput,
  type SpendDashboardInput,
} from "./spec";

import type { Dimension, SpendRow } from "./types";

/**
 * Fetches just the rows a payload needs. The range and filters are resolved
 * here so the source can narrow the fetch, then resolved again inside
 * `buildSpendChartPayload` — both calls are pure and idempotent, so the payload
 * is identical to what a whole-table fetch would have produced.
 *
 * `includePrior` widens the window backwards by one full period. A "stat" reads
 * its change indicator via `previousPeriod`, and `total` re-filters the same
 * rows array by date to get it — so if we fetched only the requested range, the
 * prior total would silently be 0 and the indicator would vanish or lie. Using
 * `previousPeriod` to compute the widened start guarantees we fetch exactly the
 * window it will later ask for.
 */
async function fetchRows(
  input: { days?: number; from?: string; to?: string; filters?: Partial<Record<Dimension, string[]>> },
  bounds: { from: string; to: string },
  available: Record<Dimension, string[]>,
  includePrior: boolean,
): Promise<SpendRow[]> {
  const { filters, unsatisfiable } = resolveFilters(input.filters, available);

  // Nothing can match, so the payload is "empty" either way — don't pay for a query.
  if (unsatisfiable) return [];

  const range = resolveRange(input, bounds);
  const prior = includePrior ? previousPeriod(range) : null;

  return loadSpendRows({ from: prior?.from ?? range.from, to: range.to, filters });
}

/**
 * The one tool this app exposes. The model chooses the question and the chart
 * form; the aggregation runs here, so no figure in a chart ever came out of the
 * model's tokens. That matters more for a spend report than for anything else
 * in the app — a hallucinated total looks exactly like a real one.
 */
export const renderSpendChart = tool({
  description:
    "Query AI/LLM spend and render it as a chart in the conversation. Use this for ANY question about spend, cost, usage, requests or tokens — including totals, trends, comparisons and breakdowns. It runs the aggregation itself and returns a finished chart, so never estimate or state figures yourself; just add one short sentence about what it shows.",
  inputSchema: z.object({
    chartType: z
      .enum(["line", "bar", "donut", "ranked", "stat"])
      .describe(
        "line = trend over time (one series). bar = stacked columns over time (use with groupBy). donut = share of a total (max ~6 categories). ranked = ordered bars comparing categories. stat = a single headline number with a change indicator.",
      ),
    title: z.string().describe("Short chart title, e.g. 'Sonnet 5 spend'"),
    subtitle: z
      .string()
      .optional()
      .describe("Optional qualifier, e.g. 'Daily, last 10 days'"),
    metric: z
      .enum(["costUsd", "requests", "inputTokens", "outputTokens", "totalTokens"])
      .optional()
      .describe("What to measure. Defaults to costUsd."),
    groupBy: z
      .enum(["provider", "model", "team", "project"])
      .optional()
      .describe("Split into one series/category per value. Required for donut and ranked."),
    bucket: z
      .enum(["day", "week", "month"])
      .optional()
      .describe(
        "Time grouping for line and bar. Leave unset to step from day to week automatically on long ranges.",
      ),
    days: z
      .number()
      .optional()
      .describe("Relative window, e.g. 10 for the last 10 days. Omit for all available data."),
    from: z.string().optional().describe("Explicit start date, YYYY-MM-DD"),
    to: z.string().optional().describe("Explicit end date, YYYY-MM-DD"),
    filters: z
      .object({
        provider: z.array(z.string()).optional(),
        model: z.array(z.string()).optional(),
        team: z.array(z.string()).optional(),
        project: z.array(z.string()).optional(),
      })
      .optional()
      .describe("Narrow to specific values, e.g. {model: ['claude-sonnet-5']}"),
    topN: z
      .number()
      .optional()
      .describe("Keep only the top N categories; the rest fold into 'Other'. Max 6."),
  }),
  execute: async (input) => {
    const [bounds, available] = await Promise.all([spendDateRange(), spendDimensions()]);
    const rows = await fetchRows(input, bounds, available, input.chartType === "stat");

    return buildSpendChartPayload(rows, available, bounds, input as SpendChartInput);
  },
});

/**
 * A fixed dashboard — a KPI row plus a trend and a breakdown — rather than a
 * single chart. Kept as its own tool with a narrower schema: the model only
 * picks the range and filters here, never the chart type or which cards
 * appear, so a "spend dashboard" request always comes back with the same
 * shape.
 */
export const renderSpendDashboard = tool({
  description:
    "Build a dashboard of AI/LLM spend: a row of key figures (total spend, most used model, total requests, top team) plus a spend trend and a spend-by-model breakdown. Use this for requests like 'build a dashboard', 'give me an overview' or 'summarize spend' — not for a single-chart question, which renderSpendChart handles.",
  inputSchema: z.object({
    title: z.string().describe("Short dashboard title, e.g. 'Spend overview'"),
    subtitle: z.string().optional().describe("Optional qualifier, e.g. 'Last 30 days'"),
    days: z
      .number()
      .optional()
      .describe("Relative window, e.g. 30 for the last 30 days. Omit for all available data."),
    from: z.string().optional().describe("Explicit start date, YYYY-MM-DD"),
    to: z.string().optional().describe("Explicit end date, YYYY-MM-DD"),
    filters: z
      .object({
        provider: z.array(z.string()).optional(),
        model: z.array(z.string()).optional(),
        team: z.array(z.string()).optional(),
        project: z.array(z.string()).optional(),
      })
      .optional()
      .describe("Narrow to specific values, e.g. {team: ['platform']}"),
  }),
  execute: async (input) => {
    const [bounds, available] = await Promise.all([spendDateRange(), spendDimensions()]);
    // A dashboard always builds stat cards, so it always needs the prior window.
    const rows = await fetchRows(input, bounds, available, true);

    return buildSpendDashboardPayload(rows, available, bounds, input as SpendDashboardInput);
  },
});

/** Prompt fragment describing the data, built from the data itself. */
export async function spendPromptContext(): Promise<string> {
  const [range, dimensions] = await Promise.all([spendDateRange(), spendDimensions()]);

  return [
    `Data covers ${range.from} to ${range.to}. Treat ${range.to} as the most recent day with data.`,
    "Exact dimension values available:",
    ...DIMENSIONS.map((dimension) => `  ${dimension}: ${dimensions[dimension].join(", ")}`),
  ].join("\n");
}
