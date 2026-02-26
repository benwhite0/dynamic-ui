import { convertToCoreMessages, Message, streamText } from "ai";
import { z } from "zod";

import { geminiProModel } from "@/ai";
import { auth } from "@/app/(auth)/auth";
import { deleteChatById, getChatById, saveChat } from "@/db/queries";

import { searchWeb } from "@/lib/tools/search";

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
  let renderCardCallCount = 0;

  const result = await streamText({
    model: geminiProModel,
    maxSteps: 5,
    system: `You help users by creating dynamic, beautifully styled forms AND rich info cards.
Keep text responses to one sentence. DO NOT output lists. After calling renderForm, reply with a short phrase and wait.

CRITICAL: When the latest user message starts with "Form submitted:" do NOT call renderForm or any tool. Reply with ONLY a short confirmation (e.g. "Email sent.", "Payment processed.", "Feedback received.", "Ticket created.", "RSVP confirmed.").

═══════════════════════════════════════
SEARCH — searchWeb (use only when needed)
═══════════════════════════════════════

Reason before calling searchWeb:
  USE searchWeb when the user needs up-to-date or external information: current prices (crypto, stocks, forex), live weather, today's news, recent sports results, breaking events, or anything that changes frequently. When in doubt whether data is current, prefer searching.
  DO NOT use searchWeb when: the user wants a form (e.g. "send an email", "leave feedback") — just call renderForm; the question is simple math or common knowledge (e.g. "what is 2+2?", "capital of France"); or the user is asking for help with the app itself. Answer directly from your knowledge in those cases.

═══════════════════════════════════════
FORMS — renderForm (for structured user input)
═══════════════════════════════════════

VARIANT SELECTION:
  "email"    → composing / sending emails or messages
  "feedback" → reviews, ratings, satisfaction
  "payment"  → payments, checkout, billing
  "support"  → help requests, bug reports, tickets
  "survey"   → polls, questionnaires, quizzes
  "rsvp"     → event attendance, invitations
  "ranking"  → drag and drop ranking
  "default"  → anything else

FIELD TYPES:
  text, email, number, password — standard inputs
  textarea — multi-line text
  choice   — selectable button group; MUST include options
  select   — dropdown; MUST include options
  rating   — 1–5 star rating
  ranking  — drag and drop ranking

Use id (short key), label (display text), type, options (required for choice/select), placeholder (optional hint).
Set submitLabel to match the action. Call renderForm AT MOST ONCE per request.

═══════════════════════════════════════
INFO CARDS — renderCard (only when you used searchWeb)
═══════════════════════════════════════

When you have just called searchWeb and received results, call renderCard to display the key information as a beautiful card. Do not call renderCard if you did not call searchWeb.
Extract structured data from the search answer and compose 2–6 blocks.

CARD VARIANT SELECTION — pick the best match:
  "finance"  → prices, stocks, crypto, market data, currencies (dark card with trend indicators)
  "weather"  → weather conditions, temperature, forecasts (blue gradient)
  "stat"     → single key statistic, population, distance, quantity (big-number card)
  "profile"  → person, company, city, country info (gradient header)
  "info"     → definitions, explanations, how-to, general knowledge (neutral blue tint)
  "warning"  → alerts, advisories, risks, outages (amber tint)
  "success"  → positive news, achievements, records (green tint)
  "default"  → anything else

BLOCK TYPES (compose freely):
  metric   → big prominent number. Fields: label, value, unit (optional), trend "up"/"down"/"neutral" (optional)
  pair     → key-value row. Fields: label, value
  text     → paragraph. Fields: content
  badges   → tag row. Fields: labels (array of strings)
  progress → bar 0–100. Fields: label, numericValue, max (optional, default 100)
  list     → bullet or numbered. Fields: items (array), ordered (optional boolean)
  divider  → horizontal separator (no additional fields)

Set icon to a relevant emoji. Include sourceTitle and sourceUrl from the search result.
Call renderCard AT MOST ONCE per search.

CARD EXAMPLES:
  BTC price → variant "finance", title "Bitcoin", icon "₿", blocks: [metric{label:"Price",value:"$66,100",trend:"up"}, pair{label:"24h Change",value:"+5.2%"}, pair{label:"Market Cap",value:"$1.3T"}], footer "Live data"
  Weather → variant "weather", title "Sheffield, UK", icon "🌤️", blocks: [metric{label:"Temperature",value:"15",unit:"°C"}, pair{label:"Conditions",value:"Partly Cloudy"}, pair{label:"Humidity",value:"72%"}, pair{label:"Wind",value:"12 mph NW"}]
  Person → variant "profile", title "Albert Einstein", subtitle "Physicist", icon "👤", blocks: [text{content:"German-born theoretical physicist..."}, pair{label:"Born",value:"March 14, 1879"}, badges{labels:["Physics","Nobel Prize","Relativity"]}]
  Definition → variant "info", title "Quantum Computing", icon "💡", blocks: [text{content:"..."}, list{items:["Superposition","Entanglement","Qubits"],ordered:false}, badges{labels:["Computer Science","Physics"]}]
  Sports score → variant "success", title "Match Result", icon "⚽", blocks: [metric{label:"Final Score",value:"3 – 1"}, pair{label:"Man City vs Arsenal",value:"Full Time"}, badges{labels:["Premier League","Matchday 12"]}]`,
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
      renderCard: {
        description:
          "Render a beautiful dynamic info card in the chat. Call this AFTER searchWeb to visually display the key information from search results. Choose the best variant and compose blocks.",
        parameters: z.object({
          variant: z
            .enum(["default", "finance", "weather", "stat", "profile", "info", "warning", "success"])
            .optional()
            .describe("Visual style variant matching the content type"),
          title: z.string().describe("Card title"),
          subtitle: z.string().optional().describe("Short subtitle under the title"),
          icon: z.string().optional().describe("Emoji icon for the card header"),
          blocks: z.array(
            z.object({
              type: z
                .enum(["metric", "pair", "text", "badges", "progress", "list", "divider"])
                .describe("Block type"),
              label: z.string().optional().describe("Label for metric/pair/progress"),
              value: z.string().optional().describe("Display value for metric/pair"),
              unit: z.string().optional().describe("Unit suffix for metric (e.g. °C, %)"),
              trend: z
                .enum(["up", "down", "neutral"])
                .optional()
                .describe("Trend direction for metric"),
              content: z.string().optional().describe("Paragraph text for text blocks"),
              labels: z
                .array(z.string())
                .optional()
                .describe("Tag strings for badges"),
              items: z
                .array(z.string())
                .optional()
                .describe("List items for list blocks"),
              ordered: z.boolean().optional().describe("Numbered list if true"),
              numericValue: z.number().optional().describe("Numeric value for progress bar"),
              max: z.number().optional().describe("Max value for progress bar (default 100)"),
            })
          ),
          footer: z.string().optional().describe("Small footer text"),
          sourceTitle: z.string().optional().describe("Source link text"),
          sourceUrl: z.string().optional().describe("Source URL"),
        }),
        execute: async ({ variant, title, subtitle, icon, blocks, footer, sourceTitle, sourceUrl }) => {
          renderCardCallCount += 1;
          if (renderCardCallCount > 1) {
            return { __skipRender: true };
          }
          return {
            variant: variant ?? "default",
            title,
            subtitle,
            icon,
            blocks,
            footer,
            sourceTitle,
            sourceUrl,
          };
        },
      },
      searchWeb,
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


