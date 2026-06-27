# Web Search Tool — Implementation Plan

> **Date:** 2026-06-27
> **Status:** Planned
> **Icon (Hugeicons):** `Search02Icon` / `SearchEngineIcon`

---

## Overview

Give the AI a suite of web capabilities: **search the web**, **fetch full page content**, **search images**, and **search news**. The AI will call the appropriate tool during conversation, fetch results from a search/ scraping API, and incorporate them into its response.

---

## Architecture

```
User Message
  │
  ▼
AI Model (calls webSearch / fetchPage / imageSearch / newsSearch tool)
  │
  ▼
WebSearchTool (Vercel AI SDK tool)
  │
  ▼
WebSearchService (API client — provider abstraction layer)
  │
  ├──► Tavily
  ├──► Brave Search
  ├──► Firecrawl
  ├──► Google Custom Search
  └──► DuckDuckGo (fallback, no key)
  │
  ▼
Results returned → AI reads them → formulates response
```

### Layers

| Layer | File | Purpose |
|-------|------|---------|
| **Tool Definitions** | `src/services/ai/tools/webSearchTool.ts` | `webSearch`, `fetchPage`, `imageSearch`, `newsSearch` tool schemas |
| **Service** | `src/services/WebSearchService.ts` | Provider abstraction + HTTP clients |
| **Registration** | `src/services/aiService.ts` | Register all tools in the `tools` object of `streamText()` |
| **System Prompt** | `src/services/ai/config.ts` | Instructions on when/how to use each tool |
| **API Key Storage** | `src/services/DatabaseService.ts` (existing `getConfig/setConfig`) | All keys stored in SQLite `app_config` table, NOT localStorage |
| **Settings UI** | `src/components/settings/SettingsModal.tsx` | Provider selector + API key fields |

---

## All Keys Stored in SQLite (not localStorage)

The Express backend already has an `app_config` table and `get_app_config` / `set_app_config` endpoints. The `DatabaseService` already exposes:

```ts
DatabaseService.getConfig('search-provider')   // → "tavily" | "brave" | "firecrawl" | ...
DatabaseService.setConfig('search-api-key', '...')
DatabaseService.setConfig('search-provider', 'tavily')
```

Every search-related key uses `DatabaseService.getConfig` / `setConfig` — never `localStorage`. This ensures keys persist server-side and survive cache clears.

Keys stored in `app_config`:

| Key | Example Value |
|-----|--------------|
| `search-provider` | `"tavily"` |
| `search-api-key` | `"tvly-..."` |
| `search-firecrawl-api-key` | `"fc-..."` |
| `search-brave-api-key` | `"BSA..."` |
| `search-google-cx` | `"123456789..."` |
| `search-google-api-key` | `"AIza..."` |

---

## Search & Scraping Provider Options

| Provider | API Key Required | Free Tier | Supports | Notes |
|----------|-----------------|-----------|----------|-------|
| **Tavily** | ✅ Yes | 1,000 credits/mo | Search, content extraction, news | Built for AI agents. Returns clean parsed results + AI summary. Recommended primary. |
| **Firecrawl** | ✅ Yes | 500 credits/mo | Search, scraping, crawl, maps | Excellent scraping engine. Can search AND fetch full page content in one API. Strongly recommended for `fetchPage`. |
| **Brave Search** | ✅ Yes | 2,000 queries/mo | Web search, image search, news | Free tier is generous. No content extraction — needs separate `fetchPage`. |
| **Google Custom Search** | ✅ Yes | 100 queries/day | Web search, image search | Requires CX + API key. Legacy, limited. |
| **DuckDuckGo** | ❌ No | Unlimited | Web search | No official API. Use `@microsoft/fetch-event-source` or scraping lib. Unreliable. Best as last-resort fallback. |

**Recommendation:** Support **Tavily** (primary search), **Firecrawl** (scraping + fallback search), and **Brave** (image/news search). Let user pick their preferred provider for each capability.

---

## Tool Definitions

### 1. `webSearch` — General web search

