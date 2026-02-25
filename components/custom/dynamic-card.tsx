"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react";

export type CardVariant =
  | "default"
  | "finance"
  | "weather"
  | "stat"
  | "profile"
  | "info"
  | "warning"
  | "success";

export type CardBlock = {
  type: "metric" | "pair" | "text" | "badges" | "progress" | "list" | "divider";
  label?: string;
  value?: string;
  unit?: string;
  trend?: "up" | "down" | "neutral";
  content?: string;
  labels?: string[];
  items?: string[];
  ordered?: boolean;
  numericValue?: number;
  max?: number;
};

type Theme = {
  card: string;
  headerBg: string;
  title: string;
  subtitle: string;
  metricValue: string;
  metricLabel: string;
  pairLabel: string;
  pairValue: string;
  text: string;
  badge: string;
  progressTrack: string;
  progressBar: string;
  progressLabel: string;
  listItem: string;
  listBullet: string;
  divider: string;
  footer: string;
  sourceLink: string;
  trendUp: string;
  trendDown: string;
  trendNeutral: string;
};

const BASE: Theme = {
  card: "rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm",
  headerBg: "",
  title: "text-zinc-900 dark:text-zinc-100",
  subtitle: "text-zinc-500 dark:text-zinc-400",
  metricValue: "text-zinc-900 dark:text-zinc-100",
  metricLabel: "text-zinc-500 dark:text-zinc-400",
  pairLabel: "text-zinc-500 dark:text-zinc-400",
  pairValue: "text-zinc-900 dark:text-zinc-100",
  text: "text-zinc-700 dark:text-zinc-300",
  badge: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  progressTrack: "bg-zinc-100 dark:bg-zinc-800",
  progressBar: "bg-zinc-900 dark:bg-zinc-100",
  progressLabel: "text-zinc-600 dark:text-zinc-400",
  listItem: "text-zinc-700 dark:text-zinc-300",
  listBullet: "text-zinc-400",
  divider: "border-zinc-200 dark:border-zinc-700",
  footer: "text-zinc-400 dark:text-zinc-500",
  sourceLink: "text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300",
  trendUp: "text-emerald-600 dark:text-emerald-400",
  trendDown: "text-red-600 dark:text-red-400",
  trendNeutral: "text-zinc-400",
};

function getTheme(v: CardVariant): Theme {
  switch (v) {
    case "finance":
      return {
        ...BASE,
        card: "rounded-xl border-0 bg-zinc-900 dark:bg-zinc-950 shadow-xl",
        title: "text-white",
        subtitle: "text-zinc-400",
        metricValue: "text-white font-mono",
        metricLabel: "text-zinc-400",
        pairLabel: "text-zinc-400",
        pairValue: "text-zinc-100 font-mono",
        text: "text-zinc-300",
        badge: "bg-zinc-800 text-zinc-300 border border-zinc-700",
        progressTrack: "bg-zinc-800",
        progressBar: "bg-emerald-500",
        progressLabel: "text-zinc-400",
        listItem: "text-zinc-300",
        listBullet: "text-zinc-600",
        divider: "border-zinc-800",
        footer: "text-zinc-500",
        sourceLink: "text-emerald-400 hover:text-emerald-300",
        trendUp: "text-emerald-400",
        trendDown: "text-red-400",
        trendNeutral: "text-zinc-500",
      };
    case "weather":
      return {
        ...BASE,
        card: "rounded-xl border-0 bg-gradient-to-br from-sky-500 to-blue-600 dark:from-sky-600 dark:to-blue-800 shadow-xl",
        title: "text-white",
        subtitle: "text-sky-100",
        metricValue: "text-white",
        metricLabel: "text-sky-100",
        pairLabel: "text-sky-200",
        pairValue: "text-white",
        text: "text-sky-50",
        badge: "bg-white/20 text-white backdrop-blur-sm",
        progressTrack: "bg-white/20",
        progressBar: "bg-white",
        progressLabel: "text-sky-100",
        listItem: "text-sky-50",
        listBullet: "text-sky-200",
        divider: "border-white/20",
        footer: "text-sky-200",
        sourceLink: "text-white underline hover:text-sky-100",
        trendUp: "text-yellow-300",
        trendDown: "text-sky-200",
        trendNeutral: "text-sky-200",
      };
    case "stat":
      return {
        ...BASE,
        card: "rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-white dark:bg-zinc-900 shadow-lg",
        metricValue: "text-indigo-600 dark:text-indigo-400",
        badge: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
        progressBar: "bg-indigo-600 dark:bg-indigo-400",
        sourceLink: "text-indigo-600 dark:text-indigo-400",
      };
    case "profile":
      return {
        ...BASE,
        card: "rounded-xl border-0 overflow-hidden bg-white dark:bg-zinc-900 shadow-xl",
        headerBg: "bg-gradient-to-r from-violet-600 to-purple-600",
        title: "text-white",
        subtitle: "text-violet-200",
        badge: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
        progressBar: "bg-violet-600 dark:bg-violet-400",
        sourceLink: "text-violet-600 dark:text-violet-400",
      };
    case "info":
      return {
        ...BASE,
        card: "rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/30 dark:bg-blue-950/10 shadow-lg",
        badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
        progressBar: "bg-blue-600 dark:bg-blue-400",
      };
    case "warning":
      return {
        ...BASE,
        card: "rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/10 shadow-lg",
        metricValue: "text-amber-700 dark:text-amber-400",
        badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
        progressBar: "bg-amber-500",
        sourceLink: "text-amber-700 dark:text-amber-400",
      };
    case "success":
      return {
        ...BASE,
        card: "rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/10 shadow-lg",
        metricValue: "text-emerald-700 dark:text-emerald-400",
        badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
        progressBar: "bg-emerald-500",
        sourceLink: "text-emerald-700 dark:text-emerald-400",
      };
    default:
      return BASE;
  }
}

