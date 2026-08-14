import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { selectRows } from "./query";

import type { Dimension, SpendQuery, SpendRow } from "./types";

/**
 * The swappable driver: the only place that knows where spend data comes from.
 * Everything above it — `query.ts`, `spec.ts`, the charts, the pages — works on
 * `SpendRow[]` and never learns whether that came from a file or a warehouse.
 *
 * The interface is async and takes a `SpendQuery` so a remote source can push
 * the date range and dimension filters down into its own WHERE clause rather
 * than shipping the whole table back. The CSV driver honours the same query in
 * memory, so both drivers return identical rows for identical input.
 *
 * The parser splits on commas without handling quoting, which is safe because
 * we generate the file ourselves (see db/generate-spend-csv.ts). Don't point it
 * at an arbitrary export.
 */
const CSV_PATH = join(process.cwd(), "data", "ai-spend.csv");

let cached: SpendRow[] | undefined;

/** Whole-file read, cached for the life of the process — the fixture is static. */
function allRows(): SpendRow[] {
  if (cached) return cached;

  const [, ...lines] = readFileSync(CSV_PATH, "utf8").trim().split("\n");

  cached = lines.map((line) => {
    const [
      date,
      provider,
      model,
      team,
      project,
      requests,
      inputTokens,
      outputTokens,
      cacheReadTokens,
      costUsd,
    ] = line.split(",");

    return {
      date,
      provider,
      model,
      team,
      project,
      requests: Number(requests),
      inputTokens: Number(inputTokens),
      outputTokens: Number(outputTokens),
      cacheReadTokens: Number(cacheReadTokens),
      costUsd: Number(costUsd),
    };
  });

  return cached;
}

/**
 * Rows matching the query's date bounds and dimension filters. Callers must
 * still pass the query to the aggregators — this narrows what gets fetched, it
 * doesn't replace `selectRows`.
 */
export async function loadSpendRows(query: SpendQuery = {}): Promise<SpendRow[]> {
  return selectRows(allRows(), query);
}

/** Inclusive date bounds of the whole source. */
export async function spendDateRange(): Promise<{ from: string; to: string }> {
  const dates = allRows()
    .map((row) => row.date)
    .sort();
  return { from: dates[0], to: dates[dates.length - 1] };
}

/**
 * Distinct values per dimension. The chat prompt is built from these so the
 * model is told the real vocabulary of the data rather than a hardcoded list
 * that drifts as the source changes.
 */
export async function spendDimensions(): Promise<Record<Dimension, string[]>> {
  const rows = allRows();
  const distinct = (dimension: Dimension) =>
    [...new Set(rows.map((row) => row[dimension]))].sort();

  return {
    provider: distinct("provider"),
    model: distinct("model"),
    team: distinct("team"),
    project: distinct("project"),
  };
}
