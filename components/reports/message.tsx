"use client";

import { UIMessage } from "ai";
import { BarChart3, User } from "lucide-react";
import { Streamdown } from "streamdown";

import { SpendChart } from "./spend-chart";
import { SpendDashboard } from "./spend-dashboard";

import type { SpendChartPayload, SpendDashboardPayload } from "@/lib/reports/types";


/** Placeholder while the tool runs, sized so the chart doesn't shift it. */
function ChartSkeleton() {
  return (
    <div className="h-[280px] w-full animate-pulse rounded-xl border border-border bg-muted/40" />
  );
}

/**
 * Renders one message. Only two kinds of part matter in this app: assistant
 * text, and a renderSpendChart result — no forms, files or website previews.
 */
export function ReportsMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  return (
    <div className="flex w-full flex-row gap-3">
      <div className="flex size-6 shrink-0 items-center justify-center rounded-sm border border-border text-muted-foreground">
        {isUser ? <User className="size-3.5" /> : <BarChart3 className="size-3.5" />}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {message.parts.map((part, index) => {
          if (part.type === "text" && part.text) {
            return (
              <div
                key={index}
                className="flex flex-col gap-3 text-sm text-foreground"
              >
                <Streamdown>{part.text}</Streamdown>
              </div>
            );
          }

          if (part.type === "tool-renderSpendChart") {
            // The tool part is loosely typed at the stream boundary; the output
            // shape is the SpendChartPayload union the tool returns.
            const toolPart = part as {
              state: string;
              toolCallId?: string;
              output?: SpendChartPayload;
            };
            const key = toolPart.toolCallId ?? index;

            if (toolPart.state === "output-available" && toolPart.output) {
              return <SpendChart key={key} payload={toolPart.output} />;
            }

            if (toolPart.state === "output-error") {
              return (
                <p key={key} className="text-xs text-muted-foreground">
                  That query failed. Try narrowing the date range or naming a
                  specific model or team.
                </p>
              );
            }

            return <ChartSkeleton key={key} />;
          }

          if (part.type === "tool-renderSpendDashboard") {
            // Same loose typing as the chart tool part — the output shape is
            // the SpendDashboardPayload union the tool returns.
            const toolPart = part as {
              state: string;
              toolCallId?: string;
              output?: SpendDashboardPayload;
            };
            const key = toolPart.toolCallId ?? index;

            if (toolPart.state === "output-available" && toolPart.output) {
              return <SpendDashboard key={key} payload={toolPart.output} />;
            }

            if (toolPart.state === "output-error") {
              return (
                <p key={key} className="text-xs text-muted-foreground">
                  That query failed. Try narrowing the date range or naming a
                  specific model or team.
                </p>
              );
            }

            return <ChartSkeleton key={key} />;
          }

          return null;
        })}
      </div>
    </div>
  );
}
