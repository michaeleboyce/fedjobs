// tests/integration/ScraperService.test.ts
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { ScraperService } from '../../src/services/scraper.service';
import { WebCrawler } from '../../src/core/crawler';
import { JobParserService } from '../../src/core/parser';
import { CacheService } from '../../src/services/cache.service';
import { Logger } from '../../src/utils/Logger';
import { setupTestDb, teardownTestDb } from '../helpers/db';
import { createMockPlaywrightPage } from '../helpers/mockPlaywright';
import { UrlNormalizationService } from '@fedjobs/utils';
import { AIService } from '@fedjobs/utils';

// Mock crawlee
vi.mock('crawlee', async () => {
  const actual = await vi.importActual('crawlee');
  return {
    ...(actual as object),
    PlaywrightCrawler: vi.fn().mockImplementation((options) => {
      return {
        run: vi.fn().mockImplementation(async (urls) => {
          // For each URL, simulate a crawler run
          for (const url of urls) {
            // Create a mock page
            const page = createMockPlaywrightPage(url);
            
            // Call requestHandler for each URL
            await options.requestHandler({
              request: { url },
              page,
              enqueueLinks: vi.fn().mockResolvedValue(undefined)
            });
          }
        }),
        stop: vi.fn().mockResolvedValue(undefined)
      };
    }),
    log: {
      setLevel: vi.fn()
    }
  };
});

// Create mock AIService for integration test
const createMockAIService = () => {
  const aiService = new AIService();
  
  // Mock generateText
  vi.spyOn(aiService, 'generateText').mockImplementation(async (options) => {
    // For job page parsing
    if (options.prompt.includes('Extract job listings from the following webpage content')) {
      return JSON.stringify([
        {
          title: 'Software Engineer',
          organization: 'TestCorp',
          description: 'This is a test job description.',
          url: 'https://example.com/jobs/123',
          employmentType: 'FULL_TIME'
        }
      ]);
    }
    
    // For link analysis
    if (options.prompt.includes('Analyze the following list of links')) {
      return JSON.stringify(['https://example.com/jobs/123']);
    }
    
    // For job validation
    if (options.prompt.includes('Determine if the following content is a legitimate job posting')) {
      return JSON.stringify({
        isLegitimateJob: true,
        confidence: 0.95,
        reasons: ['Has specific job title', 'Has job responsibilities']
      });
    }
    
    // Default empty response
    return '[]';
  });
  
  return aiService;
};

describe('ScraperService Integration', () => {
  let scraperService: ScraperService;
  let testSourceId: number;
  
  beforeAll(async () => {
    // Set up test database
    await setupTestDb();
    
    // Create test job source
    const mockJobSourceRepo = await import('@fedjobs/database').then(
      module => new module.JobSourceRepository()
    );
    
    const testSource = await mockJobSourceRepo.insert({
      userId: 'test-user',
      url: 'https://example.com/jobs',
      name: 'Test Job Source',
      keywords: 'software,engineering',
      status: 'ACTIVE',
      refreshFrequency: 'DAILY'
    });
    
    testSourceId = testSource.id;
    
    // Create services
    const logger = new Logger('TestCrawler');
    const aiService = createMockAIService();
    const parser = new JobParserService(aiService, logger);
    const crawler = new WebCrawler(parser, logger);
    const cacheService = new CacheService();
    const urlNormalizer = (url: string) => new UrlNormalizationService().normalizeUrl(url);
    
    scraperService = new ScraperService(
      crawler,
      parser,
      cacheService,
      logger,
      urlNormalizer
    );
  });
  
  afterAll(async () => {
    await teardownTestDb();
  });
  
  it('should refresh a job source and store job postings', async () => {
    const result = await scraperService.refreshJobSource(testSourceId);
    
    expect(result.sourceId).toBe(testSourceId);
    expect(result.jobsFound).toBeGreaterThan(0);
    expect(result.error).toBeUndefined();
    
    // Check that jobs were stored in database
    const jobPostingRepo = await import('@fedjobs/database').then(
      module => new module.JobPostingRepository()
    );
    
    const storedJobs = await jobPostingRepo.getBySourceId(testSourceId);
    expect(storedJobs.length).toBeGreaterThan(0);
    expect(storedJobs[0].title).toBe('Software Engineer');
    expect(storedJobs[0].organization).toBe('TestCorp');
  });
  
  it('should cancel refresh of a job source', async () => {
    // Start refresh in background
    const refreshPromise = scraperService.refreshJobSource(testSourceId);
    
    // Cancel it immediately
    const cancelResult = await scraperService.cancelRefresh(testSourceId);
    expect(cancelResult).toBe(true);
    
    // Make sure original refresh completes without error
    const result = await refreshPromise;
    expect(result.sourceId).toBe(testSourceId);
    
    // Check job source status was updated to ACTIVE
    const jobSourceRepo = await import('@fedjobs/database').then(
      module => new module.JobSourceRepository()
    );
    
    const source = await jobSourceRepo.getById(testSourceId);
    expect(source?.status).toBe('ACTIVE');
  });
  
  it('should schedule refresh for sources with specified frequency', async () => {
    // Test scheduleRefresh
    await scraperService.scheduleRefresh('DAILY');
    
    // Check that the job source was refreshed
    const jobSourceRepo = await import('@fedjobs/database').then(
      module => new module.JobSourceRepository()
    );
    
    const source = await jobSourceRepo.getById(testSourceId);
    expect(source?.lastScraped).not.toBeNull();
  });
})