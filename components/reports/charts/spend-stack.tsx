"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  formatBucket,
  formatCurrency,
  formatMetricExact,
  niceTicks,
} from "@/lib/reports/format";

import {
  AXIS_PROPS,
  ChartCard,
  GRID_PROPS,
  NO_ANIMATION,
  SURFACE_GAP,
  TooltipCard,
  colorScale,
  toChartData,
} from "./chart-kit";

import type { Bucket, Metric, TimeSeries } from "@/lib/reports/types";

type TooltipEntry = { dataKey?: string | number; value?: number };

function StackTooltip({
  active,
  payload,
  label,
  granularity,
  metric,
  color,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  granularity: Bucket;
  metric: Metric;
  color: (key: string) => string;
}) {
  if (!active || !payload?.length || !label) return null;

  const total = payload.reduce((sum, entry) => sum + (entry.value ?? 0), 0);

  return (
    <TooltipCard
      label={`${formatBucket(label, granularity)} · ${formatMetricExact(total, metric)}`}
      rows={[...payload]
        .reverse()
        .filter((entry) => (entry.value ?? 0) > 0)
        .map((entry) => ({
          key: String(entry.dataKey),
          color: color(String(entry.dataKey)),
          value: formatMetricExact(entry.value ?? 0, metric),
        }))}
    />
  );
}

/**
 * Part-to-whole over time. Columns cap at 24px so the band keeps some air, and
 * a 2px surface-coloured stroke supplies the gap between segments — the gap is
 * what separates them, not a drawn border. Only the top segment is rounded, so
 * the stack still grows from a single flat baseline.
 */
export function SpendStack({
  series,
  granularity = "week",
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
  const { seriesKeys } = series;
  const color = colorScale(seriesKeys);

  // Painted bottom-to-top, so the last key drawn is the visual top of the stack.
  const stackOrder = [...seriesKeys].reverse();

  const ticks = niceTicks(
    Math.max(
      ...series.points.map((point) =>
        Object.values(point.values).reduce((sum, value) => sum + value, 0),
      ),
      0,
    ),
  );

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      height={280}
      legend={seriesKeys.map((key) => ({ key, color: color(key) }))}
      table={{
        columns: ["Period", ...seriesKeys],
        rows: data.map((row) => [
          formatBucket(row.bucket, granularity),
          ...seriesKeys.map((key) => formatMetricExact(Number(row[key] ?? 0), metric)),
        ]),
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis
            {...AXIS_PROPS}
            dataKey="bucket"
            tickFormatter={(value: string) => formatBucket(value, granularity)}
            minTickGap={24}
          />
          <YAxis
            {...AXIS_PROPS}
            tickFormatter={formatCurrency}
            ticks={ticks}
            domain={[0, ticks[ticks.length - 1]]}
            width={52}
          />
          <Tooltip
            cursor={{ fill: "var(--viz-grid)", fillOpacity: 0.4 }}
            content={
              <StackTooltip granularity={granularity} metric={metric} color={color} />
            }
          />
          {stackOrder.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="spend"
              fill={color(key)}
              maxBarSize={24}
              {...SURFACE_GAP}
              {...NO_ANIMATION}
              radius={index === stackOrder.length - 1 ? [4, 4, 0, 0] : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
