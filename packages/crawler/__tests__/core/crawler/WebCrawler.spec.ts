import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebCrawler } from '../../../src/core/crawler/WebCrawler';
import { CrawlJobOptions } from '../../../src/types';
import { JobParserService } from '../../../src/core/oldparser';

describe('WebCrawler', () => {
  let crawler: WebCrawler;
  let parser: JobParserService;

  beforeEach(() => {
    // Create a fresh instance for each test.
    parser = new JobParserService();
    crawler = new WebCrawler(parser);
  });

  it('should throw an error for an invalid URL', async () => {
    const options: CrawlJobOptions = {
      url: 'invalid-url',
    };
    await expect(crawler.crawlJobSite(options)).rejects.toThrow('Invalid URL');
  });

  it(
    'should run crawler and call onComplete with results array',
    async () => {
      // Override createCrawler to simulate a successful crawl that returns immediately.
      // In this simulation, the crawler.run method simply resolves immediately.
      vi.spyOn<any, any>(crawler, 'createCrawler').mockImplementation((params: any) => {
        return {
          run: async (_: string[]) => {
            // Simulate a page processing:
            // For example, we could simulate a page that returns an empty job list.
            // (Your WebCrawler code pushes jobs into the "results" array.)
            // Here we do nothing, so the results array remains as initially defined.
          },
        };
      });

      const onCompleteMock = vi.fn();
      const options: CrawlJobOptions = {
        url: 'https://example.com',
        onComplete: onCompleteMock,
      };

      const results = await crawler.crawlJobSite(options);

      // Verify that onComplete was called with the (empty) results array.
      expect(onCompleteMock).toHaveBeenCalledWith(results);
      expect(results).toEqual([]);
    },
    { timeout: 10000 }
  );

  it(
    'should call onError if crawling fails',
    async () => {
      const onErrorMock = vi.fn();

      // Override createCrawler to simulate an error.
      vi.spyOn<any, any>(crawler, 'createCrawler').mockImplementation((params: any) => {
        return {
          run: async (_: string[]) => {
            throw new Error('Simulated crawl failure');
          },
        };
      });

      const options: CrawlJobOptions = {
        url: 'https://example.com/failure',
        onError: onErrorMock,
      };

      await expect(crawler.crawlJobSite(options)).rejects.toThrow('Simulated crawl failure');
      expect(onErrorMock).toHaveBeenCalled();
    },
    { timeout: 10000 }
  );
});
