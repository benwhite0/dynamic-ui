import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { SpendRow } from "./types";

/**
 * Reads the dummy spend CSV. This is the swappable driver: when the real source
 * lands, an Athena implementation replaces this file and everything above it —
 * `query.ts`, the charts, the page — stays as it is.
 *
 * The parser splits on commas without handling quoting, which is safe because
 * we generate the file ourselves (see db/generate-spend-csv.ts). Don't point it
 * at an arbitrary export.
 */
const CSV_PATH = join(process.cwd(), "data", "ai-spend.csv");

let cached: SpendRow[] | undefined;

export function loadSpendRows(): SpendRow[] {
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

/** Inclusive date bounds of the loaded data. */
export function spendDateRange(): { from: string; to: string } {
  const rows = loadSpendRows();
  const dates = rows.map((row) => row.date).sort();
  return { from: dates[0], to: dates[dates.length - 1] };
}
