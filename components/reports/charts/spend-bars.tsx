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

import { formatMetric, formatMetricExact } from "@/lib/reports/format";

import {
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
 *
 * Category names sit *above* their bar rather than in a left-hand axis gutter.
 * A gutter has to be a fixed width, and Recharts right-aligns tick text inside
 * it, so anything longer is clipped from the start — `x_IamPrincipal` values
 * like `cortex-teams-bot-generate-summary-prod` or a 32-char key id read as
 * `enerate-summary-prod`. Widening the gutter only moves the cliff and takes
 * the width straight out of the bars; above the bar, a name has the whole card.
 */
/** Row pitch: one line for the name, one for the bar, plus breathing room. */
const ROW_HEIGHT = 52;

/** Bar thickness. Leaves the name clear space above its own bar. */
const BAR_SIZE = 20;

/**
 * The category name, drawn at the bar's own origin so it is left-aligned with
 * the bar it labels and free to run the full width of the card.
 */
function CategoryLabel({ x, y, value }: { x?: number; y?: number; value?: unknown }) {
  return (
    <text x={Number(x ?? 0)} y={Number(y ?? 0) - 8} fill={INK} fontSize={11}>
      {String(value ?? "")}
    </text>
  );
}

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
      height={Math.max(160, ordered.length * ROW_HEIGHT)}
      table={{
        columns: ["Category", "Spend"],
        rows: ordered.map((entry) => [entry.key, formatMetricExact(entry.value, metric)]),
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={ordered}
          layout="vertical"
          margin={{ top: 14, right: 56, bottom: 0, left: 2 }}
        >
          <XAxis type="number" hide />
          {/* Hidden, not removed: the band scale still positions the bars. */}
          <YAxis type="category" dataKey="key" hide />
          <Tooltip
            cursor={{ fill: "var(--viz-grid)", fillOpacity: 0.4 }}
            content={<RankTooltip metric={metric} />}
          />
          <Bar
            dataKey="value"
            fill={SERIES_COLORS[0]}
            maxBarSize={BAR_SIZE}
            radius={[0, 4, 4, 0]}
            {...NO_ANIMATION}
          >
            <LabelList dataKey="key" content={<CategoryLabel />} />
            <LabelList
              dataKey="value"
              position="right"
              offset={8}
              fill={INK}
              fontSize={11}
              formatter={(value: unknown) => formatMetric(Number(value), metric)}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
