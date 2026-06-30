import { describe, it, expect, vi, beforeEach } from 'vitest';
import { webSearch, fetchPage } from '../server/src/searchService';

// Mock DatabaseService
vi.mock('../server/src/db.js', () => ({
  query: vi.fn().mockResolvedValue({ rows: [] }),
}));

// Mock fetch
global.fetch = vi.fn();

describe('searchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchPage', () => {
    it('should fetch and clean HTML content', async () => {
      const mockHtml = '<html><head><title>Test Title</title></head><body><style>.hide { display: none; }</style><script>console.log(1)</script><p>Hello World</p></body></html>';
      (global.fetch as any).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      const result = await fetchPage({ url: 'https://example.com', extractAs: 'text' });

      expect(result.title).toBe('Test Title');
      expect(result.content).toContain('Hello World');
      expect(result.content).not.toContain('console.log');
    });

    it('should throw error on fetch failure', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));
      await expect(fetchPage({ url: 'https://invalid', extractAs: 'text' }))
        .rejects.toThrow('Could not fetch the page');
    });
  });
});
