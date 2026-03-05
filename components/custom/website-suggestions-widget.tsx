"use client";

import * as React from "react";
import { ExternalLink, Globe } from "lucide-react";

type WebsiteResult = {
  title?: string;
  url?: string;
  snippet?: string;
};

type WebsiteSuggestionsWidgetProps = {
  task: string;
  websites: WebsiteResult[];
  message?: string;
  onWebsiteOpen?: (url: string) => void;
};

export function WebsiteSuggestionsWidget({
  task,
  websites,
  message,
  onWebsiteOpen,
}: WebsiteSuggestionsWidgetProps) {
  const truncatedTask =
    task.length > 80 ? `${task.slice(0, 77).trimEnd()}…` : task;

  return (
    <div className="w-full max-w-md rounded-xl border border-border bg-card p-4 shadow-sm">
      {/* Task header */}
      <div className="mb-4">
        <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
          You want to
        </div>
        <div className="flex items-center gap-2 rounded-full border border-input bg-background px-3 py-1.5 text-xs shadow-inner">
          <div className="size-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Globe className="size-2.5 text-primary" />
          </div>
          <div
            className="truncate text-xs text-foreground"
            title={task}
          >
            {truncatedTask || "Perform a task online"}
          </div>
        </div>
      </div>

      {/* Suggested websites */}
      {websites.length > 0 ? (
        <div className="space-y-2">
          <div className="text-[11px] font-medium uppercase tracking-wide text-primary/80 mb-2">
            Top websites for this task
          </div>
          <div className="flex flex-col gap-2">
            {websites.map((site, idx) => {
              const domain =
                site.url &&
                (() => {
                  try {
                    return new URL(site.url).hostname.replace(/^www\./, "");
                  } catch {
                    return undefined;
                  }
                })();

              const linkClass =
                "flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-left transition-colors hover:bg-muted/50";

              return onWebsiteOpen && site.url ? (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onWebsiteOpen(site.url!)}
                  className={`w-full ${linkClass}`}
                >
                  <div className="min-w-0 flex-1">
                    {site.title && (
                      <div className="truncate text-sm font-medium text-foreground">
                        {site.title}
                      </div>
                    )}
                    {domain && (
                      <div className="text-[11px] text-muted-foreground">
                        {domain}
                      </div>
                    )}
                  </div>
                  <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                </button>
              ) : (
                <a
                  key={idx}
                  href={site.url}
                  target="_blank"
                  rel="noreferrer"
                  className={linkClass}
                >
                  <div className="min-w-0 flex-1">
                    {site.title && (
                      <div className="truncate text-sm font-medium text-foreground">
                        {site.title}
                      </div>
                    )}
                    {domain && (
                      <div className="text-[11px] text-muted-foreground">
                        {domain}
                      </div>
                    )}
                  </div>
                  <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                </a>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border-l-4 border-amber-500/60 bg-muted/40 px-3 py-2 text-sm text-foreground">
          {message ?? "No websites were found for this task."}
        </div>
      )}
    </div>
  );
}
