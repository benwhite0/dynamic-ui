"use client";

import { UIMessage } from "ai";
import { motion } from "framer-motion";
import { Streamdown } from "streamdown";

import { DynamicCard } from "./dynamic-card";
import { DynamicForm } from "./dynamic-form";
import { BotIcon, UserIcon } from "./icons";
import { PreviewAttachment } from "./preview-attachment";
import { SearchWidget } from "./search-widget";
import { WebsiteSuggestionsWidget } from "./website-suggestions-widget";

const CARD_TOOLS = [
  "getHolidays",
  "createTicket",
  "getTickets",
  "updateTicket",
  "deleteTicket",
];

function messageText(message: UIMessage) {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

function ToolResult({
  toolName,
  input,
  output,
  onFormSubmit,
  onWebsiteOpen,
}: {
  toolName: string;
  input: any;
  output: any;
  onFormSubmit?: (content: string) => void;
  onWebsiteOpen?: (url: string) => void;
}) {
  if (output?.__skipRender) return null;

  if (toolName === "renderForm") {
    return (
      <DynamicForm
        fields={output.fields}
        variant={output.variant}
        submitLabel={output.submitLabel}
        onSubmit={(values) => {
          const text = Object.entries(values)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ");
          onFormSubmit?.(`Form submitted: ${text}`);
        }}
      />
    );
  }

  if (toolName === "renderCard" || CARD_TOOLS.includes(toolName)) {
    return (
      <DynamicCard
        variant={output.variant}
        title={output.title}
        subtitle={output.subtitle}
        icon={output.icon}
        blocks={output.blocks}
        footer={output.footer}
        sourceTitle={output.sourceTitle}
        sourceUrl={output.sourceUrl}
      />
    );
  }

  if (toolName === "searchWeb") {
    return (
      <div className="flex flex-col gap-1">
        <div className="text-xs text-muted-foreground italic">
          Searched the web:
        </div>
        <SearchWidget
          query={input?.query ?? ""}
          summary={output.summary ?? ""}
          results={output.results ?? []}
        />
      </div>
    );
  }

  if (toolName === "suggestWebsites") {
    return (
      <WebsiteSuggestionsWidget
        task={output.task ?? input?.task ?? ""}
        websites={output.websites ?? []}
        message={output.message}
        onWebsiteOpen={onWebsiteOpen}
      />
    );
  }

  // Generic fallback (e.g. MCP tools): collapsed raw result, model narrates it.
  return (
    <details className="text-xs text-muted-foreground max-w-md">
      <summary className="cursor-pointer italic">Used {toolName}</summary>
      <pre className="mt-1 p-2 rounded-md bg-muted overflow-x-auto whitespace-pre-wrap break-all">
        {JSON.stringify(output, null, 2)}
      </pre>
    </details>
  );
}

function ToolSkeleton({ toolName }: { toolName: string }) {
  if (toolName === "renderForm") {
    return (
      <div className="h-24 w-full max-w-md rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/50 animate-pulse" />
    );
  }
  if (toolName === "renderCard" || CARD_TOOLS.includes(toolName)) {
    return (
      <div className="h-32 w-full max-w-md rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/50 animate-pulse" />
    );
  }
  if (toolName === "searchWeb") {
    return (
      <div className="text-xs text-muted-foreground italic">
        Searching the web...
      </div>
    );
  }
  if (toolName === "suggestWebsites") {
    return (
      <div className="text-xs text-muted-foreground italic">
        Finding top websites...
      </div>
    );
  }
  return (
    <div className="text-xs text-muted-foreground italic">
      Running {toolName}...
    </div>
  );
}

export const Message = ({
  chatId,
  message,
  onFormSubmit,
  onWebsiteOpen,
}: {
  chatId: string;
  message: UIMessage;
  onFormSubmit?: (content: string) => void;
  onWebsiteOpen?: (url: string) => void;
}) => {
  const { role, parts } = message;

  if (role === "user" && messageText(message).startsWith("Form submitted: "))
    return null;

  return (
    <motion.div
      className={`flex flex-row gap-4 px-4 w-full md:w-[500px] md:px-0 first-of-type:pt-20`}
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div className="size-[24px] border rounded-sm p-1 flex flex-col justify-center items-center shrink-0 text-zinc-500">
        {role === "assistant" ? <BotIcon /> : <UserIcon />}
      </div>

      <div className="flex flex-col gap-2 w-full">
        {parts.map((part, index) => {
          if (part.type === "text" && part.text) {
            return (
              <div
                key={index}
                className="text-zinc-800 dark:text-zinc-300 flex flex-col gap-4"
              >
                <Streamdown>{part.text}</Streamdown>
              </div>
            );
          }

          if (part.type === "file") {
            return (
              <div key={index} className="flex flex-row gap-2">
                <PreviewAttachment
                  attachment={{
                    url: part.url,
                    name: part.filename,
                    contentType: part.mediaType,
                  }}
                />
              </div>
            );
          }

          // MCP tools stream as "dynamic-tool" parts (name known only at runtime).
          if (part.type.startsWith("tool-") || part.type === "dynamic-tool") {
            const toolPart = part as any;
            const toolName =
              part.type === "dynamic-tool"
                ? toolPart.toolName
                : part.type.slice("tool-".length);

            if (toolPart.state === "output-available") {
              return (
                <div key={toolPart.toolCallId ?? index}>
                  <ToolResult
                    toolName={toolName}
                    input={toolPart.input}
                    output={toolPart.output}
                    onFormSubmit={onFormSubmit}
                    onWebsiteOpen={onWebsiteOpen}
                  />
                </div>
              );
            }

            if (toolPart.state === "output-error") {
              return (
                <div
                  key={toolPart.toolCallId ?? index}
                  className="text-xs text-red-500"
                >
                  Something went wrong running {toolName}.
                </div>
              );
            }

            return (
              <div key={toolPart.toolCallId ?? index} className="skeleton">
                <ToolSkeleton toolName={toolName} />
              </div>
            );
          }

          return null;
        })}
      </div>
    </motion.div>
  );
};