function BlockRenderer({ block, theme }: { block: CardBlock; theme: Theme }) {
  switch (block.type) {
    case "metric":
      return (
        <div>
          {block.label && (
            <div className={`text-xs font-medium uppercase tracking-wide mb-1 ${theme.metricLabel}`}>
              {block.label}
            </div>
          )}
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold tracking-tight ${theme.metricValue}`}>
              {block.value}
            </span>
            {block.unit && (
              <span className={`text-lg font-medium ${theme.metricLabel}`}>{block.unit}</span>
            )}
            {block.trend && (
              <span
                className={`flex items-center gap-0.5 text-sm font-medium ${
                  block.trend === "up"
                    ? theme.trendUp
                    : block.trend === "down"
                      ? theme.trendDown
                      : theme.trendNeutral
                }`}
              >
                {block.trend === "up" && <TrendingUp className="size-4" />}
                {block.trend === "down" && <TrendingDown className="size-4" />}
                {block.trend === "neutral" && <Minus className="size-4" />}
              </span>
            )}
          </div>
        </div>
      );

    case "pair":
      return (
        <div className="flex items-center justify-between py-0.5">
          <span className={`text-sm ${theme.pairLabel}`}>{block.label}</span>
          <span className={`text-sm font-medium ${theme.pairValue}`}>{block.value}</span>
        </div>
      );

    case "text":
      return <p className={`text-sm leading-relaxed ${theme.text}`}>{block.content}</p>;

    case "badges":
      return (
        <div className="flex flex-wrap gap-1.5">
          {(block.labels ?? []).map((lbl) => (
            <span
              key={lbl}
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${theme.badge}`}
            >
              {lbl}
            </span>
          ))}
        </div>
      );

    case "progress": {
      const max = block.max ?? 100;
      const pct = Math.min(100, Math.max(0, ((block.numericValue ?? 0) / max) * 100));
      return (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-medium ${theme.progressLabel}`}>{block.label}</span>
            <span className={`text-xs font-medium ${theme.progressLabel}`}>
              {block.numericValue ?? 0}/{max}
            </span>
          </div>
          <div className={`h-2 rounded-full overflow-hidden ${theme.progressTrack}`}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full ${theme.progressBar}`}
            />
          </div>
        </div>
      );
    }

    case "list":
      return (
        <div className="space-y-1">
          {(block.items ?? []).map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className={`text-sm leading-relaxed shrink-0 ${theme.listBullet}`}>
                {block.ordered ? `${i + 1}.` : "•"}
              </span>
              <span className={`text-sm leading-relaxed ${theme.listItem}`}>{item}</span>
            </div>
          ))}
        </div>
      );

    case "divider":
      return <hr className={`border-t ${theme.divider}`} />;

    default:
      return null;
  }
}

export function DynamicCard({
  variant = "default",
  title,
  subtitle,
  icon,
  blocks,
  footer,
  sourceTitle,
  sourceUrl,
}: {
  variant?: CardVariant;
  title: string;
  subtitle?: string;
  icon?: string;
  blocks: CardBlock[];
  footer?: string;
  sourceTitle?: string;
  sourceUrl?: string;
}) {
  const t = getTheme(variant);
  const hasGradientHeader = variant === "profile";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`w-full max-w-md ${t.card}`}
    >
      {hasGradientHeader ? (
        <div className={`px-5 py-4 ${t.headerBg}`}>
          <div className="flex items-center gap-2.5">
            {icon && <span className="text-2xl">{icon}</span>}
            <div>
              <h3 className={`font-semibold text-base ${t.title}`}>{title}</h3>
              {subtitle && <p className={`text-xs mt-0.5 ${t.subtitle}`}>{subtitle}</p>}
            </div>
          </div>
        </div>
      ) : (
        <div className="px-5 pt-4 pb-1">
          <div className="flex items-center gap-2.5">
            {icon && <span className="text-xl">{icon}</span>}
            <div>
              <h3 className={`font-semibold text-base ${t.title}`}>{title}</h3>
              {subtitle && <p className={`text-xs mt-0.5 ${t.subtitle}`}>{subtitle}</p>}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 px-5 py-3">
        {blocks.map((block, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <BlockRenderer block={block} theme={t} />
          </motion.div>
        ))}
      </div>

      {(footer || sourceUrl) && (
        <div className="px-5 pb-4 flex items-center justify-between gap-2">
          {footer && <span className={`text-xs ${t.footer}`}>{footer}</span>}
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center gap-1 text-xs font-medium ${t.sourceLink}`}
            >
              {sourceTitle || "Source"}
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      )}
    </motion.div>
  );
}
