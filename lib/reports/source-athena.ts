import "server-only";

import { athenaConfig, athenaQuery } from "./athena";

import type { Dimension, SpendQuery, SpendRow } from "./types";

/**
 * Maps the FOCUS 1.4 view over CUR 2.0 onto `SpendRow`.
 *
 * Three things about the source shape drive everything below.
 *
 * 1. AI spend is not one service. Native Bedrock models bill under
 *    ServiceName 'Amazon Bedrock', but Anthropic models bill through AWS
 *    Marketplace under an opaque product code — filtering on service name hides
 *    the largest share of the bill. Both carry a Bedrock inference-profile ARN
 *    in ResourceId, so that is the thing to match on.
 *
 * 2. FOCUS is a billing spec, so input and output tokens are separate charge
 *    rows distinguished by SkuMeter, not columns. They need a pivot. The two
 *    billing paths also report different units — '1K tokens' for Bedrock,
 *    '1M tokens' for Marketplace — so quantities are scaled per row from
 *    ConsumedUnit. Skipping that understates Claude usage by 1000x.
 *
 * 3. Cost comes from EffectiveCost — amortised cost after discounts and
 *    commitments, which is the honest answer to "what did this actually cost
 *    us". It currently equals BilledCost on every row because this account has
 *    no discounts or commitments in play; it diverges, correctly, as soon as
 *    either appears.
 */

/** Only rows billed against a Bedrock inference profile are AI spend. */
const AI_SPEND_PREDICATE = `ResourceId LIKE 'arn:aws:bedrock:%' AND ChargeCategory = 'Usage'`;

/**
 * Bedrock bills AI usage under two ARN shapes, and both have to be read:
 *
 *   inference-profile/eu.anthropic.claude-sonnet-5 -> anthropic / claude-sonnet-5
 *   foundation-model/amazon.titan-embed-text-v2:0  -> amazon    / titan-embed-text
 *
 * An inference profile carries a cross-region routing prefix (`eu.`, `global.`)
 * which is not part of the model identity; a direct foundation-model invocation
 * has no prefix at all. So the prefix is optional rather than required — before
 * that, every direct invocation reported `unknown` for both provider and model.
 *
 * The trailing version is stripped so one model is one series: a chart should
 * not split `claude-sonnet-4-5-20250929-v1:0` from a plain `claude-sonnet-4-5`.
 */
const ARN_MODEL_PATH = `(?:foundation-model|inference-profile)/(?:[a-z0-9-]+\\.)?`;

const PROVIDER_EXPR = `regexp_extract(ResourceId, '${ARN_MODEL_PATH}([a-z]+)\\.', 1)`;
const MODEL_EXPR = `regexp_replace(
      regexp_extract(ResourceId, '${ARN_MODEL_PATH}[a-z]+\\.(.+)$', 1),
      '-(?:\\d{8}-)?v\\d+:\\d+$',
      '')`;

/**
 * The AWS identity behind the charge. x_IamPrincipal holds a full ARN, and the
 * useful part is the last segment — `BedrockAPIKey-dmqn` for an IAM user,
 * `su.chatterjee@reply.com` for an SSO role — so the ARN prefix is trimmed to
 * keep chart labels readable.
 */
const PRINCIPAL_EXPR = `COALESCE(NULLIF(regexp_extract(x_IamPrincipal, '[^/:]+$'), ''), 'unknown')`;

/** ConsumedQuantity is denominated by ConsumedUnit, which differs per billing path. */
const TOKENS_EXPR = `ConsumedQuantity * CASE lower(ConsumedUnit)
      WHEN '1k tokens' THEN 1000
      WHEN '1m tokens' THEN 1000000
      ELSE 1 END`;

/** Placeholder for a dimension the source can't populate. */
const UNTAGGED = "untagged";

/**
 * Team and project come from FOCUS `Tags`. No cost allocation tags are
 * activated on this account — `Tags` is `{}` on every row — so both resolve to
 * a literal. Setting the env keys switches them on without a code change.
 *
 * The key is interpolated rather than bound, so it is restricted to characters
 * that cannot terminate the JSON path or the surrounding SQL string.
 */
function tagExpr(envKey: string): string {
  const key = process.env[envKey];
  if (!key) return `'${UNTAGGED}'`;

  if (!/^[A-Za-z0-9_.:/-]+$/.test(key)) {
    throw new Error(
      `${envKey} must match /^[A-Za-z0-9_.:\\/-]+$/ — got "${key}". It is interpolated into SQL, so the character set is restricted.`,
    );
  }

  return `COALESCE(NULLIF(json_extract_scalar(Tags, '$["${key}"]'), ''), '${UNTAGGED}')`;
}

