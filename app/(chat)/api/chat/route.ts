import { convertToCoreMessages, Message, streamText } from "ai";
import { z } from "zod";

import { geminiProModel } from "@/ai";
import { auth } from "@/app/(auth)/auth";
import { deleteChatById, getChatById, saveChat } from "@/db/queries";

export async function POST(request: Request) {
  const { id, messages }: { id: string; messages: Array<Message> } =
    await request.json();

  const session = await auth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const coreMessages = convertToCoreMessages(messages).filter(
    (message) => message.content.length > 0,
  );

  const lastUserMsg = messages.filter((m) => m.role === "user").pop();
  const lastContent =
    typeof lastUserMsg?.content === "string"
      ? lastUserMsg.content
      : Array.isArray(lastUserMsg?.content)
        ? (lastUserMsg?.content as Array<{ type: string; text?: string }>)
            ?.find((p) => p.type === "text")
            ?.text ?? ""
        : "";
  const isFormSubmission =
    typeof lastContent === "string" && lastContent.startsWith("Form submitted:");

  let renderFormCallCount = 0;

  const result = await streamText({
    model: geminiProModel,
    maxSteps: 1,
    system: `You help users by creating dynamic, beautifully styled forms for structured input.
Keep responses to one sentence. DO NOT output lists. After a tool call, reply with a short phrase and wait.

VARIANT SELECTION — pick the best match for user intent:
  "email"    → composing / sending emails or messages (Gmail-like compose UI)
  "feedback" → reviews, ratings, satisfaction (warm card with emoji & star support)
  "payment"  → payments, checkout, billing (secure card-style)
  "support"  → help requests, bug reports, tickets (ticket-style with priority)
  "survey"   → polls, questionnaires, quizzes (clean survey layout)
  "rsvp"     → event attendance, invitations (elegant event card)
  "default"  → anything that doesn't fit above

FIELD TYPES:
  text, email, number, password — standard inputs
  textarea — multi-line text
  choice   — selectable button group; MUST include options (e.g. ["😍","😊","😐","😕","😢"] or ["Low","Medium","High","Urgent"])
  select   — dropdown; MUST include options
  rating   — 1–5 star rating (great for satisfaction / quality scores)

Use id (short key), label (display text), type, options (required for choice/select), placeholder (optional hint).
Set submitLabel to match the action (Send, Pay, Submit Feedback, Confirm RSVP, etc.).
Call renderForm AT MOST ONCE per request.

EXAMPLES:
  "send an email" → variant "email", fields: to (email), subject (text, placeholder "Subject"), body (textarea), submitLabel "Send"
  "leave feedback" → variant "feedback", fields: satisfaction (choice, options ["😍","😊","😐","😕","😢"]), rating (rating), comments (textarea, placeholder "Tell us more…"), submitLabel "Submit Feedback"
  "make a payment" → variant "payment", fields: cardholder (text), cardNumber (text, placeholder "1234 5678 9012 3456"), expiry (text, placeholder "MM/YY"), cvv (password), submitLabel "Pay Securely"
  "submit a support ticket" → variant "support", fields: priority (choice, options ["Low","Medium","High","Urgent"]), category (select, options ["Technical","Billing","Account","Other"]), subject (text), description (textarea), submitLabel "Submit Ticket"
  "take a survey" → variant "survey", fields: one or more questions as choice fields with answer options, optional textarea for comments, submitLabel "Submit"
  "rsvp to party" → variant "rsvp", fields: attendance (choice, options ["🎉 Going","🤔 Maybe","😔 Can't make it"]), name (text), email (email), dietary (select, options ["No restrictions","Vegetarian","Vegan","Gluten-free","Other"]), submitLabel "Confirm RSVP"

CRITICAL: When the latest user message starts with "Form submitted:" do NOT call renderForm or any tool. Reply with ONLY a short confirmation (e.g. "Email sent.", "Payment processed.", "Feedback received.", "Ticket created.", "RSVP confirmed.").`,
    messages: coreMessages,
    tools: {
      renderForm: {
        description:
          "Render a styled dynamic form in the chat. Choose the best variant and infer fields from the user's goal. Do not wait for the user to specify fields—reason from context.",
        parameters: z.object({
          variant: z
            .enum(["default", "email", "feedback", "payment", "support", "survey", "rsvp"])
            .optional()
            .describe("Visual style variant matching the form's purpose"),
          fields: z.array(
            z.object({
              id: z.string().describe("Short field key"),
              label: z.string().describe("Label shown above the input"),
              type: z
                .enum(["text", "email", "number", "textarea", "password", "choice", "select", "rating"])
                .describe("Input type"),
              options: z
                .array(z.string())
                .optional()
                .describe("Options for choice or select fields"),
              placeholder: z.string().optional().describe("Placeholder hint text"),
            })
          ),
          submitLabel: z.string().optional().describe("Button text, e.g. Send, Pay, Submit"),
        }),
        execute: async ({ variant, fields, submitLabel }) => {
          renderFormCallCount += 1;
          if (renderFormCallCount > 1 || isFormSubmission) {
            return { __skipRender: true, variant: "default", fields: [], submitLabel: "Submit" };
          }
          return { variant: variant ?? "default", fields, submitLabel: submitLabel ?? "Submit" };
        },
      },
    },
    onFinish: async ({ responseMessages }) => {
      if (session.user && session.user.id) {
        try {
          await saveChat({
            id,
            messages: [...coreMessages, ...responseMessages],
            userId: session.user.id,
          });
        } catch (error) {
          console.error("Failed to save chat");
        }
      }
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: "stream-text",
    },
  });

  return result.toDataStreamResponse({});
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Not Found", { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    await deleteChatById({ id });

    return new Response("Chat deleted", { status: 200 });
  } catch (error) {
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}
