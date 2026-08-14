import "server-only";

import * as athena from "./source-athena";
import * as csv from "./source-csv";

import type { Dimension, SpendQuery, SpendRow } from "./types";

/**
 * The swappable driver: the only place that knows where spend data comes from.
 * Everything above it — `query.ts`, `spec.ts`, the charts, the pages — works on
 * `SpendRow[]` and never learns which driver answered.
 *
 * The interface is async and takes a `SpendQuery` so a remote driver can push
 * the date range and dimension filters into its own WHERE clause rather than
 * returning the whole table. Both drivers honour the same query, so they return
 * identical rows for identical input.
 */
/**
 * Resolved per call rather than at module load: reading the flag at import time
 * makes the choice depend on whether the env happened to be populated before
 * this module was first required, which is true under `next dev` but not for a
 * script or a test that loads its env itself.
 */
const driver = () => (process.env.REPORTS_SOURCE === "athena" ? athena : csv);

/**
 * Rows matching the query's date bounds and dimension filters. Callers must
 * still pass the query to the aggregators — this narrows what gets fetched, it
 * doesn't replace `selectRows`.
 */
export function loadSpendRows(query: SpendQuery = {}): Promise<SpendRow[]> {
  return driver().loadSpendRows(query);
}

/** Inclusive date bounds of the whole source. */
export function spendDateRange(): Promise<{ from: string; to: string }> {
  return driver().spendDateRange();
}

/**
 * Distinct values per dimension. The chat prompt is built from these so the
 * model is told the real vocabulary of the data rather than a hardcoded list
 * that drifts as the source changes.
 */
export function spendDimensions(): Promise<Record<Dimension, string[]>> {
  return driver().spendDimensions();
}
