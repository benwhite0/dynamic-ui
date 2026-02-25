import { tool } from 'ai';
import { tavily } from '@tavily/core';
import { z } from 'zod';

const client = tavily({ apiKey: process.env.TAVILY_API_KEY! });

export const searchWeb = tool({
  description: 'Search the internet for current information, news, weather, or anything else.',
  parameters: z.object({
    query: z.string().describe('The search query'),
  }),
  execute: async ({ query }) => {
    const response = await client.search(query, {
      maxResults: 5,
      searchDepth: 'basic', // use 'advanced' for better results (costs 2 credits vs 1)
    });

    if (!response.results || response.results.length === 0) {
      return 'I could not find any relevant, up-to-date information for that query.';
    }

    // Return a conversational, non-JSON summary so the model
    // doesn’t surface raw arrays/objects to the user.
    const topResults = response.results.slice(0, 3);

    const summary = topResults
      .map((r, index) => {
        const title = r.title?.trim();
        let content = r.content?.trim();
        const url = r.url?.trim();

        let sentence = '';

        if (title) {
          sentence += `Result ${index + 1} is "${title}". `;
        }

        if (content) {
          // If the snippet looks like raw JSON or a big object dump,
          // skip it to avoid ugly structured output.
          const looksLikeJson =
            content.startsWith('{') ||
            content.startsWith('[') ||
            content.includes("': {") ||
            content.includes('": {');

          if (!looksLikeJson) {
            // Keep things short to avoid overwhelming the user.
            const shortContent =
              content.length > 240 ? content.slice(0, 237).trimEnd() + '…' : content;
            sentence += shortContent + ' ';
          }
        }

        if (url) {
          sentence += `You can read more at ${url}.`;
        }

        return sentence.trim();
      })
      .join(' ');

    return summary;
  },
});