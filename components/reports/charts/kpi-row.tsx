import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import { SERIES_COLORS } from "./chart-kit";

import type { Delta, Stat } from "@/lib/reports/types";

export type { Stat };

/**
 * 12-point sparkline, hand-rolled rather than another chart instance: at this
 * size a chart library's axes and container cost more than they add. Recessive
 * line, accent dot on the latest point.
 */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;

  const recent = values.slice(-12);
  const min = Math.min(...recent);
  const max = Math.max(...recent);
  const span = max - min || 1;

  const points = recent.map((value, index) => ({
    x: (index / (recent.length - 1)) * 100,
    y: 28 - ((value - min) / span) * 24,
  }));

  const toPath = (subset: typeof points) =>
    subset
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
      )
      .join(" ");

  // The line stretches to fill its tile, so only strokes are drawn — a circle
  // end-marker would be squashed into an ellipse by the non-uniform scale.
  // The latest period is picked out by accenting the final segment instead.
  return (
    <svg
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      aria-hidden
      className="h-8 w-full overflow-visible"
    >
      <path
        d={toPath(points)}
        fill="none"
        stroke="var(--viz-muted)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={toPath(points.slice(-2))}
        fill="none"
        stroke={SERIES_COLORS[0]}
        strokeWidth={2}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * Direction paired with an icon and a named comparison period, so the change
 * never rests on colour alone. `upIsGood` is explicit because it flips per
 * metric — rising spend is bad, rising cache hit rate is good.
 */
function DeltaBadge({
  delta,
  comparison,
  upIsGood,
}: {
  delta: Delta;
  comparison: string;
  upIsGood: boolean;
}) {
  const isGood = delta.direction === "flat" || (delta.direction === "up") === upIsGood;
  const Icon =
    delta.direction === "up" ? ArrowUp : delta.direction === "down" ? ArrowDown : Minus;

  return (
    <p className="flex items-center gap-1 text-xs">
      <Icon
        aria-hidden
        className="size-3 shrink-0"
        style={{
          color:
            delta.direction === "flat"
              ? "var(--viz-muted)"
              : isGood
                ? "var(--viz-good)"
                : "var(--viz-bad)",
        }}
      />
      <span
        className="font-medium"
        style={{
          color:
            delta.direction === "flat"
              ? "var(--viz-muted)"
              : isGood
                ? "var(--viz-good)"
                : "var(--viz-bad)",
        }}
      >
        {delta.label}
      </span>
      <span className="text-muted-foreground">{comparison}</span>
    </p>
  );
}

/**
 * The number is the chart. A single value with a trend belongs in a stat tile,
 * not a one-bar bar chart. Figures stay proportional — tabular digits make a
 * large standalone number look loose.
 */
export function StatTile({ stat, hero = false }: { stat: Stat; hero?: boolean }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{stat.label}</p>
      <p
        className={`font-semibold leading-none text-foreground ${
          hero ? "text-5xl" : "text-2xl"
        }`}
      >
        {stat.value}
      </p>
      {stat.delta && (
        <DeltaBadge
          delta={stat.delta}
          comparison={stat.comparison ?? ""}
          upIsGood={stat.upIsGood ?? false}
        />
      )}
      {stat.trend && stat.trend.length > 1 && (
        <div className="mt-1">
          <Sparkline values={stat.trend} />
        </div>
      )}
    </div>
  );
}

/** Exactly one hero per view — the first tile. */
export function KpiRow({ stats }: { stats: Stat[] }) {
  const [hero, ...rest] = stats;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="sm:col-span-2 lg:col-span-1">
        <StatTile stat={hero} hero />
      </div>
      {rest.map((stat) => (
        <StatTile key={stat.label} stat={stat} />
      ))}
    </div>
  );
}
