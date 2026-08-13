import "server-only";

import { tool } from "ai";
import { z } from "zod";

import { loadSpendRows, spendDateRange, spendDimensions } from "./source";
import { DIMENSIONS, buildSpendChartPayload, type SpendChartInput } from "./spec";

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
  execute: async (input) =>
    buildSpendChartPayload(
      loadSpendRows(),
      spendDimensions(),
      spendDateRange(),
      input as SpendChartInput,
    ),
});

/** Prompt fragment describing the data, built from the data itself. */
export function spendPromptContext(): string {
  const range = spendDateRange();
  const dimensions = spendDimensions();

  return [
    `Data covers ${range.from} to ${range.to}. Treat ${range.to} as the most recent day with data.`,
    "Exact dimension values available:",
    ...DIMENSIONS.map((dimension) => `  ${dimension}: ${dimensions[dimension].join(", ")}`),
  ].join("\n");
}
