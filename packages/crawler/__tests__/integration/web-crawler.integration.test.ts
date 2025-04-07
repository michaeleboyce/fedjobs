// packages/crawler/__tests__/integration/web-crawler.integration.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { WebCrawler } from '../../src/core/crawler/WebCrawler';
import { JobParserService } from '../../src/core/parser';
import { ScraperService } from '../../src/services/scraper.service';
import { JobSourceService } from '../../src/services/job-source.service';
import { CacheService } from '../../src/services/cache.service';
import { JobPostingProcessor } from '../../src/domain/job-posting.processor';
import { JobPostingValidator } from '../../src/domain/job-posting.validator';
import { DuplicateDetector } from '../../src/domain/duplicate.detector';
import { 
  createTestEnvironment, 
  cleanupTestEnvironment, 
  getTestConfig 
} from './test-environment';
import { 
  createMockRepositories, 
  createMockCrawler, 
  createMockParser,
  MockPlaywrightCrawler  
} from './test-mocks';
import { mockJobSite, mockJobPostings } from './test-data';

// Test configuration
const config = getTestConfig();

describe('Web Crawler Integration', () => {
  // Test services and components
  let webCrawler: WebCrawler;
  let scraperService: ScraperService;
  let mockRepositories: any;
  let testSourceId: number;
  
  // Setup before all tests
  beforeAll(async () => {
    // Initialize the test environment
    await createTestEnvironment(config);
    
    // Create source ID for testing
    testSourceId = 123; // We'll use a fixed ID for tests
  });
  
  // Cleanup after all tests
  afterAll(async () => {
    await cleanupTestEnvironment();
  });
  
  // Reset services before each test
  beforeEach(async () => {
    // Create mocked or real repositories based on config
    if (config.useMocks) {
      // Setup with mocks
      mockRepositories = createMockRepositories();
      
      const jobSourceService = new JobSourceService(
        mockRepositories.jobSourceRepo, 
        mockRepositories.jobPostingRepo
      );
      
      const jobPostingValidator = new JobPostingValidator();
      const duplicateDetector = new DuplicateDetector(mockRepositories.jobPostingRepo);
      
      const jobPostingProcessor = new JobPostingProcessor(
        mockRepositories.jobPostingRepo,
        jobPostingValidator,
        duplicateDetector
      );
      
      const cacheService = new CacheService();
      
      // Create mock or real parser based on config
      const parser = config.useRealParser 
        ? new JobParserService() 
        : createMockParser();
      
      // Create mock or real WebCrawler based on config
      webCrawler = config.useRealCrawler 
        ? new WebCrawler(parser) 
        : createMockCrawler(parser);
      
      // Create ScraperService with mocked dependencies
      scraperService = new ScraperService(
        jobSourceService,
        cacheService,
        jobPostingProcessor,
        webCrawler
      );
      
      // Setup mock data
      if (config.useMocks) {
        mockRepositories.jobSourceRepo.getById.mockResolvedValue({
          id: testSourceId,
          url: mockJobSite.url,
          name: 'Test Source',
          keywords: 'test, jobs',
          status: 'ACTIVE'
        });
      }
    } else {
      // Setup with real dependencies
      // Note: This would require a real database connection
      // and possibly other real services
      throw new Error('Real integration tests not implemented yet');
    }
  });
  
  // Clean up after each test
  afterEach(async () => {
    // Reset or clean up any state
    if (config.useMocks) {
      // Reset mock calls
      Object.values(mockRepositories).forEach((repo: any) => {
        Object.values(repo).forEach((fn: any) => {
          if (typeof fn === 'function' && fn.mockReset) {
            fn.mockReset();
          }
        });
      });
    }
  });
  
  describe('WebCrawler', () => {
    it('should crawl job sites and find job postings', async () => {
      // Skip if using real crawler (would need a more complex setup)
      if (!config.useMocks) {
        return;
      }
      
      // Setup mock behavior for crawler
      if (webCrawler instanceof MockPlaywrightCrawler) {
        webCrawler.setMockJobs(mockJobPostings);
      }
      
      // Track processed jobs
      const processedJobs: any[] = [];
      
      // Execute the crawl
      const result = await webCrawler.crawlSite(
        {
          sourceId: testSourceId,
          url: mockJobSite.url,
          keywords: 'test'
        },
        async (job) => {
          processedJobs.push(job);
          return processedJobs.length; // Return a job ID
        }
      );
      
      // Verify results
      expect(result.jobsFound.length).toBeGreaterThan(0);
      expect(processedJobs.length).toBe(mockJobPostings.length);
      expect(result.jobsStored.length).toBe(mockJobPostings.length);
    });
  });
  
  describe('ScraperService', () => {
    it('should refresh a job source', async () => {
      // Skip if using real services (would need a more complex setup)
      if (!config.useMocks) {
        return;
      }
      
      // Setup mock behavior
      if (config.useMocks) {
        // Setup mock repositories to return expected data
        mockRepositories.jobSourceRepo.getById.mockResolvedValue({
          id: testSourceId,
          url: mockJobSite.url,
          name: 'Test Source',
          keywords: 'test',
          status: 'ACTIVE'
        });
        
        // Set up crawler to return mock job postings
        if (webCrawler instanceof MockPlaywrightCrawler) {
          webCrawler.setMockJobs(mockJobPostings);
        }
      }
      
      // Track callback executions
      const callbackTracker = {
        jobFound: 0,
        complete: false
      };
      
      // Execute the refresh
      const result = await scraperService.refreshJobSource(
        testSourceId,
        {
          onJobFound: async () => { callbackTracker.jobFound++; },
          onComplete: async () => { callbackTracker.complete = true; }
        },
        true // Force fresh crawl
      );
      
      // Verify results
      expect(result.jobsFound).toBeGreaterThan(0);
      expect(result.usedCache).toBe(false);
      expect(callbackTracker.jobFound).toBe(mockJobPostings.length);
      expect(callbackTracker.complete).toBe(true);
      
      // Verify repository calls
      if (config.useMocks) {
        expect(mockRepositories.jobSourceRepo.updateSourceStatus).toHaveBeenCalledWith(
          testSourceId, 'PENDING'
        );
        expect(mockRepositories.jobPostingRepo.deactivateBySourceId).toHaveBeenCalledWith(
          testSourceId
        );
        expect(mockRepositories.jobSourceRepo.updateSourceAfterCrawl).toHaveBeenCalledWith(
          testSourceId
        );
      }
    });
    
    it('should use cache when available', async () => {
      // Skip if using real services (would need a more complex setup)
      if (!config.useMocks) {
        return;
      }
      
      // Setup mock behavior for cache
      if (config.useMocks) {
        // Mock source with no global cache ID yet
        mockRepositories.jobSourceRepo.getById.mockResolvedValue({
          id: testSourceId,
          url: mockJobSite.url,
          name: 'Test Source',
          globalCacheId: null
        });
        
        // Mock cache service to return a cache entry
        mockRepositories.cacheService.checkCache.mockResolvedValue({
          id: 456,
          url: mockJobSite.url
        });
        
        // Mock that we copied 10 jobs from cache
        mockRepositories.cacheService.copyJobsFromCache.mockResolvedValue(10);
      }
      
      // Execute the refresh without forcing
      const result = await scraperService.refreshJobSource(
        testSourceId,
        {},
        false // Don't force refresh
      );
      
      // Verify results
      expect(result.usedCache).toBe(true);
      expect(result.jobsFound).toBe(10);
      
      // Verify cache-related calls
      if (config.useMocks) {
        expect(mockRepositories.cacheService.checkCache).toHaveBeenCalledWith(mockJobSite.url);
        expect(mockRepositories.cacheService.copyJobsFromCache).toHaveBeenCalledWith(testSourceId, 456);
        // Should not call crawler when using cache
        expect(webCrawler.crawlSite).not.toHaveBeenCalled();
      }
    });
  });
});