```ts
// src/services/ai/tools/webSearchTool.ts

import { tool } from 'ai';
import { z } from 'zod';

export const webSearchTool = tool({
  description: 'Search the web for current information. Use when you need up-to-date data, recent news, documentation, or facts beyond your training cutoff. ONE domain per search.',
  parameters: z.object({
    query: z.string().describe('The search query. Be specific and concise. Supports site:example.com to limit to ONE domain. Do NOT include multiple site: operators.'),
    maxResults: z.number().optional().default(5).describe('Number of results (1–5). Hard cap: 5 per search.'),
  }),
  execute: async ({ query, maxResults }) => {
    const capped = Math.min(maxResults ?? 5, 5);
    // Calls WebSearchService.search(query, capped)
  },
});
```

### 2. `fetchPage` — Fetch full content of a URL

```ts
export const fetchPageTool = tool({
  description: 'Fetch and extract the full text content of a webpage from a URL. Use when you need more detail than search snippets provide — documentation pages, blog posts, articles, etc.',
  parameters: z.object({
    url: z.string().describe('The full URL to fetch (must include https://).'),
    extractAs: z.enum(['markdown', 'text']).optional().default('markdown').describe('Format to extract the page content as. Markdown preserves headings/structure.'),
  }),
  execute: async ({ url, extractAs }) => {
    // Uses Firecrawl / Tavily extract / JSDOM+Readability based on provider
  },
});
```

### 3. `imageSearch` — Search for images

```ts
export const imageSearchTool = tool({
  description: 'Search the web for images. Returns image URLs, titles, and source pages. Use when the user wants to find pictures, screenshots, diagrams, logos, or visual references.',
  parameters: z.object({
    query: z.string().describe('The image search query. Descriptive terms work best.'),
    maxResults: z.number().optional().default(5).describe('Number of image results (1–5). Hard cap: 5 per search.'),
    safeSearch: z.boolean().optional().default(true).describe('Filter out explicit content.'),
  }),
  execute: async ({ query, maxResults, safeSearch }) => {
    // Calls Brave Image API or Google Custom Search Image
  },
});
```

### 4. `newsSearch` — Search for news articles

```ts
export const newsSearchTool = tool({
  description: 'Search for recent news articles. Use when the user asks about current events, recent developments, or time-sensitive topics.',
  parameters: z.object({
    query: z.string().describe('The news search query.'),
    maxResults: z.number().optional().default(5).describe('Number of news results (1–5). Hard cap: 5 per search.'),
    freshness: z.enum(['hour', 'day', 'week', 'month']).optional().default('week').describe('How recent the news should be.'),
  }),
  execute: async ({ query, maxResults, freshness }) => {
    // Calls Brave News API or Tavily with search_depth=advanced + include_domains
  },
});
```

---

## Data Flow

### 1. AI calls a tool

```
webSearch({ query: "site:react.dev hooks tutorial", maxResults: 5 })
fetchPage({ url: "https://react.dev/reference/react/hooks", extractAs: "markdown" })
imageSearch({ query: "typescript logo", maxResults: 3 })
newsSearch({ query: "AI regulation", freshness: "day", maxResults: 5 })
```

### 2. Service dispatches to the configured provider

`WebSearchService` checks which provider the user has configured and calls its API accordingly.

### 3. Normalized response

All providers return a common interface:

```ts
interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string;          // Full page content (Tavily / Firecrawl)
  publishedDate?: string;
  source?: string;
}

interface ImageResult {
  title: string;
  imageUrl: string;
  sourceUrl: string;
  width?: number;
  height?: number;
}

interface WebSearchResponse {
  results: WebSearchResult[];
  totalResults: number;
  answer?: string;           // AI-generated summary (Tavily)
}
```

### 4. AI reads results and responds

The tool's `execute` returns the structured result. The AI incorporates the information and cites sources.

### 5. UI displays tool invocation

The existing `AssistantBubble` already shows non-writeArtifact tool invocations with a "running"/"done" badge. All search tools get this for free.

---

## Provider API Details

### Tavily (`https://api.tavily.com`)

```
POST https://api.tavily.com/search
{
  "api_key": "tvly-...",
  "query": "...",
  "search_depth": "basic",
  "max_results": 5,
  "include_answer": true,
  "include_raw_content": false
}
```

Response:
```json
{
  "answer": "AI-generated summary...",
  "results": [
    {
      "title": "...",
      "url": "...",
      "content": "Cleaned page content...",
      "published_date": "...",
      "score": 0.98
    }
  ]
}
```

