"use client";

import * as React from "react";
import { ExternalLink, Globe } from "lucide-react";

type WebsiteResult = {
  title?: string;
  url?: string;
  snippet?: string;
  // Set by the server-side tool when it can detect iframe compatibility.
  embedAllowed?: boolean;
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

  // Take at most 5 for display.
  const limited = websites.slice(0, 5);

  // Split into iframe-capable and card-only, based on the server hint.
  let iframeCandidates = limited.filter(
    (w) => w.url && w.embedAllowed,
  );
  let cardOnly = limited.filter((w) => !w.embedAllowed || !w.url);

  // Fallback: if we don't have enough "iframeAllowed" entries but we do have URLs,
  // still surface up to two that can be opened in the in-chat preview.
  if (onWebsiteOpen && iframeCandidates.length < 2) {
    const needed = 2 - iframeCandidates.length;
    const extras = cardOnly.slice(0, needed);
    iframeCandidates = [...iframeCandidates, ...extras];
    cardOnly = cardOnly.slice(needed);
  }

  iframeCandidates = iframeCandidates.slice(0, 2);
  cardOnly = cardOnly.slice(0, 3);

  const renderDomain = (url?: string) => {
    if (!url) return null;
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  };

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
      {limited.length > 0 ? (
        <div className="space-y-3">
          {iframeCandidates.length > 0 && onWebsiteOpen && (
            <div className="space-y-2">
              <div className="text-[11px] font-medium uppercase tracking-wide text-primary/80">
                Can be previewed in chat
              </div>
              <div className="flex flex-col gap-2">
                {iframeCandidates.map((site, idx) => {
                  const domain = renderDomain(site.url);
                  return (
                    <button
                      key={`iframe-${idx}`}
                      type="button"
                      onClick={() => site.url && onWebsiteOpen(site.url)}
                      className="w-full flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
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
                      <span className="text-[11px] rounded-full bg-primary/10 px-2 py-1 text-primary font-medium shrink-0">
                        Open preview
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {cardOnly.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Other options
              </div>
              <div className="flex flex-col gap-2">
                {cardOnly.map((site, idx) => {
                  const domain = renderDomain(site.url);
                  return (
                    <a
                      key={`card-${idx}`}
                      href={site.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
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
                        {site.snippet && (
                          <div className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                            {site.snippet}
                          </div>
                        )}
                      </div>
                      <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border-l-4 border-amber-500/60 bg-muted/40 px-3 py-2 text-sm text-foreground">
          {message ?? "No websites were found for this task."}
        </div>
      )}
    </div>
  );
}
