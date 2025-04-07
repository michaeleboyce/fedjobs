import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebCrawler } from '../../../src/core/crawler/WebCrawler';
import { CrawlJobOptions } from '../../../src/types';
import { JobParserService } from '../../../src/core/parser';

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
/*
// File path: packages/crawler/__tests__/core/crawler/WebCrawler.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebCrawler } from '../../../src/core/crawler/WebCrawler';
import { PlaywrightCrawler } from 'crawlee';
import { JobPostingData } from '../../../src/types';

// Mock the dependencies
vi.mock('crawlee', () => ({
  PlaywrightCrawler: vi.fn().mockImplementation(() => ({
    run: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined)
  })),
  LogLevel: { INFO: 1 },
  log: { setLevel: vi.fn() }
}));

// Mock the core components
vi.mock('../../../src/core/crawler/URLTracker', () => ({
  UrlTracker: vi.fn().mockImplementation(() => ({
    isRecentlyVisited: vi.fn().mockReturnValue(false),
    recordVisit: vi.fn()
  }))
}));

vi.mock('../../../src/core/crawler/PageHandler', () => ({
  PageHandler: vi.fn().mockImplementation(() => ({
    setupPage: vi.fn(),
    extractPageData: vi.fn().mockResolvedValue({
      content: '<html>Test content</html>',
      title: 'Test Page',
      description: 'Test description'
    })
  }))
}));

vi.mock('../../../src/core/crawler/LinkDiscovery', () => ({
  LinkDiscovery: vi.fn().mockImplementation(() => ({
    findAndEnqueueLinks: vi.fn()
  }))
}));

vi.mock('../../../src/core/crawler/JobProcessor', () => ({
  JobProcessor: vi.fn().mockImplementation(() => ({
    processJobData: vi.fn()
  }))
}));

vi.mock('../../../src/core/oldparser', () => ({
  JobParserService: vi.fn().mockImplementation(() => ({
    parseJobsFromPage: vi.fn()
  }))
}));

// Create utility to access private properties for testing
function getPrivateProperty(instance: any, propertyName: string) {
  return (instance as any)[propertyName];
}

describe('WebCrawler', () => {
  let crawler: WebCrawler;
  let mockParser: any;
  
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create a mock parser
    mockParser = {
      parseJobsFromPage: vi.fn().mockResolvedValue([])
    };
    
    // Create a fresh crawler instance
    crawler = new WebCrawler(mockParser);
  });
  
  describe('cancelCrawler', () => {
    it('should return false if no crawler exists for source ID', async () => {
      const result = await crawler.cancelCrawler(123);
      expect(result).toBe(false);
    });
    
    it('should cancel and remove the crawler if it exists', async () => {
      // Arrange: Set up a crawler for source ID 123
      const mockPlaywrightCrawler = new PlaywrightCrawler();
      
      // Add the crawler to the private map
      const activeCrawlers = getPrivateProperty(crawler, 'activeCrawlers');
      activeCrawlers.set(123, mockPlaywrightCrawler);
      
      // Act: Call cancelCrawler
      const result = await crawler.cancelCrawler(123);
      
      // Assert: Check the results
      expect(result).toBe(true);
      expect(mockPlaywrightCrawler.stop).toHaveBeenCalled();
      expect(activeCrawlers.has(123)).toBe(false);
    });
    
    it('should handle errors during crawler cancellation', async () => {
      // Arrange: Set up a crawler for source ID 123 that throws on stop
      const mockPlaywrightCrawler = {
        stop: vi.fn().mockRejectedValue(new Error('Failed to stop'))
      };
      
      // Add the crawler to the private map
      const activeCrawlers = getPrivateProperty(crawler, 'activeCrawlers');
      activeCrawlers.set(123, mockPlaywrightCrawler);
      
      // Act: Call cancelCrawler
      const result = await crawler.cancelCrawler(123);
      
      // Assert: Check the results
      expect(result).toBe(false);
      expect(mockPlaywrightCrawler.stop).toHaveBeenCalled();
      expect(activeCrawlers.has(123)).toBe(true); // Should not remove on error
    });
  });
  
  describe('crawlSite', () => {
    it('should call crawlJobSite with the right options', async () => {
      // Mock for the onProcessJob callback
      const processJobMock = vi.fn().mockResolvedValue(123);
      
      // Spy on crawlJobSite
      const crawlJobSiteSpy = vi.spyOn(crawler, 'crawlJobSite').mockResolvedValue([]);
      
      // Arrange: Set up job data
      const jobData: JobPostingData = {
        title: 'Test Job',
        organization: 'Test Org',
        description: 'Test description',
        url: 'https://example.com/job',
        dateScraped: new Date()
      };
      
      // Configure parser to return a job
      mockParser.parseJobsFromPage.mockResolvedValue([jobData]);
      
      // Act: Call crawlSite
      await crawler.crawlSite(
        {
          sourceId: 123,
          url: 'https://example.com',
          keywords: 'test',
          maxJobs: 10
        },
        processJobMock
      );
      
      // Assert: Check that crawlJobSite was called with the right options
      expect(crawlJobSiteSpy).toHaveBeenCalledWith(expect.objectContaining({
        sourceId: 123,
        url: 'https://example.com',
        keywords: 'test',
        maxJobs: 10
      }));
    });
    
    it('should process found jobs and return results', async () => {
      // Mock for the onProcessJob callback
      const processJobMock = vi.fn()
        .mockResolvedValueOnce(101) // First job ID
        .mockResolvedValueOnce(-1)  // Invalid job ID
        .mockResolvedValueOnce(102); // Third job ID
      
      // Spy on internal methods to control the flow
      vi.spyOn(crawler, 'crawlJobSite').mockImplementation(async (options) => {
        // Simulate finding jobs
        const jobs: JobPostingData[] = [
          { title: 'Job 1', organization: 'Org 1', description: 'Desc 1', url: 'https://example.com/1', dateScraped: new Date() },
          { title: 'Invalid Job', organization: 'Org 2', description: 'Invalid', url: 'https://example.com/2', dateScraped: new Date() },
          { title: 'Job 3', organization: 'Org 3', description: 'Desc 3', url: 'https://example.com/3', dateScraped: new Date() }
        ];
        
        // Call onJobFound for each job
        for (const job of jobs) {
          if (options.onJobFound) {
            await options.onJobFound(job);
          }
        }
        
        return jobs;
      });
      
      // Act: Call crawlSite
      const result = await crawler.crawlSite(
        {
          sourceId: 123,
          url: 'https://example.com'
        },
        processJobMock
      );
      
      // Assert: Check processing results
      expect(processJobMock).toHaveBeenCalledTimes(3);
      expect(result.jobsFound.length).toBe(2); // Only valid jobs
      expect(result.jobsStored).toEqual([101, 102]); // Only valid job IDs
    });
    
    it('should handle errors during crawling', async () => {
      // Mock for the onProcessJob callback
      const processJobMock = vi.fn();
      
      // Spy on crawlJobSite to make it throw
      vi.spyOn(crawler, 'crawlJobSite').mockRejectedValue(new Error('Crawl failed'));
      
      // Act & Assert: Call crawlSite and expect it to throw
      await expect(
        crawler.crawlSite(
          {
            sourceId: 123,
            url: 'https://example.com'
          },
          processJobMock
        )
      ).rejects.toThrow('Crawl failed');
      
      // Ensure process job was never called
      expect(processJobMock).not.toHaveBeenCalled();
    });
  });
  
  describe('crawlJobSite', () => {
    it('should throw an error for invalid URLs', async () => {
      await expect(
        crawler.crawlJobSite({
          url: 'invalid-url'
        })
      ).rejects.toThrow('Invalid URL');
    });
    
    it('should register the crawler for cancellation', async () => {
      // Spy on PlaywrightCrawler
      const mockPlaywrightCrawler = new PlaywrightCrawler();
      vi.spyOn(global, 'PlaywrightCrawler').mockReturnValue(mockPlaywrightCrawler);
      
      // Act: Call crawlJobSite with a sourceId
      const sourceId = 456;
      
      // We need to catch the error because the URL is valid but the mock run might fail
      try {
        await crawler.crawlJobSite({
          url: 'https://example.com',
          sourceId
        });
      } catch (error) {
        // Ignore errors for this test
      }
      
      // Check that the crawler is registered
      const activeCrawlers = getPrivateProperty(crawler, 'activeCrawlers');
      expect(activeCrawlers.has(sourceId)).toBe(true);
    });
    
    it('should process jobs found on pages', async () => {
      // Mock the job data to be returned
      const mockJobs: JobPostingData[] = [
        { title: 'Job 1', organization: 'Org 1', description: 'Desc 1', url: 'https://example.com/1', dateScraped: new Date() },
        { title: 'Job 2', organization: 'Org 2', description: 'Desc 2', url: 'https://example.com/2', dateScraped: new Date() }
      ];
      
      // Configure parser to return job data
      mockParser.parseJobsFromPage.mockResolvedValue(mockJobs);
      
      // Mock crawler run to call the request handler
      const mockPlaywrightCrawler = {
        run: vi.fn().mockImplementation(async () => {
          // Get the requestHandler from the createCrawler method
          const crawlerConfig = getPrivateProperty(crawler, 'createCrawler').mock.results[0].value;
          await crawlerConfig.requestHandler({
            request: { url: 'https://example.com' },
            page: { context: () => ({ browser: () => ({ close: vi.fn() }) }) },
            enqueueLinks: vi.fn()
          });
        }),
        stop: vi.fn()
      };
      
      // Spy on PlaywrightCrawler
      vi.spyOn(global, 'PlaywrightCrawler').mockReturnValue(mockPlaywrightCrawler);
      
      // Mock job processor to track processed jobs
      const jobProcessor = getPrivateProperty(crawler, 'jobProcessor');
      jobProcessor.processJobData.mockImplementation((jobs, results) => {
        // Add jobs to results array
        results.push(...jobs);
      });
      
      // Act: Call crawlJobSite
      const results = await crawler.crawlJobSite({
        url: 'https://example.com'
      });
      
      // Assert: Check jobs were processed
      expect(results.length).toBe(2);
      expect(results[0].title).toBe('Job 1');
      expect(results[1].title).toBe('Job 2');
    });
    
    it('should call the onComplete callback if provided', async () => {
      // Mock the onComplete callback
      const onCompleteMock = vi.fn();
      
      // Mock crawler run to succeed
      const mockPlaywrightCrawler = {
        run: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn()
      };
      
      // Spy on PlaywrightCrawler
      vi.spyOn(global, 'PlaywrightCrawler').mockReturnValue(mockPlaywrightCrawler);
      
      // Act: Call crawlJobSite with onComplete callback
      await crawler.crawlJobSite({
        url: 'https://example.com',
        onComplete: onCompleteMock
      });
      
      // Assert: Check onComplete was called
      expect(onCompleteMock).toHaveBeenCalled();
    });
    
    it('should call the onError callback if an error occurs', async () => {
      // Mock the onError callback
      const onErrorMock = vi.fn();
      
      // Mock crawler run to fail during page processing
      const mockPlaywrightCrawler = {
        run: vi.fn().mockImplementation(async () => {
          // Get the requestHandler from the createCrawler method
          const crawlerConfig = getPrivateProperty(crawler, 'createCrawler').mock.results[0].value;
          
          // Simulate error during page processing
          await crawlerConfig.requestHandler({
            request: { url: 'https://example.com' },
            page: {
              context: vi.fn().mockImplementation(() => {
                throw new Error('Page processing error');
              })
            },
            enqueueLinks: vi.fn()
          });
        }),
        stop: vi.fn()
      };
      
      // Spy on PlaywrightCrawler
      vi.spyOn(global, 'PlaywrightCrawler').mockReturnValue(mockPlaywrightCrawler);
      
      // Act: Call crawlJobSite with onError callback
      await crawler.crawlJobSite({
        url: 'https://example.com',
        onError: onErrorMock
      });
      
      // Assert: Check onError was called
      expect(onErrorMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Page processing error' }),
        'https://example.com'
      );
    });
  });
});
*/