Tavily can handle both `webSearch` (with `include_answer`) and `newsSearch` (with `search_depth=advanced` + topic filter).

### Firecrawl (`https://api.firecrawl.dev`)

**Search:**
```
POST https://api.firecrawl.dev/v1/search
{
  "query": "...",
  "maxResults": 5,
  "scrapeOptions": { "formats": ["markdown"] }
}
```

**Scrape (fetchPage):**
```
POST https://api.firecrawl.dev/v1/scrape
{
  "url": "https://example.com",
  "formats": ["markdown"]
}
```

Response:
```json
{
  "success": true,
  "data": {
    "markdown": "# Page Title\n\nFull markdown content...",
    "metadata": {
      "title": "...",
      "description": "...",
      "sourceURL": "...",
      "statusCode": 200
    }
  }
}
```

Firecrawl is ideal for `fetchPage` — it handles JS-rendered pages and returns clean Markdown.

### Brave Search (`https://api.search.brave.com`)

**Web search:**
```
GET https://api.search.brave.com/res/v1/web/search?q=...&count=5
Headers: X-Subscription-Token: <key>
```

**Image search:**
```
GET https://api.search.brave.com/res/v1/images/search?q=...&count=5&safesearch=strict
```

**News search:**
```
GET https://api.search.brave.com/res/v1/news/search?q=...&count=5&freshness=pd
```

Response (web):
```json
{
  "web": {
    "results": [
      {
        "title": "...",
        "url": "...",
        "description": "...",
        "age": "...",
        "page_age": "..."
      }
    ]
  }
}
```

Brave is the best free option for `imageSearch` and `newsSearch`.

### Google Custom Search

```
GET https://www.googleapis.com/customsearch/v1?key=...&cx=...&q=...&num=5
```

Response:
```json
{
  "items": [
    {
      "title": "...",
      "link": "...",
      "snippet": "...",
      "pagemap": { ... }
    }
  ]
}
```

Supports image search via `searchType=image` parameter.

---

## Readability / Scraping Mode (for `fetchPage`)

When a provider returns URLs without full content (e.g., Brave, Google), `fetchPage` will independently fetch and extract the page content using one of these strategies:

| Strategy | Library | Notes |
|----------|---------|-------|
| **Firecrawl scrape** | Firecrawl API | Best. Handles JS rendering, returns clean Markdown. Requires Firecrawl API key. |
| **Tavily extract** | Tavily API | Returns clean content. Limited by Tavily credits. |
| **@mozilla/readability** | `@mozilla/readability` npm package | In-browser or server-side extraction. Converts HTML → readable text. Free, no API key. |
| **JSDOM + Readability** | `jsdom` + `@mozilla/readability` | Server-side extraction. Works on the Express backend. |
| **Turndown** | `turndown` npm package | Converts HTML → Markdown. Used after Readability for Markdown output. |

**Priority order for `fetchPage` when provider doesn't include content:**
1. Firecrawl scrape (if Firecrawl API key configured)
2. Tavily extract (if Tavily API key configured)
3. JSDOM + Readability + Turndown (server-side, no extra API key)

---

## Site-Specific Search

The `site:` operator is supported natively by all providers in the query string:

| Provider | Syntax |
|----------|--------|
| Tavily | `site:example.com query` |
| Brave | `site:example.com query` |
| Firecrawl | Native `scrapeOptions` or `site:example.com` |
| Google | `site:example.com query` |

Also support an optional `site` parameter in `webSearchTool`:

```ts
parameters: z.object({
  query: z.string(),
    site: z.string().optional().describe('Limit search to a single domain only (e.g. "react.dev"). ONE domain per search call — do not pass multiple domains.'),
  maxResults: z.number().optional().default(5),
}),
```

The service layer prepends `site:domain` to the query when `site` is provided.

---

## Files to Create / Modify

### New Files

| File | Description |
|------|-------------|
| `src/services/ai/tools/webSearchTool.ts` | All four tool definitions (`webSearch`, `fetchPage`, `imageSearch`, `newsSearch`) |
| `src/services/WebSearchService.ts` | Provider abstraction — dispatches to Tavily / Firecrawl / Brave / Google |
| `src/services/ai/tools/fetchPageTool.ts` | (Optional) Separate file if `fetchPage` logic grows large |

### Modified Files

