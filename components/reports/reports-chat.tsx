"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, Square } from "lucide-react";
import { useState } from "react";

import { useScrollToBottom } from "@/components/custom/use-scroll-to-bottom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { ReportsMessage } from "./message";

const EXAMPLES = [
  "Sonnet 5 spend over the last 10 days",
  "Which team spends the most?",
  "How has the model mix changed this quarter?",
  "What did we spend in the last 30 days?",
];

/**
 * The reports chat. Its own transport and its own message renderer, so nothing
 * from the general chat app — attachments, website previews, form submission —
 * is carried along. The column is wider than a normal chat because charts need
 * the room.
 */
export function ReportsChat() {
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/reports/chat" }),
  });

  const isBusy = status === "submitted" || status === "streaming";
  const [containerRef, endRef] = useScrollToBottom<HTMLDivElement>();

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    sendMessage({ text: trimmed });
    setInput("");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center">
      <div ref={containerRef} className="w-full flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col gap-4 pt-8">
              <div>
                <h2 className="text-base font-medium text-foreground">
                  Ask about AI spend
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Every answer is drawn from the spend data — pick one to start.
                </p>
              </div>
              <div className="flex flex-col items-start gap-2">
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => submit(example)}
                    className="rounded-lg border border-border px-3 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <ReportsMessage key={message.id} message={message} />
            ))
          )}
          <div ref={endRef} className="min-h-6 shrink-0" />
        </div>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(input);
        }}
        className="w-full shrink-0 border-t border-border bg-background"
      >
        <div className="mx-auto flex w-full max-w-3xl items-end gap-2 px-4 py-3">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit(input);
              }
            }}
            placeholder="Ask about spend, models, teams or projects…"
            rows={1}
            className="max-h-40 min-h-[40px] resize-none bg-muted text-sm"
          />
          {isBusy ? (
            <Button type="button" onClick={stop} size="icon" variant="secondary">
              <Square className="size-3.5" />
              <span className="sr-only">Stop</span>
            </Button>
          ) : (
            <Button type="submit" size="icon" disabled={!input.trim()}>
              <ArrowUp className="size-4" />
              <span className="sr-only">Send</span>
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
