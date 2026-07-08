import { generateId, UIMessage } from "ai";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { Chat } from "@/db/schema";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ApplicationError extends Error {
  info: string;
  status: number;
}

export const fetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    const error = new Error(
      "An error occurred while fetching the data.",
    ) as ApplicationError;

    error.info = await res.json();
    error.status = res.status;

    throw error;
  }

  return res.json();
};

export function getLocalStorage(key: string) {
  if (typeof window !== "undefined") {
    return JSON.parse(localStorage.getItem(key) || "[]");
  }
  return [];
}

export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Legacy CoreMessage shape stored by the pre-v5 app.
type LegacyContentPart = {
  type: string;
  text?: string;
  toolCallId?: string;
  toolName?: string;
  args?: unknown;
  result?: unknown;
};
type LegacyMessage = {
  role: string;
  content: string | Array<LegacyContentPart>;
  parts?: unknown;
};

// Converts stored chat messages to v5 UIMessages. Chats saved by the v5 app
// are already UIMessages (they have `parts`) and pass through untouched;
// pre-v5 chats stored CoreMessages and are converted, including tool results.
export function convertToUIMessages(messages: Array<unknown>): Array<UIMessage> {
  if (messages.length === 0) return [];
  if ((messages[0] as LegacyMessage).parts) return messages as Array<UIMessage>;

  const uiMessages: Array<UIMessage> = [];

  for (const raw of messages as Array<LegacyMessage>) {
    if (raw.role === "tool") {
      // Attach each tool result to its matching tool part on a prior message.
      for (const part of Array.isArray(raw.content) ? raw.content : []) {
        if (part.type !== "tool-result") continue;
        for (const m of uiMessages) {
          for (const p of m.parts as Array<any>) {
            if (p.toolCallId === part.toolCallId) {
              p.state = "output-available";
              p.output = part.result;
            }
          }
        }
      }
      continue;
    }

    const parts: Array<any> = [];

    if (typeof raw.content === "string") {
      if (raw.content) parts.push({ type: "text", text: raw.content });
    } else if (Array.isArray(raw.content)) {
      for (const part of raw.content) {
        if (part.type === "text" && part.text) {
          parts.push({ type: "text", text: part.text });
        } else if (part.type === "tool-call") {
          parts.push({
            type: `tool-${part.toolName}`,
            toolCallId: part.toolCallId,
            state: "input-available",
            input: part.args,
          });
        }
      }
    }

    uiMessages.push({
      id: generateId(),
      role: raw.role as UIMessage["role"],
      parts,
    });
  }

  return uiMessages;
}

export function getTitleFromChat(chat: Chat) {
  const messages = convertToUIMessages(chat.messages as Array<unknown>);
  const firstMessage = messages[0];

  if (!firstMessage) {
    return "Untitled";
  }

  const text = firstMessage.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join(" ");

  return text || "Untitled";
}