| File | Changes |
|------|---------|
| `src/services/aiService.ts` | Import + register all tools in the `tools` object |
| `src/services/ai/config.ts` | Add instructions for all four tools to system prompt |
| `src/components/settings/SettingsModal.tsx` | Add search provider selector + API key fields (fetching from DB, not localStorage) |
| `server/src/index.ts` | No changes needed — `get_app_config` / `set_app_config` already exists |

### No Changes Needed

| File | Reason |
|------|--------|
| `src/config/models.ts` | Keys stored in DB via `DatabaseService`, not in this file |
| `src/services/DatabaseService.ts` | `getConfig` / `setConfig` already persist to SQLite |
| `server/src/db.ts` | `app_config` table already exists |
| `src/pages/ChatPage.tsx` | Tool invocation display is automatic via `AssistantBubble` |

---

## System Prompt Additions

Add to `src/services/ai/config.ts`:

```
### WEB TOOLS

You have access to four web tools:

#### 1. `webSearch` — General web search
Search the web for current information. Use for recent events, documentation lookups,
fact-checking, and any query that needs up-to-date data.
- Supports `site:domain.com` syntax to limit results to ONE domain only.
- ONE domain per search call. Need multiple sites? Make separate calls — they run in parallel.
- Returns snippets and links. Use `fetchPage` for full content.
- Hard cap: 5 results max per call. Need more? Issue multiple parallel searches.
- Recent identical searches are cached (no extra API cost).

#### 2. `fetchPage` — Fetch full webpage content
After getting a URL from `webSearch` (or from the user), call this to read the full
article, documentation, or page content. Returns clean Markdown or text.
- Use when search snippets aren't enough.
- Use to read documentation pages, blog posts, or any long-form content.

#### 3. `imageSearch` — Find images
Search for images matching a description. Returns image URLs and source pages.
- Use when the user asks for pictures, logos, screenshots, diagrams.
- Note: you will see image URLs but not the images themselves.

#### 4. `newsSearch` — Latest news
Search for recent news articles. Results are filtered by freshness (hour/day/week).
- Use for "what's new", "latest updates", "recent developments".
- Always cite the source and date.

Guidelines:
- Prefer `webSearch` first, then `fetchPage` for deeper reading.
- Cite sources by including the URL in your response.
- Summarize the relevant information — do not dump raw results.
- If a search returns no results, try a different query.
- Do NOT search for things you confidently know from training data.
- ONE domain per `webSearch` call. For multiple domains, issue parallel calls.
- 5 results max per search call. Need more? Use parallel searches with specific queries.
- Parallel calls are allowed and efficient — the system runs them concurrently.
- Identical searches within minutes hit cache — no extra cost.
```

---

## Settings UI

Add a new "Web & Search" section to `SettingsModal.tsx`:

```
┌──────────────────────────────────────────────┐
│  Web & Search                                │
│                                              │
│  Search Provider: [Tavily          ▼]       │
│  API Key:        [••••••••••••••••••••]     │
│  ─────────────────────────────────────────   │
│  Scrape Provider: [Firecrawl       ▼]       │
│  API Key:         [••••••••••••••••••••]    │
│  ─────────────────────────────────────────   │
│  Brave Search (for images + news)           │
│  API Key:        [••••••••••••••••••••]     │
│  ─────────────────────────────────────────   │
│  Google Custom Search (fallback)            │
│  API Key:        [••••••••••••••••••••]     │
│  CX (Engine ID): [••••••••••••••••••••]     │
│                                              │
│  🔗 Get a free Tavily key: tavily.com       │
│  🔗 Get a free Firecrawl key: firecrawl.dev │
│  🔗 Get a free Brave key: brave.com/search  │
└──────────────────────────────────────────────┘
```

All values fetched and stored via `DatabaseService.getConfig` / `setConfig` (SQLite).

---

## Search History (Cache)

To avoid redundant API calls and save credits, every search result is cached in the SQLite database.

### Cache Table

Add a new table via `server/src/db.ts` migration:

```sql
CREATE TABLE IF NOT EXISTS search_cache (
  cache_key TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  tool TEXT NOT NULL,          -- 'webSearch' | 'imageSearch' | 'newsSearch'
  results TEXT NOT NULL,       -- JSON string of the full response
  created_at INTEGER NOT NULL
);
```

