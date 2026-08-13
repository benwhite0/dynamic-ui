"use client";


import { StatTile } from "./charts/kpi-row";
import { SpendBars } from "./charts/spend-bars";
import { SpendDonut } from "./charts/spend-donut";
import { SpendStack } from "./charts/spend-stack";
import { SpendTrend } from "./charts/spend-trend";

import type { SpendChartPayload } from "@/lib/reports/types";

/**
 * Maps a renderSpendChart tool result to a chart. The model chose the form and
 * the question; the numbers came from the tool's own aggregation, so there is
 * nothing to compute here — only to draw.
 */
export function SpendChart({ payload }: { payload: SpendChartPayload }) {
  switch (payload.chartType) {
    case "empty":
      return (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-medium text-foreground">{payload.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{payload.message}</p>
        </div>
      );

    case "stat":
      return (
        <div className="max-w-xs">
          <StatTile
            stat={{
              label: payload.title,
              value: payload.value,
              delta: payload.delta,
              comparison: payload.comparison,
              // Every metric here is spend or volume, so a rise is never good news.
              upIsGood: false,
              trend: payload.trend,
            }}
            hero
          />
        </div>
      );

    case "line":
      return (
        <SpendTrend
          series={payload.series}
          granularity={payload.granularity}
          metric={payload.metric}
          title={payload.title}
          subtitle={payload.subtitle}
        />
      );

    case "bar":
      return (
        <SpendStack
          series={payload.series}
          granularity={payload.granularity}
          metric={payload.metric}
          title={payload.title}
          subtitle={payload.subtitle}
        />
      );

    case "donut":
      return (
        <SpendDonut
          data={payload.data}
          metric={payload.metric}
          title={payload.title}
          subtitle={payload.subtitle}
        />
      );

    case "ranked":
      return (
        <SpendBars
          data={payload.data}
          metric={payload.metric}
          title={payload.title}
          subtitle={payload.subtitle}
        />
      );
  }
}
