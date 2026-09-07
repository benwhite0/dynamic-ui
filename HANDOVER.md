# AI Spend Reports — handover

The `/reports` app: ask a question about AI/LLM spend in plain English, get a chart
back inside the conversation. It is deliberately separate from the general chatbot
in this repo — its own route group, its own prompt, its own two tools, and none of
the search/forms/website tooling.

---

## 1. How it works

```
browser  /reports
   │  useChat({ transport: DefaultChatTransport({ api: "/api/reports/chat" }) })
   ▼
POST /api/reports/chat                    app/(reports)/api/reports/chat/route.ts
   │  streamText({ model: geminiProModel, tools: { renderSpendChart,
   │               renderSpendDashboard }, stopWhen: stepCountIs(4) })
   ▼
model picks a tool and fills in a form    lib/reports/chart-tool.ts  (zod inputSchema)
   │  { chartType, title, metric?, groupBy?, days?/from?/to?, filters? }
   ▼
execute() runs server-side
   │  1. spendDateRange() + spendDimensions()   ← cached metadata, 15 min TTL
   │  2. loadSpendRows({ from, to, filters })   ← the only 3 fields that reach SQL
   │  3. buildSpendChartPayload(...)            ← lib/reports/spec.ts (pure)
   ▼
typed payload streams back as a tool part
   ▼
components/reports/message.tsx     part.type === "tool-renderSpendChart" → branch on state
components/reports/spend-chart.tsx switch (payload.chartType) → pick a component
```

### Two invariants worth preserving

**The model never writes SQL, and never supplies a number.** It fills in a narrow
form; the aggregation runs in `execute()`. Every figure in a chart came from the
query, not from model tokens. This matters more here than anywhere else in the app —
a hallucinated spend total looks exactly like a real one.

**Nothing is generated on the front end.** All six chart components are hand-written
and committed. The model picks one string out of a five-value enum and our switch
maps it to a component. It is selection from a fixed set, not generation.

The model *does* see the full query result fed back to it (that is how it writes its
closing sentence), so the prose beside a chart is prompt-guarded only —
`"Never state, estimate or recalculate figures yourself"`. If prose and chart ever
disagree, the chart is right.

### Filter safety

Filter values from the model are checked against the warehouse's own vocabulary
(`spendDimensions()`) before they reach a statement — see `source-athena.ts:168`.
An unknown value cannot reach SQL, and a request where *every* value is unknown
returns an `empty` payload naming the real values rather than silently dropping the
filter and charting total spend under the wrong title.

---

## 2. The data

`ATHENA_SPEND_VIEW=finops.focus_1_4_cost_and_usage` — a FOCUS 1.4 view (67 columns)
over a CUR 2.0 export. A view, so it stores nothing and cannot go stale itself.

Three things about the source shape drive the query in `lib/reports/source-athena.ts`:

1. **AI spend is not one service.** Anthropic models bill through AWS Marketplace
   under opaque product codes; only Amazon's own models say `ServiceName = 'Amazon
   Bedrock'`. Both carry a Bedrock ARN in `ResourceId`, so that is the predicate:
   `ResourceId LIKE 'arn:aws:bedrock:%' AND ChargeCategory = 'Usage'`.
   Filtering on service name returns $0.32 of a real $74.52.
2. **Input and output tokens are separate rows**, distinguished by `SkuMeter`, so
   they need a pivot: `lower(SkuMeter) LIKE '%input%'` / `'%output%'`.
3. **Units differ per billing path.** `ConsumedUnit` is `'1K tokens'` for native
   Bedrock and `'1M tokens'` for Marketplace. Scale per row or Claude usage is
   understated 1000x.

### Known state of the data — read this first

The Production cost export was **deleted**, so AI spend data stops at
**2026-08-17**. This is not a bug in the app and it will not fix itself.

Two sub-accounts share the underlying S3 prefix:

| Account | | Bedrock spend | Rows | Last day |
|---|---|---|---|---|
| 490004636127 | Production | $73.83 | 664 | 2026-08-17 |
| 557690582324 | Pre-Production | $0.69 | 36 | 2026-08-13 |

The surviving export is Pre-Production, which reports ~$0 cost and has almost no
Bedrock usage — it is not a usable substitute. Fixing this means recreating a CUR 2.0
export covering 490004636127 (ideally org-wide at the payer, 448049817696) **in its
own S3 prefix**. Two exports sharing one prefix is what caused this; the accounts
happened to be disjoint, so nothing was double-counted, but overlapping exports
would have silently doubled every figure.

