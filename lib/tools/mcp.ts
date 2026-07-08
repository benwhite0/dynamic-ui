import { createMCPClient } from "@ai-sdk/mcp";
import { dynamicTool, jsonSchema, ToolSet } from "ai";

const NO_MCP = { tools: {} as ToolSet, close: async () => {} };

// Connects to the company MCP server and returns its tools for streamText.
// Configure with MCP_SERVER_URL (+ optional MCP_API_KEY for bearer auth).
// When unset or unreachable, returns no tools so the app works standalone.
export async function getMcpTools() {
  const url = process.env.MCP_SERVER_URL;
  if (!url) return NO_MCP;

  try {
    const client = await createMCPClient({
      transport: {
        type: url.endsWith("/sse") ? "sse" : "http",
        url,
        headers: process.env.MCP_API_KEY
          ? { Authorization: `Bearer ${process.env.MCP_API_KEY}` }
          : undefined,
      },
    });

    // Re-wrap with this app's `ai` package: @ai-sdk/mcp ships its own copy of
    // the schema utilities, and its wrappers aren't recognised by ai@5's
    // validator ("~standard" marker mismatch). We keep @ai-sdk/mcp purely as
    // transport and rebuild each tool with our jsonSchema/dynamicTool.
    const raw = await client.tools();
    const tools: ToolSet = Object.fromEntries(
      Object.entries(raw).map(([name, t]) => [
        name,
        dynamicTool({
          description: t.description,
          inputSchema: jsonSchema(
            (t.inputSchema as any)?.jsonSchema ?? { type: "object" },
          ),
          // Unwrap the MCP CallToolResult ({content: [{type:'text',...}]})
          // into plain text so ai@5 can serialise it for the model.
          execute: async (args, options) => {
            const result: any = await (t.execute as any)(args, options);
            const texts = result?.content
              ?.filter((c: any) => c.type === "text")
              .map((c: any) => c.text);
            if (!texts?.length) return result;
            return texts.length === 1 ? texts[0] : texts.join("\n");
          },
        }),
      ]),
    );

    return { tools, close: () => client.close() };
  } catch (error) {
    console.error("Failed to connect to MCP server", error);
    return NO_MCP;
  }
}
