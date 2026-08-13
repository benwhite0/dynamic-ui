import { KpiRow, type Stat } from "@/components/reports/charts/kpi-row";
import { SpendBars } from "@/components/reports/charts/spend-bars";
import { SpendDonut } from "@/components/reports/charts/spend-donut";
import { SpendStack } from "@/components/reports/charts/spend-stack";
import { SpendTrend } from "@/components/reports/charts/spend-trend";
import {
  delta,
  formatBucket,
  formatCompact,
  formatCurrency,
} from "@/lib/reports/format";
import { byDimension, previousPeriod, timeSeries, total } from "@/lib/reports/query";
import { loadSpendRows, spendDateRange } from "@/lib/reports/source";

import type { SpendQuery } from "@/lib/reports/types";

/**
 * Every chart the report layer can produce, rendered against the dummy dataset.
 * This is the surface for iterating on the visuals; the chat-driven version
 * picks the same components from a tool result.
 */
export default function ReportsPage() {
  const rows = loadSpendRows();
  const range = spendDateRange();
  const scope: SpendQuery = { from: range.from, to: range.to };

  const currentTotal = total(rows, scope);
  const previous = previousPeriod(scope);
  // The fixture starts at `range.from`, so the prior window has no data to
  // compare against — deltas render only once there's real history behind them.
  const previousTotal = previous ? total(rows, previous) : null;
  const hasPrevious = previousTotal !== null && previousTotal > 0;

  const weekly = timeSeries(rows, { ...scope, bucket: "week" });
  const byModel = timeSeries(rows, { ...scope, bucket: "week", groupBy: "model" });
  const daily = timeSeries(rows, { ...scope, bucket: "day" });

  const models = byDimension(rows, scope);
  const teams = byDimension(rows, { ...scope, groupBy: "team" });
  const projects = byDimension(rows, { ...scope, groupBy: "project" });

  const stats: Stat[] = [
    {
      label: "Total spend",
      // Compact, not exact: a hero figure has to fit its tile at 48px. The
      // penny-accurate number is a tooltip and table-view concern.
      value: formatCurrency(currentTotal),
      delta: hasPrevious ? delta(currentTotal, previousTotal) : null,
      comparison: "vs previous 90 days",
      upIsGood: false,
      trend: weekly.points.map((point) => point.values.total),
    },
    {
      label: "Requests",
      value: formatCompact(total(rows, { ...scope, metric: "requests" })),
    },
    {
      label: "Tokens",
      value: formatCompact(total(rows, { ...scope, metric: "totalTokens" })),
    },
    {
      label: "Highest-spend model",
      value: models[0]?.key.replace("claude-", "") ?? "—",
    },
  ];

  const period = `${formatBucket(range.from)} – ${formatBucket(range.to)}`;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-lg font-medium text-foreground">AI spend</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {period} · {formatCurrency(currentTotal)} across {models.length} models and{" "}
          {teams.length} teams
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <KpiRow stats={stats} />

        <SpendTrend
          series={daily}
          granularity="day"
          title="Spend over time"
          subtitle="Daily, all providers"
        />

        <SpendStack
          series={byModel}
          granularity="week"
          title="Spend by model"
          subtitle="Weekly, stacked"
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <SpendDonut data={teams} title="Share by team" subtitle="Whole period" />
          <SpendBars
            data={projects}
            title="Spend by project"
            subtitle="Ranked, whole period"
          />
        </div>
      </div>
    </main>
  );
}
