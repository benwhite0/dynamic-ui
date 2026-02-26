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
    try {
      const response = await client.search(query, {
        maxResults: 5,
        searchDepth: 'advanced', // better reasoning over sources
        includeAnswer: 'advanced', // let Tavily synthesize an answer
      });

      if (!response.results || response.results.length === 0) {
        return {
          summary: 'I could not find any relevant, up-to-date information for that query.',
          results: [],
        };
      }

      // Only use the top (best) result for user-facing output.
      const [best] = response.results;

      const title = best.title?.trim();
      const url = best.url?.trim();

      // Prefer Tavily's synthesized answer when available.
      const tavilyAnswer = typeof (response as any).answer === 'string'
        ? (response as any).answer.trim()
        : '';

      const fallbackSummaryParts: string[] = [];

      if (title) {
        fallbackSummaryParts.push(`"${title}".`);
      }

      if (url) {
        fallbackSummaryParts.push(`You can read more at ${url}.`);
      }

      const summary =
        tavilyAnswer.length > 0 ? tavilyAnswer : fallbackSummaryParts.join(' ');

      // Gemini tools expect a JSON object (Struct) as the
      // function_response.response value, not a bare string.
      return {
        summary,
        results: [
          {
            title: best.title,
            url: best.url,
          },
        ],
      };
    } catch (error) {
      console.error('searchWeb tool failed', error);
      return {
        summary:
          'I had trouble reaching the web search service. Please try again in a moment or rephrase your question.',
        results: [],
        error: true,
      };
    }
  },
});