"use client";

import { Attachment, ToolInvocation } from "ai";
import { motion } from "framer-motion";
import { ReactNode } from "react";
import { Streamdown } from "streamdown";

import { BotIcon, UserIcon } from "./icons";
import { PreviewAttachment } from "./preview-attachment";
import { DynamicForm } from "./dynamic-form";

const isFormSubmissionMessage = (role: string, content: string | ReactNode) =>
  role === "user" && typeof content === "string" && content.startsWith("Form submitted: ");

export const Message = ({
  chatId,
  role,
  content,
  toolInvocations,
  attachments,
  onFormSubmit,
}: {
  chatId: string;
  role: string;
  content: string | ReactNode;
  toolInvocations: Array<ToolInvocation> | undefined;
  attachments?: Array<Attachment>;
  onFormSubmit?: (content: string) => void;
}) => {
  if (isFormSubmissionMessage(role, content)) return null;

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
        {content && typeof content === "string" && (
          <div className="text-zinc-800 dark:text-zinc-300 flex flex-col gap-4">
            <Streamdown>{content}</Streamdown>
          </div>
        )}

        {toolInvocations && (
          <div className="flex flex-col gap-4">
            {toolInvocations.map((toolInvocation) => {
              const { toolName, toolCallId, state } = toolInvocation;

              if (state === "result") {
                const { result } = toolInvocation;

                return (
                  <div key={toolCallId}>
                    {toolName === "renderForm" ? (
                      result.__skipRender ? null : (
                        <DynamicForm
                          fields={result.fields}
                          title={result.title}
                          icon={result.icon}
                          accentColor={result.accentColor}
                          submitLabel={result.submitLabel}
                          onSubmit={(values) => {
                            const text = Object.entries(values)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(", ");
                            onFormSubmit?.(`Form submitted: ${text}`);
                          }}
                        />
                      )
                    ) : (
                      <div>{JSON.stringify(result, null, 2)}</div>
                    )}
                  </div>
                );
              } else {
                return (
                  <div key={toolCallId} className="skeleton">
                    {toolName === "renderForm" ? (
                      <div className="h-24 w-full max-w-md rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/50 animate-pulse" />
                    ) : null}
                  </div>
                );
              }
            })}
          </div>
        )}

        {attachments && (
          <div className="flex flex-row gap-2">
            {attachments.map((attachment) => (
              <PreviewAttachment key={attachment.url} attachment={attachment} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
