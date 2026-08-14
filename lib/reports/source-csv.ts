import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { selectRows } from "./query";

import type { Dimension, SpendQuery, SpendRow } from "./types";

/**
 * The committed dummy fixture. Kept as a fallback so the charts can be checked
 * without AWS access — /reports/overview against this file is the quickest way
 * to see whether a rendering change is correct.
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
    // The fixture still carries requests and cacheReadTokens columns, which no
    // longer exist on SpendRow — no billing source can populate them.
    const [date, provider, model, team, project, , inputTokens, outputTokens, , costUsd] =
      line.split(",");

    return {
      date,
      provider,
      model,
      team,
      project,
      inputTokens: Number(inputTokens),
      outputTokens: Number(outputTokens),
      costUsd: Number(costUsd),
    };
  });

  return cached;
}

export async function loadSpendRows(query: SpendQuery = {}): Promise<SpendRow[]> {
  return selectRows(allRows(), query);
}

export async function spendDateRange(): Promise<{ from: string; to: string }> {
  const dates = allRows()
    .map((row) => row.date)
    .sort();
  return { from: dates[0], to: dates[dates.length - 1] };
}

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
