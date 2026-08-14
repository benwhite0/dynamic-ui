"use client";

import { KpiRow } from "./charts/kpi-row";
import { SpendChart } from "./spend-chart";

import type { SpendDashboardPayload } from "@/lib/reports/types";

/**
 * Maps a renderSpendDashboard tool result to a KPI row plus its charts. Same
 * split as SpendChart: the tool decided the numbers and which cards appear,
 * this only draws them.
 */
export function SpendDashboard({ payload }: { payload: SpendDashboardPayload }) {
  if (payload.chartType === "empty") {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-medium text-foreground">{payload.title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{payload.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-medium text-foreground">{payload.title}</h3>
        {payload.subtitle && (
          <p className="mt-0.5 text-xs text-muted-foreground">{payload.subtitle}</p>
        )}
      </div>
      <KpiRow stats={payload.stats} />
      <div className="grid gap-4 lg:grid-cols-2">
        {payload.charts.map((chart, index) => (
          <SpendChart key={index} payload={chart} />
        ))}
      </div>
    </div>
  );
}