/**
 * Athena's ExecutionParameters are substituted as SQL literals, not bound the
 * way a Postgres driver binds them — an unquoted `2026-08-01` is evaluated as
 * arithmetic and arrives as 2017. So every parameter has to carry its own
 * quoting, which means quoting is a correctness *and* an injection concern.
 *
 * Values are therefore validated before they get here (dates by shape, filter
 * values by membership of the known set) and escaped on the way out.
 */
const quote = (value: string) => `'${value.replace(/'/g, "''")}'`;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function assertIsoDate(value: string, label: string): string {
  if (!ISO_DATE.test(value)) {
    throw new Error(`${label} must be an ISO date (YYYY-MM-DD), got "${value}".`);
  }
  return value;
}

const DIMENSION_COLUMNS: Record<Dimension, string> = {
  provider: "provider",
  model: "model",
  team: "team",
  project: "project",
  principal: "principal",
};

/** The projection from FOCUS charge lines to one row per day/provider/model/team/project. */
function baseQuery(): string {
  const { view } = athenaConfig();

  return `WITH lines AS (
    SELECT
      date_format(ChargePeriodStart, '%Y-%m-%d') AS day,
      ${PROVIDER_EXPR} AS provider,
      ${MODEL_EXPR} AS model,
      ${tagExpr("ATHENA_TEAM_TAG_KEY")} AS team,
      ${tagExpr("ATHENA_PROJECT_TAG_KEY")} AS project,
      ${PRINCIPAL_EXPR} AS principal,
      lower(SkuMeter) AS meter,
      ${TOKENS_EXPR} AS tokens,
      EffectiveCost AS cost
    FROM ${view}
    WHERE ${AI_SPEND_PREDICATE}`;
}

/**
 * Rows for the query, aggregated in Athena to one row per day and dimension
 * tuple. The date range and dimension filters are pushed into SQL so a wide
 * dataset never crosses the wire; `query.ts` re-applies the same query in
 * memory, which is a no-op on an already-narrowed set.
 */
export async function loadSpendRows(query: SpendQuery = {}): Promise<SpendRow[]> {
  const params: string[] = [];
  const where: string[] = [];

  if (query.from) {
    where.push(`ChargePeriodStart >= date(?)`);
    params.push(quote(assertIsoDate(query.from, "query.from")));
  }
  if (query.to) {
    where.push(`ChargePeriodStart < date(?) + interval '1' day`);
    params.push(quote(assertIsoDate(query.to, "query.to")));
  }

  // Filter values are matched against the vocabulary the warehouse itself
  // reported, so a value the model invented can never reach the statement.
  const allowed = await spendDimensions();
  const outerWhere: string[] = [];

  for (const [dimension, values] of Object.entries(query.filters ?? {})) {
    if (!values?.length) continue;

    const known = values.filter((value) => allowed[dimension as Dimension].includes(value));
    // Every requested value was unknown, so nothing can match.
    if (!known.length) return [];

    const placeholders = known.map(() => "?").join(", ");
    outerWhere.push(`${DIMENSION_COLUMNS[dimension as Dimension]} IN (${placeholders})`);
    params.push(...known.map(quote));
  }

  const sql = `${baseQuery()}
      ${where.length ? `AND ${where.join(" AND ")}` : ""}
  )
  SELECT day, provider, model, team, project, principal,
    SUM(CASE WHEN meter LIKE '%input%' THEN tokens ELSE 0 END) AS input_tokens,
    SUM(CASE WHEN meter LIKE '%output%' THEN tokens ELSE 0 END) AS output_tokens,
    SUM(cost) AS cost_usd
  FROM lines
  ${outerWhere.length ? `WHERE ${outerWhere.join(" AND ")}` : ""}
  GROUP BY 1, 2, 3, 4, 5, 6
  ORDER BY 1, 2, 3`;

  const rows = await athenaQuery(sql, params);

  return rows.map((row) => ({
    date: row.day ?? "",
    provider: row.provider || "unknown",
    model: row.model || "unknown",
    team: row.team || UNTAGGED,
    project: row.project || UNTAGGED,
    principal: row.principal || "unknown",
    inputTokens: Math.round(Number(row.input_tokens ?? 0)),
    outputTokens: Math.round(Number(row.output_tokens ?? 0)),
    costUsd: Number(row.cost_usd ?? 0),
  }));
}

type Metadata = {
  range: { from: string; to: string };
  dimensions: Record<Dimension, string[]>;
};

