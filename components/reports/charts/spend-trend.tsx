"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  formatBucket,
  formatMetric,
  formatMetricExact,
  niceTicks,
} from "@/lib/reports/format";

import {
  AXIS_PROPS,
  ChartCard,
  GRID_PROPS,
  INK,
  NO_ANIMATION,
  SERIES_COLORS,
  TooltipCard,
  toChartData,
} from "./chart-kit";

import type { Bucket, Metric, TimeSeries } from "@/lib/reports/types";

type TooltipEntry = { value?: number };

function TrendTooltip({
  active,
  payload,
  label,
  granularity,
  metric,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  granularity: Bucket;
  metric: Metric;
}) {
  if (!active || !payload?.length || !label) return null;

  return (
    <TooltipCard
      label={formatBucket(label, granularity)}
      rows={[
        {
          key: "Spend",
          color: SERIES_COLORS[0],
          value: formatMetricExact(payload[0].value ?? 0, metric),
        },
      ]}
    />
  );
}

/**
 * Spend over time as a single series: one hue, a 2px line over a 10% wash.
 * No dot per point — 90 markers would read as noise — and no legend, since
 * there is only one thing plotted and the title names it. The endpoint carries
 * the only direct label, with right margin reserved so it can't clip.
 */
export function SpendTrend({
  series,
  granularity = "day",
  metric = "costUsd",
  title,
  subtitle,
}: {
  series: TimeSeries;
  granularity?: Bucket;
  metric?: Metric;
  title: string;
  subtitle?: string;
}) {
  const data = toChartData(series);
  const last = data.at(-1);
  const lastValue = last ? Number(last.total) : 0;
  const ticks = niceTicks(Math.max(...data.map((row) => Number(row.total)), 0));

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      height={260}
      table={{
        columns: ["Period", "Spend"],
        rows: data.map((row) => [
          formatBucket(row.bucket, granularity),
          formatMetricExact(Number(row.total), metric),
        ]),
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 52, bottom: 4, left: 4 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis
            {...AXIS_PROPS}
            dataKey="bucket"
            tickFormatter={(value: string) => formatBucket(value, granularity)}
            minTickGap={48}
          />
          <YAxis
            {...AXIS_PROPS}
            tickFormatter={(value: number) => formatMetric(value, metric)}
            ticks={ticks}
            domain={[0, ticks[ticks.length - 1]]}
            width={52}
          />
          <Tooltip
            cursor={{ stroke: "var(--viz-axis)", strokeWidth: 1 }}
            content={<TrendTooltip granularity={granularity} metric={metric} />}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke={SERIES_COLORS[0]}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            fill={SERIES_COLORS[0]}
            fillOpacity={0.1}
            dot={false}
            activeDot={{ r: 4, stroke: "var(--viz-surface)", strokeWidth: 2 }}
            {...NO_ANIMATION}
          />
          {last && (
            <ReferenceDot
              x={last.bucket}
              y={lastValue}
              r={4}
              fill={SERIES_COLORS[0]}
              stroke="var(--viz-surface)"
              strokeWidth={2}
              label={{
                value: formatMetric(lastValue, metric),
                position: "right",
                fill: INK,
                fontSize: 11,
                offset: 8,
              }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
