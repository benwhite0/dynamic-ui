/**
 * Generates `data/ai-spend.csv` — dummy LLM spend data for developing the
 * reporting charts before the real AWS Athena source is wired up.
 *
 * Deterministic: a fixed-seed PRNG means re-running produces a byte-identical
 * file, so the committed CSV stays reviewable in diffs.
 *
 * Run with: pnpm db:generate-spend
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// Published Anthropic list rates in USD per million tokens (as of 2026-06).
// Bedrock is partner-operated and priced separately; this fixture applies
// first-party rates to both routes, which is close enough for test data.
// Sonnet 5 also has a lower introductory rate through 2026-08-31 that we
// deliberately ignore here — one rate per model keeps the numbers checkable.
const MODELS = {
  "claude-fable-5": { input: 10, output: 50 },
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
} as const;

type Model = keyof typeof MODELS;

// Cache reads bill at ~10% of the base input rate.
const CACHE_READ_MULTIPLIER = 0.1;

/**
 * Each team routes through one platform and works with a characteristic model
 * mix. `weight` is the team's share of that model's daily traffic; `verbosity`
 * scales output tokens against input, since a coding agent emits far more than
 * a classifier.
 */
const TEAMS = [
  {
    name: "Delivery",
    provider: "bedrock",
    projects: ["Cortex CMS", "Client Portal"],
    models: [
      { model: "claude-opus-5", weight: 1.0, requests: 900, verbosity: 0.5 },
      { model: "claude-opus-4-8", weight: 1.0, requests: 700, verbosity: 0.5 },
      { model: "claude-sonnet-5", weight: 1.6, requests: 2600, verbosity: 0.4 },
    ],
  },
  {
    name: "Platform",
    provider: "bedrock",
    projects: ["Ingest Pipeline", "Agent Runtime"],
    models: [
      { model: "claude-haiku-4-5", weight: 3.2, requests: 12000, verbosity: 0.08 },
      { model: "claude-sonnet-5", weight: 0.9, requests: 2200, verbosity: 0.2 },
    ],
  },
  {
    name: "Data Science",
    provider: "anthropic-api",
    projects: ["Forecasting", "Churn Model"],
    models: [
      { model: "claude-fable-5", weight: 0.5, requests: 180, verbosity: 0.7 },
      { model: "claude-opus-5", weight: 0.7, requests: 620, verbosity: 0.6 },
    ],
  },
  {
    name: "Sales Engineering",
    provider: "anthropic-api",
    projects: ["Demo Builder", "RFP Assistant"],
    models: [
      { model: "claude-sonnet-5", weight: 0.8, requests: 1400, verbosity: 0.45 },
      { model: "claude-haiku-4-5", weight: 0.9, requests: 3000, verbosity: 0.12 },
    ],
  },
  {
    name: "Support",
    provider: "bedrock",
    projects: ["Ticket Triage"],
    models: [
      { model: "claude-haiku-4-5", weight: 1.8, requests: 8000, verbosity: 0.1 },
      { model: "claude-sonnet-5", weight: 0.6, requests: 1200, verbosity: 0.3 },
    ],
  },
] as const;

const DAYS = 90;
const END_DATE = "2026-08-12";

// A production incident: retry storms drove a spend spike over three days.
const INCIDENT_START = 66;
const INCIDENT_LENGTH = 3;
const INCIDENT_MULTIPLIER = 2.8;

/** Deterministic PRNG (mulberry32) so the committed CSV is reproducible. */
function makeRandom(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = makeRandom(20260813);

/** Random multiplier in [1 - spread, 1 + spread]. */
const jitter = (spread: number) => 1 + (random() * 2 - 1) * spread;

/**
 * Models are mid-migration across the window: Opus 4.8 traffic drains away as
 * Opus 5 picks it up. `t` runs 0 → 1 across the 90 days.
 */
function migrationFactor(model: Model, t: number) {
  if (model === "claude-opus-4-8") return Math.max(0, 1 - t * 1.35);
  if (model === "claude-opus-5") return 0.15 + t * 1.5;
  return 1;
}

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

const rows: string[] = [];

const end = new Date(`${END_DATE}T00:00:00Z`);

for (let dayIndex = 0; dayIndex < DAYS; dayIndex += 1) {
  const date = new Date(end);
  date.setUTCDate(date.getUTCDate() - (DAYS - 1 - dayIndex));

  const t = dayIndex / (DAYS - 1);

  // Adoption grows steadily across the window.
  const growth = 0.62 + t * 0.75;

  // Weekends are much quieter than weekdays — it's a business workload.
  const weekday = date.getUTCDay();
  const weekendFactor = weekday === 0 || weekday === 6 ? 0.22 : 1;

  const incidentFactor =
    dayIndex >= INCIDENT_START && dayIndex < INCIDENT_START + INCIDENT_LENGTH
      ? INCIDENT_MULTIPLIER
      : 1;

  for (const team of TEAMS) {
    for (const entry of team.models) {
      const model = entry.model as Model;
      const migration = migrationFactor(model, t);
      if (migration <= 0) continue;

      const scale =
        entry.weight * growth * weekendFactor * incidentFactor * migration * jitter(0.18);

      const requests = Math.round(entry.requests * scale);
      if (requests <= 0) continue;

      // Tokens per request vary by model tier; bigger models take more context.
      const inputPerRequest = 900 + MODELS[model].input * 260 * jitter(0.25);
      const inputTokens = Math.round(requests * inputPerRequest);
      const outputTokens = Math.round(inputTokens * entry.verbosity * jitter(0.2));

      // Cache hit rate climbs over the window as teams tune their prompts.
      const cacheReadTokens = Math.round(inputTokens * (0.18 + t * 0.34) * jitter(0.15));

      const rates = MODELS[model];
      const costUsd =
        (inputTokens * rates.input +
          outputTokens * rates.output +
          cacheReadTokens * rates.input * CACHE_READ_MULTIPLIER) /
        1_000_000;

      const project = team.projects[Math.floor(random() * team.projects.length)];

      rows.push(
        [
          toISODate(date),
          team.provider,
          model,
          team.name,
          project,
          requests,
          inputTokens,
          outputTokens,
          cacheReadTokens,
          costUsd.toFixed(2),
        ].join(","),
      );
    }
  }
}

const header =
  "date,provider,model,team,project,requests,input_tokens,output_tokens,cache_read_tokens,cost_usd";
const csv = `${header}\n${rows.join("\n")}\n`;

const outDir = join(process.cwd(), "data");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "ai-spend.csv"), csv);

const total = rows.reduce((sum, row) => sum + Number(row.split(",").at(-1)), 0);
console.log(`✅ Wrote data/ai-spend.csv — ${rows.length} rows, $${total.toFixed(2)} total spend`);
