// tests/unit/WebCrawler.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CrawlerError, ErrorCode } from '../../src/utils/errors';
import { PageType } from '../../src/types';

// Define mocks first - BEFORE any vi.mock calls to avoid hoisting issues
const mockRequestHandler = vi.fn();
const mockFailedRequestHandler = vi.fn();
const mockCrawlerInstance = {
  run: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
};

// Mock the PlaywrightCrawler constructor
const mockPlaywrightCrawler = vi.fn().mockImplementation((options) => {
  // Capture handlers for testing
  mockRequestHandler.mockReset();
  mockFailedRequestHandler.mockReset();
  Object.assign(mockRequestHandler, options.requestHandler);
  Object.assign(mockFailedRequestHandler, options.failedRequestHandler);
  return mockCrawlerInstance;
});

// Mock AIService implementation
const mockParserImpl = {
  classifyPage: vi.fn(),
  parseJobsFromPage: vi.fn(),
  parseJobListingPage: vi.fn(),
  parseSingleJobPage: vi.fn(),
  analyzeLinks: vi.fn(),
  prioritizeLinks: vi.fn(),
  extractLinks: vi.fn(),
  setAiService: vi.fn(),
  getAIService: vi.fn(),
  enrichJobData: vi.fn()
};

// Mock Logger implementation
const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  setLevel: vi.fn()
};

// Mock modules AFTER defining implementation functions
vi.mock('crawlee', () => ({
  PlaywrightCrawler: mockPlaywrightCrawler,
  LogLevel: {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
    OFF: 'OFF'
  },
  log: {
    setLevel: vi.fn()
  }
}));

vi.mock('../../src/core/parser', () => ({
  JobParserService: vi.fn(() => mockParserImpl)
}));

// Import modules AFTER mocking
import { WebCrawler } from '../../src/core/crawler';

