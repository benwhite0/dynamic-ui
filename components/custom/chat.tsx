"use client";

import { Attachment, Message } from "ai";
import { useChat } from "ai/react";
import { useState } from "react";
import { X, ExternalLink } from "lucide-react";

import { Message as PreviewMessage } from "@/components/custom/message";
import { useScrollToBottom } from "@/components/custom/use-scroll-to-bottom";

import { MultimodalInput } from "./multimodal-input";
import { Overview } from "./overview";

export function Chat({
  id,
  initialMessages,
}: {
  id: string;
  initialMessages: Array<Message>;
}) {
  const { messages, handleSubmit, input, setInput, append, isLoading, stop } =
    useChat({
      id,
      body: { id },
      initialMessages,
      maxSteps: 5,
      onFinish: () => {
        window.history.replaceState({}, "", `/chat/${id}`);
      },
    });

  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const [openWebsiteUrl, setOpenWebsiteUrl] = useState<string | null>(null);

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
            role={message.role}
            content={message.content}
            attachments={message.experimental_attachments}
            toolInvocations={message.toolInvocations}
            onFormSubmit={(content) => append({ role: "user", content })}
            onWebsiteOpen={(url) => setOpenWebsiteUrl(url)}
          />
        ))}

        <div
          ref={messagesEndRef}
          className="shrink-0 min-w-[24px] min-h-[24px]"
        />
      </div>

      <form className="flex flex-row gap-2 relative items-end w-full md:max-w-[500px] max-w-[calc(100dvw-32px) px-4 md:px-0 shrink-0">
        <MultimodalInput
          input={input}
          setInput={setInput}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
          stop={stop}
          attachments={attachments}
          setAttachments={setAttachments}
          messages={messages}
          append={append}
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
