"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage } from "ai";
import { X, ExternalLink } from "lucide-react";
import { useState } from "react";

import { Message as PreviewMessage } from "@/components/custom/message";
import { useScrollToBottom } from "@/components/custom/use-scroll-to-bottom";

import { MultimodalInput } from "./multimodal-input";
import { Overview } from "./overview";
import { Attachment } from "./preview-attachment";

export function Chat({
  id,
  initialMessages,
}: {
  id: string;
  initialMessages: Array<UIMessage>;
}) {
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, stop } = useChat({
    id,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { id },
    }),
    onFinish: () => {
      window.history.replaceState({}, "", `/chat/${id}`);
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const [openWebsiteUrl, setOpenWebsiteUrl] = useState<string | null>(null);

  const getHostname = (url?: string | null) => {
    if (!url) return null;
    try {
      return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    } catch {
      return null;
    }
  };

  const looksLikePreviewFollowUp = (text: string, url: string) => {
    const t = (text ?? "").trim().toLowerCase();
    if (t.length === 0) return false;

    const hostname = getHostname(url);
    const baseDomain = hostname ? hostname.split(".").slice(-2).join(".") : null;

    if (hostname && (t.includes(hostname) || (baseDomain && t.includes(baseDomain)))) {
      return true;
    }

    // Heuristic cues that the user is referring to the open website/preview.
    const cues = [
      "this site",
      "this website",
      "that site",
      "that website",
      "the site",
      "the website",
      "this page",
      "that page",
      "the page",
      "preview",
      "iframe",
      "left panel",
      "open preview",
      "in the preview",
      "on the website",
      "on the page",
      "use the website",
      "use that site",
      "use this site",
      "continue",
      "next",
      "scroll",
      "click",
      "tap",
      "select",
      "choose",
      "fill",
      "enter",
      "type",
      "search on",
      "filter",
      "sort",
      "checkout",
      "reserve",
      "book now",
      "book it",
    ];

    return cues.some((c) => t.includes(c));
  };

  const submitMessage = () => {
    if (input.trim().length === 0 && attachments.length === 0) return;

    if (openWebsiteUrl && !looksLikePreviewFollowUp(input, openWebsiteUrl)) {
      setOpenWebsiteUrl(null);
    }

    sendMessage({
      text: input,
      files: attachments.map((a) => ({
        type: "file" as const,
        url: a.url,
        mediaType: a.contentType ?? "",
        filename: a.name,
      })),
    });

    setInput("");
    setAttachments([]);
  };

  const chatPanel = (
    <div className="flex flex-col justify-between items-center gap-4 h-full w-full min-w-0">
      <div
        ref={messagesContainerRef}
        className="flex flex-col gap-4 h-full w-full items-center overflow-y-scroll"
      >
        {messages.length === 0 && <Overview />}

        {messages.map((message) => (
          <PreviewMessage
            key={message.id}
            chatId={id}
            message={message}
            onFormSubmit={(content) => sendMessage({ text: content })}
            onWebsiteOpen={(url) => setOpenWebsiteUrl(url)}
          />
        ))}

        <div
          ref={messagesEndRef}
          className="shrink-0 min-w-[24px] min-h-[24px]"
        />
      </div>

      {openWebsiteUrl && (
        <button
          type="button"
          onClick={() => setOpenWebsiteUrl(null)}
          className="text-xs px-2 py-1 rounded-md border border-border text-muted-foreground hover:bg-muted self-end mr-4 md:mr-0"
        >
          Exit preview and return to full chat
        </button>
      )}

      <form className="flex flex-row gap-2 relative items-end w-full md:max-w-[500px] max-w-[calc(100dvw-32px) px-4 md:px-0 shrink-0">
        <MultimodalInput
          input={input}
          setInput={setInput}
          handleSubmit={submitMessage}
          isLoading={isLoading}
          stop={stop}
          attachments={attachments}
          setAttachments={setAttachments}
          messages={messages}
          sendMessage={(text) => sendMessage({ text })}
        />
      </form>
    </div>
  );

  const iframeHeader = (
    <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-muted/30 shrink-0">
      <span className="truncate text-sm text-muted-foreground">
        {openWebsiteUrl}
      </span>
      <div className="flex items-center gap-1 shrink-0">
        <a
          href={openWebsiteUrl!}
          target="_blank"
          rel="noreferrer"
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
          title="Open in new tab"
        >
          <ExternalLink className="size-4" />
        </a>
        <button
          type="button"
          onClick={() => setOpenWebsiteUrl(null)}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
          title="Close"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-row h-dvh bg-background overflow-hidden">
      {/* Desktop: iframe panel on left */}
      {openWebsiteUrl && (
        <div className="hidden md:flex flex-col flex-1 min-w-0 border-r border-border">
          {iframeHeader}
          <iframe
            src={openWebsiteUrl}
            title="Preview"
            className="flex-1 w-full min-h-0 border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      )}
      {/* Mobile: full-screen overlay when website open */}
      {openWebsiteUrl && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-background">
          {iframeHeader}
          <iframe
            src={openWebsiteUrl}
            title="Preview"
            className="flex-1 w-full min-h-0 border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      )}
      <div
        className={`flex flex-row justify-center pb-4 md:pb-8 h-dvh ${
          openWebsiteUrl ? "md:w-[420px] md:min-w-[420px] md:shrink-0 w-full" : "w-full"
        }`}
      >
        {chatPanel}
      </div>
    </div>
  );
}
