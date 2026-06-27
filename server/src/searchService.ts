import crypto from 'crypto';
import { query } from './db.js';

const TAVILY_URL = 'https://api.tavily.com';
const FIRECRAWL_URL = 'https://api.firecrawl.dev';
const BRAVE_URL = 'https://api.search.brave.com';
const GOOGLE_URL = 'https://www.googleapis.com/customsearch/v1';

const TTL: Record<string, number> = {
  webSearch: 5 * 60 * 1000,
  imageSearch: 10 * 60 * 1000,
  newsSearch: 2 * 60 * 1000,
  fetchPage: 30 * 60 * 1000,
};

function cacheKey(tool: string, params: any): string {
  return crypto.createHash('sha256').update(`${tool}:${JSON.stringify(params)}`).digest('hex');
}

async function getCache(tool: string, params: any): Promise<any | null> {
  const key = cacheKey(tool, params);
  const result = await query('SELECT results, created_at FROM search_cache WHERE cache_key = $1', [key]);
  if (result.rows.length > 0) {
    const row = result.rows[0] as any;
    const age = Date.now() - Number(row.created_at);
    if (age < (TTL[tool] || 300000)) {
      return JSON.parse(row.results);
    }
  }
  return null;
}

async function setCache(tool: string, params: any, provider: string, results: any): Promise<void> {
  const key = cacheKey(tool, params);
  await query(
    `INSERT INTO search_cache (cache_key, provider, tool, results, created_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (cache_key) DO UPDATE SET results = EXCLUDED.results, created_at = EXCLUDED.created_at`,
    [key, provider, tool, JSON.stringify(results), Date.now()]
  );
}

async function getConfig(key: string): Promise<string | null> {
  const result = await query('SELECT value FROM app_config WHERE key = $1', [key]);
  return result.rows.length > 0 ? (result.rows[0] as any).value : null;
}

async function tavilySearch(query: string, maxResults: number, searchDepth = 'basic') {
  const apiKey = await getConfig('search-api-key');
  if (!apiKey) throw new Error('Tavily API key not configured');

  const res = await fetch(`${TAVILY_URL}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: searchDepth,
      max_results: Math.min(maxResults, 5),
      include_answer: true,
      include_raw_content: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Tavily API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return {
    results: (data.results || []).map((r: any) => ({
      title: r.title || '',
      url: r.url || '',
      snippet: (r.content || '').slice(0, 500),
      content: r.content || '',
      publishedDate: r.published_date || '',
      source: 'tavily',
    })),
    totalResults: data.results?.length || 0,
    answer: data.answer || '',
  };
}

async function firecrawlSearch(query: string, maxResults: number) {
  const apiKey = await getConfig('search-firecrawl-api-key');
  if (!apiKey) throw new Error('Firecrawl API key not configured');

  const res = await fetch(`${FIRECRAWL_URL}/v1/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      maxResults: Math.min(maxResults, 5),
      scrapeOptions: { formats: ['markdown'] },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firecrawl API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return {
    results: (data.data || []).map((r: any) => ({
      title: r.metadata?.title || '',
      url: r.url || r.metadata?.sourceURL || '',
      snippet: r.metadata?.description || '',
      content: r.markdown || '',
      publishedDate: '',
      source: 'firecrawl',
    })),
    totalResults: data.data?.length || 0,
    answer: '',
  };
}

async function firecrawlScrape(url: string, formats: string[]) {
  const apiKey = await getConfig('search-firecrawl-api-key');
  if (!apiKey) throw new Error('Firecrawl API key not configured');

  const res = await fetch(`${FIRECRAWL_URL}/v1/scrape`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ url, formats }),
  });

  if (!res.ok) throw new Error(`Firecrawl scrape error (${res.status})`);
  const data = await res.json();
  return data.data || null;
}

async function braveSearch(query: string, maxResults: number) {
  const apiKey = await getConfig('search-brave-api-key');
  if (!apiKey) throw new Error('Brave Search API key not configured');

  const res = await fetch(`${BRAVE_URL}/res/v1/web/search?q=${encodeURIComponent(query)}&count=${Math.min(maxResults, 5)}`, {
    headers: { 'X-Subscription-Token': apiKey },
  });

  if (!res.ok) throw new Error(`Brave API error (${res.status})`);
  const data = await res.json();

  return {
    results: (data.web?.results || []).map((r: any) => ({
      title: r.title || '',
      url: r.url || '',
      snippet: r.description || '',
      content: '',
      publishedDate: r.age || '',
      source: 'brave',
    })),
    totalResults: data.web?.results?.length || 0,
    answer: '',
  };
}

async function braveImageSearch(query: string, maxResults: number, safeSearch: boolean) {
  const apiKey = await getConfig('search-brave-api-key');
  if (!apiKey) throw new Error('Brave Search API key not configured');

  const safe = safeSearch ? 'strict' : 'off';
  const res = await fetch(
    `${BRAVE_URL}/res/v1/images/search?q=${encodeURIComponent(query)}&count=${Math.min(maxResults, 5)}&safesearch=${safe}`,
    { headers: { 'X-Subscription-Token': apiKey } },
  );

  if (!res.ok) throw new Error(`Brave Image API error (${res.status})`);
  const data = await res.json();

  return {
    results: (data.results || []).map((r: any) => ({
      title: r.title || '',
      imageUrl: r.url || '',
      sourceUrl: r.page_url || r.source_url || '',
      width: r.width || 0,
      height: r.height || 0,
    })),
    totalResults: data.results?.length || 0,
  };
}

