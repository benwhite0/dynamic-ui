"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import {
  formatMetric,
  formatMetricExact,
  formatPercent,
} from "@/lib/reports/format";

import {
  ChartCard,
  NO_ANIMATION,
  SURFACE_GAP,
  TooltipCard,
  colorScale,
} from "./chart-kit";

import type { CategoryValue, Metric } from "@/lib/reports/types";

type TooltipEntry = { name?: string; value?: number };

function ShareTooltip({
  active,
  payload,
  total,
  metric,
  color,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  total: number;
  metric: Metric;
  color: (key: string) => string;
}) {
  if (!active || !payload?.length) return null;

  const entry = payload[0];
  const key = String(entry.name);
  const value = entry.value ?? 0;

  return (
    <TooltipCard
      label={key}
      rows={[
        { key: "Share", color: color(key), value: formatPercent(value / total) },
        { key: "Spend", color: color(key), value: formatMetricExact(value, metric) },
      ]}
    />
  );
}

/**
 * Part-to-whole at a glance, capped at six segments upstream. Only reach for
 * this when the split is the point; when the values sit close together a bar
 * chart compares them far better.
 */
export function SpendDonut({
  data,
  metric = "costUsd",
  title,
  subtitle,
}: {
  data: CategoryValue[];
  metric?: Metric;
  title: string;
  subtitle?: string;
}) {
  const keys = data.map((entry) => entry.key);
  const color = colorScale(keys);
  const total = data.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      height={260}
      legend={keys.map((key) => ({ key, color: color(key) }))}
      table={{
        columns: ["Segment", "Spend", "Share"],
        rows: data.map((entry) => [
          entry.key,
          formatMetricExact(entry.value, metric),
          formatPercent(entry.value / total),
        ]),
      }}
    >
      <div className="relative size-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={<ShareTooltip total={total} metric={metric} color={color} />}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="key"
              innerRadius="60%"
              outerRadius="85%"
              paddingAngle={2}
              startAngle={90}
              endAngle={-270}
              {...NO_ANIMATION}
            >
              {data.map((entry) => (
                <Cell key={entry.key} fill={color(entry.key)} {...SURFACE_GAP} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Centre label sits outside the SVG so it stays crisp and easy to style. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold text-foreground">
            {formatMetric(total, metric)}
          </span>
          <span className="text-xs text-muted-foreground">total</span>
        </div>
      </div>
    </ChartCard>
  );
}
