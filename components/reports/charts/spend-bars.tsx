"use client";

import {
  Bar,
  BarChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency, formatMetricExact } from "@/lib/reports/format";

import {
  AXIS_PROPS,
  ChartCard,
  INK,
  NO_ANIMATION,
  SERIES_COLORS,
  TooltipCard,
} from "./chart-kit";

import type { CategoryValue, Metric } from "@/lib/reports/types";

type TooltipEntry = { value?: number; payload?: CategoryValue };

function RankTooltip({
  active,
  payload,
  metric,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  metric: Metric;
}) {
  if (!active || !payload?.length) return null;

  const entry = payload[0];

  return (
    <TooltipCard
      label={entry.payload?.key ?? ""}
      rows={[
        {
          key: "Spend",
          color: SERIES_COLORS[0],
          value: formatMetricExact(entry.value ?? 0, metric),
        },
      ]}
    />
  );
}

/**
 * Ranked magnitude across nominal categories, so every bar is one colour —
 * shading by value would double-encode the length the bar already shows and
 * burn the only free channel on nothing. Horizontal because the labels are
 * long. Each value is labelled at the tip, which makes the value axis
 * redundant, so it's dropped rather than repeating the same numbers.
 */
export function SpendBars({
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
  const ordered = [...data].sort((a, b) => b.value - a.value);

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      height={Math.max(160, ordered.length * 40)}
      table={{
        columns: ["Category", "Spend"],
        rows: ordered.map((entry) => [entry.key, formatMetricExact(entry.value, metric)]),
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={ordered}
          layout="vertical"
          margin={{ top: 0, right: 56, bottom: 0, left: 0 }}
        >
          <XAxis type="number" hide />
          <YAxis
            {...AXIS_PROPS}
            type="category"
            dataKey="key"
            width={124}
            axisLine={false}
            tick={{ ...AXIS_PROPS.tick, fill: INK }}
          />
          <Tooltip
            cursor={{ fill: "var(--viz-grid)", fillOpacity: 0.4 }}
            content={<RankTooltip metric={metric} />}
          />
          <Bar
            dataKey="value"
            fill={SERIES_COLORS[0]}
            maxBarSize={24}
            radius={[0, 4, 4, 0]}
            {...NO_ANIMATION}
          >
            <LabelList
              dataKey="value"
              position="right"
              offset={8}
              fill={INK}
              fontSize={11}
              formatter={(value: unknown) => formatCurrency(Number(value))}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