/**
 * `spendPromptContext()` needs the date bounds and the dimension vocabulary on
 * every chat message, before the model has even started. Against Athena that is
 * a query per message, for figures that change at most daily — so both come
 * from one statement, cached with a TTL, and concurrent callers share the
 * in-flight promise rather than each starting their own query.
 */
const TTL_MS = Number(process.env.REPORTS_CACHE_TTL_SECONDS ?? 900) * 1000;

let cache: { at: number; value: Metadata } | undefined;
let inFlight: Promise<Metadata> | undefined;

/**
 * Columns the projection in `baseQuery()` reads. `Tags` is only required once a
 * tag key is configured — until then `tagExpr` emits a literal and never
 * references the column.
 */
const REQUIRED_COLUMNS = [
  "ChargePeriodStart",
  "ResourceId",
  "SkuMeter",
  "ConsumedQuantity",
  "ConsumedUnit",
  "ChargeCategory",
  "EffectiveCost",
  "x_IamPrincipal",
];

let shapeVerified = false;

/**
 * Fails before the first real query, naming every missing column at once.
 *
 * Without this, a renamed or absent column surfaces as a raw Athena
 * COLUMN_NOT_FOUND that the chat UI flattens into "try narrowing the date range
 * or naming a specific model or team" — which sends you looking at the range
 * when the actual problem is the view. Trino also stops at the first bad column,
 * so a hand-rolled view missing three of them takes three round trips to fix.
 *
 * Runs once per process rather than per metadata refresh: a view's shape does
 * not change under a running server, and this costs an extra statement.
 */
async function assertViewShape(): Promise<void> {
  if (shapeVerified) return;

  const { view, database } = athenaConfig();
  // The view may be given as `table`, `schema.table` or `catalog.schema.table`.
  const parts = view.split(".");
  const table = parts[parts.length - 1];
  const schema = parts.length > 1 ? parts[parts.length - 2] : database;

  const rows = await athenaQuery(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = ? AND table_name = ?`,
    [quote(schema), quote(table)],
  );

  // Trino lower-cases identifiers in information_schema, so `x_IamPrincipal`
  // comes back as `x_iamprincipal`. Compare case-insensitively or every
  // mixed-case column reads as missing.
  const present = new Set(rows.map((row) => (row.column_name ?? "").toLowerCase()));

  if (!present.size) {
    throw new Error(
      `ATHENA_SPEND_VIEW "${view}" has no columns in information_schema — it does not exist, or these credentials cannot see it. Check the name, ATHENA_DATABASE and the AWS profile.`,
    );
  }

  const needed = [...REQUIRED_COLUMNS];
  if (process.env.ATHENA_TEAM_TAG_KEY || process.env.ATHENA_PROJECT_TAG_KEY) {
    needed.push("Tags");
  }

  const missing = needed.filter((column) => !present.has(column.toLowerCase()));
  if (missing.length) {
    throw new Error(
      `ATHENA_SPEND_VIEW "${view}" is missing ${missing.length} column(s) the spend query needs: ${missing.join(", ")}.\nColumns actually present: ${[...present].sort().join(", ")}`,
    );
  }

  shapeVerified = true;
}

async function fetchMetadata(): Promise<Metadata> {
  await assertViewShape();

  const sql = `${baseQuery()}
  )
  SELECT provider, model, team, project, principal,
         min(day) AS min_day, max(day) AS max_day
  FROM lines
  GROUP BY 1, 2, 3, 4, 5`;

  const rows = await athenaQuery(sql);

  const distinct = (column: string) =>
    [...new Set(rows.map((row) => row[column]).filter((v): v is string => !!v))].sort();

  const days = rows.flatMap((row) => [row.min_day, row.max_day]).filter(Boolean).sort();

  return {
    // An empty source would otherwise produce `undefined` bounds and an
    // unreadable downstream failure; a same-day empty range is at least honest.
    range: { from: days[0] ?? "1970-01-01", to: days[days.length - 1] ?? "1970-01-01" },
    dimensions: {
      provider: distinct("provider"),
      model: distinct("model"),
      team: distinct("team"),
      project: distinct("project"),
      principal: distinct("principal"),
    },
  };
}

function metadata(): Promise<Metadata> {
  if (cache && Date.now() - cache.at < TTL_MS) return Promise.resolve(cache.value);
  if (inFlight) return inFlight;

  inFlight = fetchMetadata()
    .then((value) => {
      cache = { at: Date.now(), value };
      return value;
    })
    .finally(() => {
      inFlight = undefined;
    });

  return inFlight;
}

export async function spendDateRange(): Promise<{ from: string; to: string }> {
  return (await metadata()).range;
}

export async function spendDimensions(): Promise<Record<Dimension, string[]>> {
  return (await metadata()).dimensions;
}
