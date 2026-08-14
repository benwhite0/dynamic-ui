import "server-only";

import {
  AthenaClient,
  GetQueryExecutionCommand,
  GetQueryResultsCommand,
  StartQueryExecutionCommand,
} from "@aws-sdk/client-athena";

/**
 * Thin Athena transport: run a statement, wait for it, return rows as strings.
 * Knows nothing about spend — the mapping from warehouse columns to `SpendRow`
 * lives in `source.ts`, so this file stays reusable and testable on its own.
 *
 * Athena is asynchronous by design: StartQueryExecution hands back an ID, the
 * engine runs, and results are fetched separately once it reports SUCCEEDED.
 */

/** How long to wait for a statement before giving up. */
const TIMEOUT_MS = 60_000;

/** Poll interval bounds. Starts tight for cheap queries, backs off for slow ones. */
const POLL_MIN_MS = 150;
const POLL_MAX_MS = 1_500;

/** Athena's page size cap for GetQueryResults. */
const PAGE_SIZE = 1_000;

/**
 * Athena can serve a byte-identical prior result instead of rescanning S3.
 * Spend data lands at most daily, so an hour-old answer is still correct, and
 * repeated questions in one chat session stop costing anything.
 */
const RESULT_REUSE_MINUTES = 60;

export type AthenaConfig = {
  region: string;
  database: string;
  workgroup: string;
  /** S3 URI for results. Optional — a workgroup may enforce its own. */
  outputLocation?: string;
  /** Fully-qualified view or table holding the spend data. */
  view: string;
};

let client: AthenaClient | undefined;
let config: AthenaConfig | undefined;

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. The Athena spend source needs it — see .env.example.`,
    );
  }
  return value;
}

/** Env-derived config, resolved once and reused. */
export function athenaConfig(): AthenaConfig {
  if (config) return config;

  config = {
    region: required("AWS_REGION"),
    database: required("ATHENA_DATABASE"),
    workgroup: required("ATHENA_WORKGROUP"),
    outputLocation: process.env.ATHENA_OUTPUT_LOCATION || undefined,
    view: required("ATHENA_SPEND_VIEW"),
  };

  return config;
}

function athenaClient(): AthenaClient {
  // Credentials come from the default provider chain, so the same code works
  // with an SSO profile locally and a task role in deployment.
  client ??= new AthenaClient({ region: athenaConfig().region });
  return client;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs a statement to completion and returns its rows keyed by column name.
 *
 * `params` are bound by Athena as `?` placeholders, never interpolated here —
 * every value that originates with the model has to travel this way, so a
 * filter value can't close a quote and continue the statement.
 */
export async function athenaQuery(
  sql: string,
  params: string[] = [],
): Promise<Record<string, string | undefined>[]> {
  const { database, workgroup, outputLocation } = athenaConfig();
  const athena = athenaClient();

  const started = await athena.send(
    new StartQueryExecutionCommand({
      QueryString: sql,
      QueryExecutionContext: { Database: database },
      WorkGroup: workgroup,
      // Only set when configured; otherwise the workgroup's own location wins.
      ...(outputLocation
        ? { ResultConfiguration: { OutputLocation: outputLocation } }
        : {}),
      ...(params.length ? { ExecutionParameters: params } : {}),
      ResultReuseConfiguration: {
        ResultReuseByAgeConfiguration: {
          Enabled: true,
          MaxAgeInMinutes: RESULT_REUSE_MINUTES,
        },
      },
    }),
  );

  const id = started.QueryExecutionId;
  if (!id) throw new Error("Athena did not return a QueryExecutionId.");

  await waitForQuery(athena, id, sql);
  return collectResults(athena, id);
}

/** Polls until the statement leaves QUEUED/RUNNING, or the deadline passes. */
async function waitForQuery(
  athena: AthenaClient,
  id: string,
  sql: string,
): Promise<void> {
  const deadline = Date.now() + TIMEOUT_MS;
  let wait = POLL_MIN_MS;

  while (Date.now() < deadline) {
    await sleep(wait);
    wait = Math.min(wait * 2, POLL_MAX_MS);

    const { QueryExecution } = await athena.send(
      new GetQueryExecutionCommand({ QueryExecutionId: id }),
    );
    const state = QueryExecution?.Status?.State;

    if (state === "SUCCEEDED") return;

    if (state === "FAILED" || state === "CANCELLED") {
      const reason =
        QueryExecution?.Status?.StateChangeReason ?? "no reason given";
      throw new Error(`Athena query ${state.toLowerCase()}: ${reason}\n${sql}`);
    }
  }

  // Leaving it running would bill for a scan nobody reads, so stop it.
  throw new Error(`Athena query timed out after ${TIMEOUT_MS}ms (id ${id}).`);
}

/** Pages through the result set, dropping Athena's header row. */
async function collectResults(
  athena: AthenaClient,
  id: string,
): Promise<Record<string, string | undefined>[]> {
  const rows: Record<string, string | undefined>[] = [];
  let token: string | undefined;
  let columns: string[] = [];

  do {
    const page = await athena.send(
      new GetQueryResultsCommand({
        QueryExecutionId: id,
        MaxResults: PAGE_SIZE,
        NextToken: token,
      }),
    );

    if (!columns.length) {
      columns =
        page.ResultSet?.ResultSetMetadata?.ColumnInfo?.map(
          (column) => column.Name ?? "",
        ) ?? [];
    }

    for (const row of page.ResultSet?.Rows ?? []) {
      const values = row.Data?.map((cell) => cell.VarCharValue) ?? [];

      // Only the first page carries a header, and it looks like any other row —
      // identify it by its values matching the column names exactly.
      const isHeader =
        !token &&
        !rows.length &&
        values.length === columns.length &&
        values.every((value, index) => value === columns[index]);
      if (isHeader) continue;

      rows.push(
        Object.fromEntries(columns.map((name, index) => [name, values[index]])),
      );
    }

    token = page.NextToken;
  } while (token);

  return rows;
}