### Cache Key

The cache key is a hash of `provider + tool + JSON.stringify(params)`:

```ts
const cacheKey = await crypto.subtle.digest(
  'SHA-256',
  new TextEncoder().encode(`${provider}:${tool}:${JSON.stringify(params)}`)
).then(h => Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join(''));
```

### TTL

| Tool | TTL |
|------|-----|
| `webSearch` | 5 minutes |
| `imageSearch` | 10 minutes |
| `newsSearch` | 2 minutes (news is time-sensitive) |
| `fetchPage` | 30 minutes (page content changes slowly) |

### Behavior

- Before making an API call, the service checks the cache.
- If a fresh entry exists (within TTL), return it immediately — no API call.
- If expired or missing, make the API call, store the result, return it.
- Cache is stored in SQLite so it persists across app restarts.

### Service API

```ts
// WebSearchService automatically handles caching:
const results = await WebSearchService.search({ query: "react hooks", maxResults: 5 });
// First call → API. Second call within 5 min → cached.
```

No changes needed in the tool definitions — caching is transparent in the service layer.

---

## Batch Mode / Parallel Searches

The AI can issue multiple independent search calls in a single turn. The Vercel AI SDK supports parallel tool calls natively — when the model decides multiple searches are useful, all tool invocations fire concurrently.

### How it Works

1. AI decides it needs multiple pieces of information
2. AI emits multiple tool calls in one response (e.g., `webSearch` + `webSearch` + `newsSearch`)
3. The Vercel AI SDK runs all tool `execute` handlers concurrently
4. All results come back to the AI in a single turn
5. AI synthesizes everything into one response

### Example

```
User: "What are the latest TypeScript features and who created the language?"

AI calls in parallel:
  webSearch({ query: "TypeScript latest features 2026", maxResults: 3 })
  webSearch({ query: "TypeScript creator history", maxResults: 3 })

AI waits for both, then responds with a combined answer.
```

### Constraint: ONE domain per search call

Each `webSearch` call can target at most ONE site via the `site` parameter or `site:` operator. If the AI needs information from multiple domains, it must issue separate search calls:

### Constraint: 5 results max per search

Every search tool caps results at **5 per call**. This is enforced at two levels:

1. **Zod schema** — the `maxResults` field accepts 1–5 only
2. **Service layer** — `Math.min(maxResults, 5)` clamps any out-of-range value

The system prompt instructs the AI accordingly. If the AI needs more than 5 results, it should issue multiple parallel searches with more specific queries.

```
✅ Correct:
  webSearch({ query: "hooks tutorial", site: "react.dev" })
  webSearch({ query: "hooks tutorial", site: "angular.io" })

❌ Wrong — do NOT do this:
  webSearch({ query: "hooks tutorial site:react.dev site:angular.io" })
```

This is enforced in the tool's Zod schema and system prompt instructions.

### Rate Limiting

The WebSearchService tracks API usage per provider. If multiple parallel searches would exceed rate limits, they are queued and executed sequentially with a small delay. This is handled transparently in the service layer.

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| No API key for provider | Tool returns: "Search is not configured. Add an API key in Settings → Web & Search." |
| API rate limit exceeded | Tool returns: "Rate limit exceeded. Try again later or switch providers." |
| Network error | Tool returns: "Search request failed. Check your connection." |
| Empty results | Tool returns: "No results found for query. Try a different query." |
| `fetchPage` URL invalid | Tool returns: "Could not fetch the page. The URL may be invalid or blocked." |
| `fetchPage` server error | Tool returns: "The page returned an error (status XXX)." |

The AI reads these error messages and explains to the user.

---

## Implementation Order

1. Create `WebSearchService.ts` — provider abstraction layer
2. Create `webSearchTool.ts` — all four tool definitions
3. Register tools in `aiService.ts`
4. Update system prompt in `config.ts`
5. Add settings UI in `SettingsModal.tsx` (reads/writes via `DatabaseService`)
6. Test each tool with real API calls
7. Test error handling (no key, rate limit, bad URL)

---

## Future Enhancements

- **Plugins integration** — once the Plugins tab is built, web tools become toggleable built-in plugins
- **Local LLM web search** — use `fetch` directly from Ollama if running locally
- **Custom search engines** — let users define custom search endpoints
