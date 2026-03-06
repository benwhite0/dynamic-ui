import { tool } from 'ai';
import { tavily } from '@tavily/core';
import { z } from 'zod';

const client = tavily({ apiKey: process.env.TAVILY_API_KEY! });

const PREFERRED_DOMAINS = [
  // Travel / stays
  'booking.com',
  'airbnb.com',
  'hotels.com',
  'expedia.com',
  'kayak.com',
  'skyscanner.net',
  'tripadvisor.com',
  'agoda.com',
  // Airlines / transport (examples)
  'easyjet.com',
  'delta.com',
  'united.com',
  'ryanair.com',
  // Generic trusted marketplaces
  'amazon.com',
  'ebay.com',
];

function getHostname(url?: string | null): string | null {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

async function canEmbedInIframe(url?: string | null): Promise<boolean> {
  if (!url) return false;

  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
    });

    const xfo = res.headers.get('x-frame-options');
    if (xfo && /deny|sameorigin/i.test(xfo)) {
      return false;
    }

    const csp = res.headers.get('content-security-policy');
    if (csp && /frame-ancestors[^;]*('none'|none|'self'|self)/i.test(csp)) {
      return false;
    }

    return true;
  } catch {
    // If we can't determine, assume it's safer not to iframe.
    return false;
  }
}

/**
 * Use when the user wants to DO something on a website (book, buy, compare, find a service).
 * Returns top websites with links — no synthesized answer.
 *
 * Also attempts to detect which sites can be safely shown in an iframe
 * so the UI can prefer embedding up to two and showing the rest as cards.
 */
export const suggestWebsites = tool({
  description:
    'Find and suggest the top websites for a task the user wants to perform on the internet. Use ONLY when the user wants to DO something (e.g. book a flight, buy something, compare hotels, find a service, make a reservation). Do NOT use for informational questions.',
  parameters: z.object({
    task: z
      .string()
      .describe('What the user wants to do, e.g. "book flights to Paris", "compare hotel prices in London"'),
  }),
  execute: async ({ task }) => {
    try {
      // Query for best sites to accomplish the task
      const query = `best websites to ${task}`;
      const response = await client.search(query, {
        maxResults: 8,
        searchDepth: 'advanced',
        includeAnswer: false, // we want links, not a synthesized answer
      });

      if (!response.results || response.results.length === 0) {
        return {
          task,
          websites: [],
          message: 'I could not find relevant websites for that task. Try rephrasing or being more specific.',
        };
      }

      const trimmedResults = response.results.slice(0, 8);

      // Prefer well-known, high-quality domains first.
      const ranked = trimmedResults
        .map((r: { title?: string; url?: string; content?: string }, idx: number) => {
          const hostname = getHostname(r.url?.trim());
          const preferred = hostname ? PREFERRED_DOMAINS.includes(hostname) : false;
          return { r, idx, hostname, preferred };
        })
        .sort((a, b) => {
          if (a.preferred === b.preferred) return a.idx - b.idx;
          return a.preferred ? -1 : 1;
        });

      const embedFlags = await Promise.all(
        ranked.map(({ r }) => canEmbedInIframe(r.url?.trim())),
      );

      const websites = ranked.map(
        ({ r }, idx: number) => ({
          title: r.title?.trim() ?? 'Unknown',
          url: r.url?.trim() ?? '',
          snippet: r.content?.trim().slice(0, 160),
          embedAllowed: embedFlags[idx],
        }),
      );

      return {
        task,
        websites,
      };
    } catch (error) {
      console.error('suggestWebsites tool failed', error);
      return {
        task,
        websites: [],
        message: 'I had trouble finding websites for that task. Please try again.',
        error: true,
      };
    }
  },
});

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