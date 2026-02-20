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

FORM DESIGN:
You are NOT limited to specific form types. Reason from the user's request and compose whatever fields make sense.
Set title, icon, and accentColor to match the form's purpose.

ACCENT COLORS:
  blue    → communication, professional, general
  amber   → feedback, reviews, warmth
  emerald → payments, success, finance
  red     → support, urgent, medical
  indigo  → surveys, analytics, productivity
  purple  → events, creative, entertainment
  pink    → personal, social, health
  zinc    → minimal, technical, settings

ICONS:
  send, message, card, headphones, clipboard, party, star, lock,
  calendar, user, settings, search, heart, bell, none

FIELD TYPES:
  text          — single-line text
  email         — email address
  tel           — phone number
  url           — web URL
  number        — numeric input (use min/max/step as needed)
  password      — masked text
  textarea      — multi-line text
  date          — date picker
  time          — time picker
  datetime      — date and time picker
  choice        — selectable button group (MUST include options)
  select        — dropdown menu (MUST include options)
  checkboxGroup — multi-select checkboxes (MUST include options)
  checkbox      — single yes/no (renders label inline, no separate label shown)
  toggle        — on/off switch
  slider        — numeric range (use min, max, step)
  rating        — 1–5 star rating
  rank          — reorderable list: user drags to rank options (MUST include options)

Use id (short key), label (display text), type, options (required for choice/select/checkboxGroup/rank),
placeholder (optional hint), min/max/step (for number/slider).
Set submitLabel to match the action (Send, Submit, Book, Apply, etc.).
Call renderForm AT MOST ONCE per request.

EXAMPLES:
  "send an email"         → title "New Message", icon "send", accentColor "blue",
                            fields: to (email), subject (text), body (textarea), submitLabel "Send"
  "leave feedback"        → title "Share Your Feedback", icon "message", accentColor "amber",
                            fields: satisfaction (choice ["😍","😊","😐","😕","😢"]), rating (rating),
                            comments (textarea, placeholder "Tell us more…"), submitLabel "Submit Feedback"
  "make a payment"        → title "Payment Details", icon "card", accentColor "emerald",
                            fields: cardholder (text), cardNumber (text, placeholder "1234 5678 9012 3456"),
                            expiry (text, placeholder "MM/YY"), cvv (password), submitLabel "Pay Securely"
  "submit support ticket" → title "Support Ticket", icon "headphones", accentColor "red",
                            fields: priority (choice ["Low","Medium","High","Urgent"]),
                            category (select ["Technical","Billing","Account","Other"]),
                            subject (text), description (textarea), submitLabel "Submit Ticket"
  "rsvp to an event"      → title "You're Invited", icon "party", accentColor "purple",
                            fields: attendance (choice ["🎉 Going","🤔 Maybe","😔 Can't make it"]),
                            name (text), email (email),
                            dietary (select ["No restrictions","Vegetarian","Vegan","Gluten-free","Other"]),
                            submitLabel "Confirm RSVP"
  "book a restaurant"     → title "Reserve a Table", icon "calendar", accentColor "purple",
                            fields: name (text), email (email), date (date), time (time),
                            guests (number, min 1, max 20), requests (textarea), submitLabel "Book Table"
  "job application"       → title "Job Application", icon "user", accentColor "indigo",
                            fields: name (text), email (email), phone (tel),
                            position (select [...relevant roles...]), startDate (date),
                            coverLetter (textarea), submitLabel "Apply Now"
  "set a reminder"        → title "New Reminder", icon "bell", accentColor "amber",
                            fields: title (text), date (date), time (time),
                            priority (choice ["Low","Normal","High"]), submitLabel "Set Reminder"
  "health check-in"       → title "Daily Check-In", icon "heart", accentColor "pink",
                            fields: mood (choice ["😄","🙂","😐","😔","😢"]),
                            energy (slider, min 1, max 10), sleep (number, min 0, max 24, step 0.5),
                            notes (textarea), submitLabel "Log Check-In"
  "rank project priorities" → title "Project Priorities", icon "clipboard", accentColor "amber",
                            fields: priorities (rank, options ["Ship new features","Fix bugs","Improve performance","Write documentation"]), submitLabel "Submit"

CRITICAL: When the latest user message starts with "Form submitted:" do NOT call renderForm or any tool.
Reply with ONLY a short confirmation (e.g. "Email sent.", "Payment processed.", "Feedback received.").`,
    messages: coreMessages,
    tools: {
      renderForm: {
        description:
          "Render a dynamic form in the chat. Reason about what the user needs and compose the right fields—do not wait for the user to specify them.",
        parameters: z.object({
          title: z.string().optional().describe("Form header title, e.g. 'New Message', 'Job Application'"),
          icon: z
            .enum(["send", "message", "card", "headphones", "clipboard", "party", "star", "lock", "calendar", "user", "settings", "search", "heart", "bell", "none"])
            .optional()
            .describe("Icon shown in the header"),
          accentColor: z
            .enum(["blue", "amber", "emerald", "red", "indigo", "purple", "pink", "zinc"])
            .optional()
            .describe("Accent color for the form theme"),
          fields: z.array(
            z.object({
              id: z.string().describe("Short field key"),
              label: z.string().describe("Label shown above the input"),
              type: z
                .enum([
                  "text", "email", "number", "textarea", "password",
                  "choice", "select", "rating", "rank",
                  "date", "time", "datetime", "tel", "url",
                  "toggle", "slider", "checkbox", "checkboxGroup",
                ])
                .describe("Input type"),
              options: z
                .array(z.string())
                .optional()
                .describe("Options for choice, select, or checkboxGroup fields"),
              placeholder: z.string().optional().describe("Placeholder hint text"),
              min: z.number().optional().describe("Minimum value for number or slider fields"),
              max: z.number().optional().describe("Maximum value for number or slider fields"),
              step: z.number().optional().describe("Step size for number or slider fields"),
            })
          ),
          submitLabel: z.string().optional().describe("Button text, e.g. Send, Pay, Submit"),
        }),
        execute: async ({ title, icon, accentColor, fields, submitLabel }) => {
          renderFormCallCount += 1;
          if (renderFormCallCount > 1 || isFormSubmission) {
            return { __skipRender: true };
          }
          return {
            title: title ?? "",
            icon: icon ?? "none",
            accentColor: accentColor ?? "blue",
            fields,
            submitLabel: submitLabel ?? "Submit",
          };
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