async function braveNewsSearch(query: string, maxResults: number, freshness: string) {
  const apiKey = await getConfig('search-brave-api-key');
  if (!apiKey) throw new Error('Brave Search API key not configured');

  const freshnessMap: Record<string, string> = {
    hour: 'pd',
    day: 'pd',
    week: 'pw',
    month: 'pm',
  };

  const res = await fetch(
    `${BRAVE_URL}/res/v1/news/search?q=${encodeURIComponent(query)}&count=${Math.min(maxResults, 5)}&freshness=${freshnessMap[freshness] || 'pw'}`,
    { headers: { 'X-Subscription-Token': apiKey } },
  );

  if (!res.ok) throw new Error(`Brave News API error (${res.status})`);
  const data = await res.json();

  return {
    results: (data.results || []).map((r: any) => ({
      title: r.title || '',
      url: r.url || '',
      snippet: r.description || '',
      content: '',
      publishedDate: r.published_date || r.age || '',
      source: 'brave-news',
    })),
    totalResults: data.results?.length || 0,
  };
}

async function googleSearch(query: string, maxResults: number) {
  const apiKey = await getConfig('search-google-api-key');
  const cx = await getConfig('search-google-cx');
  if (!apiKey || !cx) throw new Error('Google Custom Search not configured');

  const res = await fetch(
    `${GOOGLE_URL}?key=${encodeURIComponent(apiKey)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(query)}&num=${Math.min(maxResults, 5)}`,
  );

  if (!res.ok) throw new Error(`Google API error (${res.status})`);
  const data = await res.json();

  return {
    results: (data.items || []).map((r: any) => ({
      title: r.title || '',
      url: r.link || '',
      snippet: r.snippet || '',
      content: '',
      publishedDate: '',
      source: 'google',
    })),
    totalResults: Number(data.searchInformation?.totalResults) || 0,
    answer: '',
  };
}

export async function webSearch(params: { query: string; maxResults: number; site?: string }) {
  const cached = await getCache('webSearch', params);
  if (cached) return cached;

  const query = params.site ? `site:${params.site} ${params.query}` : params.query;
  const provider = (await getConfig('search-provider')) || 'tavily';
  let result;

  switch (provider) {
    case 'firecrawl':
      result = await firecrawlSearch(query, params.maxResults);
      break;
    case 'brave':
      result = await braveSearch(query, params.maxResults);
      break;
    case 'google':
      result = await googleSearch(query, params.maxResults);
      break;
    case 'tavily':
    default:
      result = await tavilySearch(query, params.maxResults);
      break;
  }

  await setCache('webSearch', params, provider, result);
  return result;
}

export async function fetchPage(params: { url: string; extractAs: string }) {
  const cached = await getCache('fetchPage', params);
  if (cached) return cached;

  let result;

  try {
    const firecrawlKey = await getConfig('search-firecrawl-api-key');
    if (firecrawlKey) {
      const data = await firecrawlScrape(params.url, [params.extractAs === 'text' ? 'text' : 'markdown']);
      if (data) {
        result = {
          content: data.markdown || data.text || '',
          title: data.metadata?.title || '',
          url: params.url,
        };
        await setCache('fetchPage', params, 'firecrawl', result);
        return result;
      }
    }
  } catch {
    /* fall through */
  }

  try {
    const res = await fetch(params.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; XZ/1.0)' },
      signal: AbortSignal.timeout(15000),
    });
    const html = await res.text();
    const text = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : '';

    result = {
      content: text.slice(0, 50000),
      title,
      url: params.url,
    };
  } catch (error: any) {
    throw new Error(`Could not fetch the page. The URL may be invalid or blocked: ${error.message}`);
  }

  await setCache('fetchPage', params, 'fallback', result);
  return result;
}

export async function imageSearch(params: { query: string; maxResults: number; safeSearch: boolean }) {
  const cached = await getCache('imageSearch', params);
  if (cached) return cached;

  const result = await braveImageSearch(params.query, params.maxResults, params.safeSearch);
  await setCache('imageSearch', params, 'brave', result);
  return result;
}

export async function newsSearch(params: { query: string; maxResults: number; freshness: string }) {
  const cached = await getCache('newsSearch', params);
  if (cached) return cached;

  const result = await braveNewsSearch(params.query, params.maxResults, params.freshness);
  await setCache('newsSearch', params, 'brave', result);
  return result;
}

export async function cleanupExpiredCache() {
  const now = Date.now();
  for (const [tool, ttl] of Object.entries(TTL)) {
    await query('DELETE FROM search_cache WHERE tool = $1 AND created_at < $2', [tool, now - ttl]);
  }
}
