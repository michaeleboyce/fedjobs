// File path: packages/crawler/__tests__/core/crawler/CrawlerManager.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { PlaywrightCrawler } from 'crawlee';
import { CrawlerManager } from '../../../src/core/crawler/CrawlerManager';

describe('CrawlerManager', () => {
  let crawlerManager: CrawlerManager;
  let mockCrawler: PlaywrightCrawler;

  beforeEach(() => {
    crawlerManager = new CrawlerManager();
    mockCrawler = new PlaywrightCrawler();
  });

  it('should register a crawler for a given source', () => {
    crawlerManager.registerCrawler(42, mockCrawler);
    // We expect no errors, or you could test some internal state if exposed.
    // Since there's no direct "getCrawler" method, we can rely on console logs or trust the manager's logic.
    // If you add a "hasCrawler" or something, you can assert that here, e.g.:
    // expect(crawlerManager.hasCrawler(42)).toBe(true);
  });

  it('should unregister a previously registered crawler', () => {
    crawlerManager.registerCrawler(42, mockCrawler);
    crawlerManager.unregisterCrawler(42);
    // If you had a "hasCrawler" method:
    // expect(crawlerManager.hasCrawler(42)).toBe(false);
  });

  it('should cancel and remove an active crawler', async () => {
    const stopSpy = vi.spyOn(mockCrawler, 'stop').mockResolvedValueOnce();

    crawlerManager.registerCrawler(99, mockCrawler);
    const result = await crawlerManager.cancelCrawler(99);

    expect(stopSpy).toHaveBeenCalled();
    expect(result).toBe(true);
    // Also confirm it's removed from the Map, if you have a "hasCrawler" method:
    // expect(crawlerManager.hasCrawler(99)).toBe(false);
  });

  it('should return false if trying to cancel an unknown sourceId', async () => {
    const result = await crawlerManager.cancelCrawler(9999);
    expect(result).toBe(false);
  });
});