Verified with `SELECT count(DISTINCT "$path") ... GROUP BY line item + time interval`:
all 230,059 charge keys appear in exactly one file. No duplication.

### What the data cannot answer

There is **no request or API-call count** anywhere in AWS billing — it meters tokens
only. `Metric` in `lib/reports/types.ts` deliberately omits it. Do not add one; a
confident zero is indistinguishable from a real one.

`team` and `project` report `"untagged"` because no cost allocation tags are
activated. Set `ATHENA_TEAM_TAG_KEY` / `ATHENA_PROJECT_TAG_KEY` once they exist and
both dimensions populate with no code change. Until then, use `groupBy: "principal"`
(the IAM identity behind the charge) for "who spent this".

---

## 3. Running it locally

### Prerequisites

- Node 20+ (developed on 24) and pnpm (developed on 10.x)
- A Google Gemini API key
- For live data: AWS SSO access to the Athena workgroup (see §5)

### Setup

```bash
pnpm install
cp .env.example .env.local     # then edit — see the table below
pnpm dev                       # http://localhost:3000/reports
```

`/reports` is the chat. `/reports/overview` is a static gallery of every chart form,
useful for design work without burning tokens.

### No database or login required

Login is bypassed: `authorized()` returns `true` in `app/(auth)/auth.config.ts`, and
`auth()` in `app/(auth)/auth.ts` falls back to a shared guest session. The
`ensureGuestUser()` call is wrapped in try/catch specifically so `/reports` works
with no Postgres at all. Leave `POSTGRES_URL` and `BLOB_READ_WRITE_TOKEN` blank —
the general chatbot at `/` needs them, the reports app does not.

### Start with the CSV fixture

Set `REPORTS_SOURCE=csv` for the first run. It reads the committed fixture at
`data/ai-spend.csv` (966 rows, 90 days of synthetic LLM spend with deliberate
weekday/weekend seasonality, an adoption ramp, a model migration and a retry-storm
spike). Zero AWS access needed, and it confirms the charts render before you start
debugging credentials. Regenerate with `pnpm db:generate-spend` — it is
deterministic, so the output is byte-reproducible.

Then switch to `REPORTS_SOURCE=athena` for real data.

---

## 4. What you need to change

| Variable | Current value | What to do |
|---|---|---|
| `GOOGLE_GENERATIVE_AI_API_KEY` | — | **Your own key.** Required — the app has no other model provider wired up. |
| `AUTH_SECRET` | — | **`openssl rand -base64 32`.** NextAuth needs it even with login bypassed. |
| `REPORTS_SOURCE` | `athena` | Start at `csv`, switch to `athena` once credentials work. |
| `AWS_PROFILE` | `preprod` | **Your SSO profile name.** Then `aws sso login --profile <name>`. |
| `AWS_REGION` | `eu-west-2` | Keep `eu-west-2`. Note `.env.example` says `eu-west-1` — that is wrong, the data is in eu-west-2. |
| `ATHENA_DATABASE` | `finops` | Keep. |
| `ATHENA_SPEND_VIEW` | `finops.focus_1_4_cost_and_usage` | Keep. |
| `ATHENA_WORKGROUP` | `primary` | Keep, unless you have your own workgroup. |
| `ATHENA_OUTPUT_LOCATION` | `s3://superset-poc-athena-557690582324/spend-reports/` | Keep if you are in account 557690582324. Otherwise point at a bucket you can write to, or blank it if your workgroup enforces its own. |
| `POSTGRES_URL`, `BLOB_READ_WRITE_TOKEN` | — | Leave blank. Not needed for `/reports`. |
| `MCP_SERVER_URL`, `MCP_API_KEY` | — | Leave blank. Belongs to the general chatbot. |
| `ATHENA_TEAM_TAG_KEY`, `ATHENA_PROJECT_TAG_KEY` | blank | Leave blank until cost allocation tags exist. |
| `REPORTS_CACHE_TTL_SECONDS` | `900` | Keep. Drop it to `0` if you are actively debugging a data change. |

**No code changes are required.** Everything above is environment.

---

## 5. AWS permissions needed