describe('WebCrawler', () => {
  let crawler: WebCrawler;

  beforeEach(() => {
    vi.clearAllMocks();
    crawler = new WebCrawler(mockParserImpl, mockLogger);
  });

  it('should initialize correctly', () => {
    expect(crawler).toBeDefined();
  });

  it('should cancel an active crawler successfully', async () => {
    const sourceId = 123;
    crawler.crawlJobSite({ url: 'https://example.com', sourceId });
    
    expect(mockPlaywrightCrawler).toHaveBeenCalledTimes(1);
    expect(mockCrawlerInstance.run).toHaveBeenCalledTimes(1);
    
    const result = await crawler.cancelCrawler(sourceId);
    expect(result).toBe(true);
    expect(mockCrawlerInstance.stop).toHaveBeenCalledTimes(1);
    expect(mockLogger.info).toHaveBeenCalledWith(`Cancelling crawler for source ${sourceId}`);
    expect(mockLogger.info).toHaveBeenCalledWith(`Successfully cancelled crawler for source ${sourceId}`);
  });

  it('should return false when cancelling non-existent crawler', async () => {
    const result = await crawler.cancelCrawler(999);
    expect(result).toBe(false);
    expect(mockLogger.info).toHaveBeenCalledWith('No active crawler found for source 999');
  });

  it('should throw error when cancelling active crawler fails', async () => {
    const sourceId = 123;
    const stopError = new Error('Failed to stop');
    mockCrawlerInstance.stop.mockRejectedValueOnce(stopError);
    
    crawler.crawlJobSite({ url: 'https://example.com', sourceId });

    await expect(crawler.cancelCrawler(sourceId)).rejects.toThrow(CrawlerError);
    expect(mockLogger.error).toHaveBeenCalledWith(`Error cancelling crawler for source ${sourceId}`, { error: stopError });
  });

  it('should throw error for invalid URL in crawlJobSite', async () => {
    await expect(crawler.crawlJobSite({ url: 'invalid-url' })).rejects.toThrow(CrawlerError);
    await expect(crawler.crawlJobSite({ url: 'invalid-url' })).rejects.toMatchObject({ 
      code: ErrorCode.INVALID_ARGUMENTS,
      message: expect.stringContaining('Invalid URL: invalid-url')
    });
  });

  it('should handle crawler.run() errors during crawlJobSite', async () => {
    const runError = new Error('Test crawler run error');
    mockCrawlerInstance.run.mockRejectedValueOnce(runError);
    
    await expect(crawler.crawlJobSite({ url: 'https://example.com' })).rejects.toThrow(CrawlerError);
    expect(mockLogger.error).toHaveBeenCalledWith('Error running crawler:', { error: runError });
  });

  it('should process a job listing page correctly', async () => {
    const url = 'https://example.com/jobs';
    const jobData = { title: 'Test Job', organization: 'Test Co', description: 'Desc', url, dateScraped: new Date() };
    
    // Setup mocks for parser methods
    mockParserImpl.classifyPage.mockResolvedValueOnce({ 
      pageType: PageType.JOB_LISTING, 
      confidence: 0.9,
      relevance: 0.8,
      metadata: { estimatedJobCount: 1 }
    });
    
    mockParserImpl.parseJobListingPage.mockResolvedValueOnce({ 
      jobs: [jobData], 
      links: [] 
    });
    
    // Start the crawl
    const onJobFound = vi.fn();
    crawler.crawlJobSite({ url, onJobFound });
    
    // Get the captured request handler
    const options = mockPlaywrightCrawler.mock.calls[0][0];
    const requestHandler = options.requestHandler;
    
    // Create a mock context for the handler
    const mockContext = {
      request: { url, userData: { depth: 0 } },
      page: {
        content: vi.fn().mockResolvedValue('<html>content</html>'),
        title: vi.fn().mockResolvedValue('Jobs Page'),
        evaluate: vi.fn().mockResolvedValue('Description'),
        setViewportSize: vi.fn().mockResolvedValue(undefined),
        waitForLoadState: vi.fn().mockResolvedValue(undefined),
        waitForTimeout: vi.fn().mockResolvedValue(undefined),
        url: vi.fn().mockReturnValue(url)
      },
      enqueueLinks: vi.fn().mockResolvedValue({ processedRequests: [] }),
      log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
    };
    
    // Call the request handler manually
    await requestHandler(mockContext);
    
    // Verify the workflow
    expect(mockParserImpl.classifyPage).toHaveBeenCalledTimes(1);
    expect(mockParserImpl.parseJobListingPage).toHaveBeenCalledTimes(1);
    expect(onJobFound).toHaveBeenCalledWith(expect.objectContaining(jobData));
  });

  it('should process a single job page correctly', async () => {
    const url = 'https://example.com/job/123';
    const jobData = { title: 'Senior Engineer', organization: 'Tech Co', description: 'Build stuff', url, dateScraped: expect.any(Date) };
    
    mockParserImpl.classifyPage.mockResolvedValueOnce({ 
      pageType: PageType.SINGLE_JOB, 
      confidence: 0.95,
      relevance: 0.9,
      metadata: {}
    });
    
    mockParserImpl.parseSingleJobPage.mockResolvedValueOnce(jobData);
    
    const onJobFound = vi.fn();
    crawler.crawlJobSite({ url, onJobFound });
    
    const options = mockPlaywrightCrawler.mock.calls[0][0];
    const requestHandler = options.requestHandler;
    
    const mockContext = {
      request: { url, userData: { depth: 0 } },
      page: {
        content: vi.fn().mockResolvedValue('<html>content</html>'),
        title: vi.fn().mockResolvedValue('Job Posting'),
        evaluate: vi.fn().mockResolvedValue('Job Description'),
        setViewportSize: vi.fn().mockResolvedValue(undefined),
        waitForLoadState: vi.fn().mockResolvedValue(undefined),
        waitForTimeout: vi.fn().mockResolvedValue(undefined),
        url: vi.fn().mockReturnValue(url)
      },
      enqueueLinks: vi.fn().mockResolvedValue({ processedRequests: [] }),
      log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
    };
    
    await requestHandler(mockContext);
    
    expect(mockParserImpl.classifyPage).toHaveBeenCalledTimes(1);
    expect(mockParserImpl.parseSingleJobPage).toHaveBeenCalledTimes(1);
    expect(mockParserImpl.parseJobListingPage).not.toHaveBeenCalled();
    expect(onJobFound).toHaveBeenCalledWith(expect.objectContaining(jobData));
  });

  it('should prioritize links when processing unknown pages', async () => {
    const url = 'https://example.com/about';
    
    mockParserImpl.classifyPage.mockResolvedValueOnce({ 
      pageType: PageType.UNKNOWN, 
      confidence: 0.8,
      relevance: 0.3,
      metadata: {}
    });
    
    mockParserImpl.prioritizeLinks.mockResolvedValueOnce({
      prioritizedLinks: ['https://example.com/careers'],
      scores: { 'https://example.com/careers': 7.5 }
    });
    
    crawler.crawlJobSite({ url });
    
    const options = mockPlaywrightCrawler.mock.calls[0][0];
    const requestHandler = options.requestHandler;

    // Setup mock page to extract links 
    const mockPage = {
      content: vi.fn().mockResolvedValue('<html>content</html>'),
      title: vi.fn().mockResolvedValue('About Us'),
      evaluate: vi.fn().mockResolvedValue('Company Info'),
      setViewportSize: vi.fn().mockResolvedValue(undefined),
      waitForLoadState: vi.fn().mockResolvedValue(undefined),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
      url: vi.fn().mockReturnValue(url)
    };
    
    // Setup link extraction
    mockPage.evaluate.mockImplementation((fn) => {
      if (typeof fn === 'function') {
        // Mock the link extraction function
        return { 
          href: ['https://example.com/careers'], 
          text: ['Careers'], 
          title: [''], 
          aria: [''] 
        };
      }
      return 'Company Info';
    });
    
    const mockEnqueueLinks = vi.fn().mockResolvedValue({ processedRequests: [] });
    
    const mockContext = {
      request: { url, userData: { depth: 0 } },
      page: mockPage,
      enqueueLinks: mockEnqueueLinks,
      log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
    };
    
    await requestHandler(mockContext);
    
    expect(mockParserImpl.classifyPage).toHaveBeenCalledTimes(1);
    expect(mockParserImpl.prioritizeLinks).toHaveBeenCalledTimes(1);
    expect(mockEnqueueLinks).toHaveBeenCalledWith({
      urls: ['https://example.com/careers'],
      userData: expect.objectContaining({ depth: 1 })
    });
  });

  it('should respect crawl strategy when deciding to follow links', async () => {
    const url = 'https://example.com/about';
    
    // Create crawler with custom strategy
    const customCrawler = new WebCrawler(mockParserImpl, mockLogger, {
      defaultCrawlStrategy: {
        maxDepth: 3,
        maxPagesPerDomain: 50,
        priorityThreshold: 8.0, // Higher threshold
        includePatterns: [],
        excludePatterns: [],
        respectRobotsTxt: true,
        followRedirects: true,
        sameOriginOnly: true
      }
    });
    
    // Reset mocks after creating custom crawler
    mockPlaywrightCrawler.mockClear();
    mockParserImpl.classifyPage.mockClear();
    mockParserImpl.prioritizeLinks.mockClear();
    
    mockParserImpl.classifyPage.mockResolvedValueOnce({ 
      pageType: PageType.UNKNOWN, 
      confidence: 0.8,
      relevance: 0.3,
      metadata: {}
    });
    
    // Setup two links with different priority scores
    mockParserImpl.prioritizeLinks.mockResolvedValueOnce({
      prioritizedLinks: ['https://example.com/careers', 'https://example.com/contact'],
      scores: { 
        'https://example.com/careers': 8.5, // Above threshold
        'https://example.com/contact': 7.0  // Below threshold
      }
    });
    
    customCrawler.crawlJobSite({ url });
    
    const options = mockPlaywrightCrawler.mock.calls[0][0];
    const requestHandler = options.requestHandler;
    
    // Setup mock page with link extraction
    const mockPage = {
      content: vi.fn().mockResolvedValue('<html>content</html>'),
      title: vi.fn().mockResolvedValue('About Us'),
      evaluate: vi.fn().mockResolvedValue('Company Info'),
      setViewportSize: vi.fn().mockResolvedValue(undefined),
      waitForLoadState: vi.fn().mockResolvedValue(undefined),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
      url: vi.fn().mockReturnValue(url)
    };
    
    mockPage.evaluate.mockImplementation((fn) => {
      if (typeof fn === 'function') {
        return { 
          href: ['https://example.com/careers', 'https://example.com/contact'], 
          text: ['Careers', 'Contact'], 
          title: ['', ''], 
          aria: ['', ''] 
        };
      }
      return 'Company Info';
    });
    
    const mockEnqueueLinks = vi.fn().mockResolvedValue({ processedRequests: [] });
    
    const mockContext = {
      request: { url, userData: { depth: 0 } },
      page: mockPage,
      enqueueLinks: mockEnqueueLinks,
      log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
    };
    
    await requestHandler(mockContext);
    
    expect(mockParserImpl.classifyPage).toHaveBeenCalledTimes(1);
    expect(mockParserImpl.prioritizeLinks).toHaveBeenCalledTimes(1);
    
    // Only the URL above threshold should be enqueued
    expect(mockEnqueueLinks).toHaveBeenCalledWith({
      urls: ['https://example.com/careers'],
      userData: expect.objectContaining({ depth: 1 })
    });
    
    // Verify the URL below threshold wasn't included
    expect(mockEnqueueLinks).not.toHaveBeenCalledWith(
      expect.objectContaining({
        urls: expect.arrayContaining(['https://example.com/contact'])
      })
    );
  });

  it('should collect detailed crawl results when enabled', async () => {
    const url = 'https://example.com/jobs';
    
    // Create crawler with detailed results enabled
    const detailedCrawler = new WebCrawler(mockParserImpl, mockLogger, {
      enableDetailedResults: true
    });
    
    mockPlaywrightCrawler.mockClear();
    mockParserImpl.classifyPage.mockClear();
    
    const jobData = { title: 'Test Job', organization: 'Test Co', description: 'Desc', url: 'https://example.com/jobs/1', dateScraped: expect.any(Date) };
    
    const classificationResult = { 
      pageType: PageType.JOB_LISTING, 
      confidence: 0.9,
      relevance: 0.8,
      metadata: { estimatedJobCount: 1 }
    };
    
    mockParserImpl.classifyPage.mockResolvedValueOnce(classificationResult);
    mockParserImpl.parseJobListingPage.mockResolvedValueOnce({ 
      jobs: [jobData], 
      links: [] 
    });
    
    detailedCrawler.crawlJobSite({ url });
    
    const options = mockPlaywrightCrawler.mock.calls[0][0];
    const requestHandler = options.requestHandler;
    
    const mockContext = {
      request: { url, userData: { depth: 0 } },
      page: {
        content: vi.fn().mockResolvedValue('<html>content</html>'),
        title: vi.fn().mockResolvedValue('Jobs Page'),
        evaluate: vi.fn().mockResolvedValue('Description'),
        setViewportSize: vi.fn().mockResolvedValue(undefined),
        waitForLoadState: vi.fn().mockResolvedValue(undefined),
        waitForTimeout: vi.fn().mockResolvedValue(undefined),
        url: vi.fn().mockReturnValue(url)
      },
      enqueueLinks: vi.fn().mockResolvedValue({ processedRequests: [] }),
      log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
    };
    
    await requestHandler(mockContext);
    
    // Access the internal detailedResults property
    const results = detailedCrawler['detailedResults'];
    
    expect(results).toBeDefined();
    if (results) {
      expect(results.visitedUrls).toContain(url);
      expect(results.pageClassifications && results.pageClassifications[url]).toEqual(classificationResult);
      expect(results.jobUrlsFound).toContain('https://example.com/jobs/1');
    }
  });
});