```
athena:StartQueryExecution, athena:GetQueryExecution,
athena:GetQueryResults, athena:GetWorkGroup
glue:GetDatabase, glue:GetTable, glue:GetPartitions
s3:GetObject, s3:ListBucket   on  superset-poc-cur-data-557690582324
s3:GetObject, s3:PutObject,
s3:ListBucket                 on  superset-poc-athena-557690582324/spend-reports/*
```

Plus `lakeformation:GetDataAccess` if Lake Formation governs the `finops` database.

Credentials resolve through the standard AWS provider chain, so an SSO profile works
locally and a task role works when deployed — no code path difference.

---

## 6. Gotchas

- **Do not run `pnpm build`.** It is `tsx db/migrate && next build`, which runs
  migrations against whatever `POSTGRES_URL` points at. Use `npx next build`.
- **Two caches sit in front of the data**, so a change upstream can take ~an hour to
  appear: a 15-minute in-process metadata TTL (`REPORTS_CACHE_TTL_SECONDS`) and
  Athena's own 60-minute result reuse (`RESULT_REUSE_MINUTES` in `lib/reports/athena.ts`).
  Restarting the dev server clears the first.
- **Date filters do not reduce bytes scanned when querying the view** — it does not
  expose the underlying `billing_period` partition key. Harmless at ~3 MB/month, but
  don't assume narrowing the range makes a query cheaper. Filtering by model never
  reduces the scan either, because `model` is regex-derived inside the CTE and can
  only be filtered after derivation.
- **`lib/reports/chart-tool.ts` and `lib/reports/source-athena.ts` are `server-only`**
  and throw if imported from a plain Node script. The pure payload builder was
  extracted into `lib/reports/spec.ts` for exactly that reason — test against that.
- **Recharts animations must stay off.** Every mark spreads `NO_ANIMATION` from
  `components/reports/charts/chart-kit.tsx`. Without it the animated clip path never
  completes and charts render as an empty plot with the bars present in the DOM.
- **No `Intl` in `lib/reports/format.ts`.** Node and Chrome ship different ICU data,
  so `Intl` output differs between server and client and causes hydration mismatches.
  Number formatting is hand-rolled; keep it that way.
- **`/reports` has no conversation history.** Sharing the general chat's `Chat` table
  would put spend conversations in the other app's sidebar, whose renderer has no case
  for these tool parts. Adding history needs a `kind` column and a migration first.

---

## 7. File map

| Path | What it is |
|---|---|
| `app/(reports)/reports/page.tsx` | The chat page |
| `app/(reports)/reports/overview/page.tsx` | Static gallery of every chart form |
| `app/(reports)/api/reports/chat/route.ts` | The route + system prompt. Named `/api/reports/chat` because `(reports)/api/chat` would collide with the existing chat API — route group parentheses do not affect the URL |
| `lib/reports/chart-tool.ts` | The two tools: `renderSpendChart`, `renderSpendDashboard` |
| `lib/reports/spec.ts` | Pure payload builders — the testable core |
| `lib/reports/source.ts` | Swappable driver: `csv` or `athena` |
| `lib/reports/source-athena.ts` | The real SQL. FOCUS → `SpendRow` mapping |
| `lib/reports/source-csv.ts` | The fixture reader |
| `lib/reports/athena.ts` | Thin Athena transport, knows nothing about spend |
| `lib/reports/query.ts` | Pure aggregation over `SpendRow[]` |
| `lib/reports/format.ts` | Number/date formatting, no `Intl` |
| `components/reports/spend-chart.tsx` | payload → component switch |
| `components/reports/charts/chart-kit.tsx` | Shared palette, axes, tooltip, table toggle |
| `db/generate-spend-csv.ts` | Deterministic fixture generator |
| `docs/spend-reports-architecture.html` | Visual architecture diagram (its `<title>` was never filled in) |

---

## 8. First hour checklist

1. `pnpm install`
2. `.env.local` with `GOOGLE_GENERATIVE_AI_API_KEY`, `AUTH_SECRET`, `REPORTS_SOURCE=csv`
3. `pnpm dev` → http://localhost:3000/reports
4. Ask *"show me spend by model over the last 30 days"* — you should get a stacked bar
5. Visit `/reports/overview` to see every chart form at once
6. `aws sso login --profile <yours>`, set `AWS_PROFILE`, flip `REPORTS_SOURCE=athena`
7. Restart the dev server, ask the same question — the range should read Aug 2026 and
   stop at the 17th. If it does, everything works and the only problem is upstream.
