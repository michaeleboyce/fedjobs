// packages/crawler/__tests__/integration/openai-crawl.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { getTestConfig, DEFAULT_CONFIG, TestConfig } from '../../src/test/config';
import { setupTestEnvironment, cleanupTestEnvironment } from '../../src/test/setup';
import { createTestServices } from '../../src/test/factory';
import { JobPostingData } from '../../src/types';

// Load test configuration
let config = getTestConfig();

// Override configuration based on environment variable
if (process.env.INTEGRATION_TEST_MODE === 'real') {
  config = { 
    ...config, 
    useMocks: false,
    useRealCrawler: true,
    useRealParser: true,
    useRealAI: true
  };
} else if (process.env.INTEGRATION_TEST_MODE === 'mock') {
  config = { 
    ...config, 
    useMocks: true,
    useRealCrawler: false,
    useRealParser: false,
    useRealAI: false
  };
}

// Test data
const testSourceId = 123;
const testUrl = config.defaultTestUrl;

describe('OpenAI Careers Crawler Integration Test', () => {
  // Test services
  let services: ReturnType<typeof createTestServices>;
  
  beforeAll(async () => {
    // Setup test environment based on configuration
    await setupTestEnvironment(config);
    console.log(`Running tests with config: ${JSON.stringify(config, null, 2)}`);
  });
  
  afterAll(async () => {
    await cleanupTestEnvironment(config);
  });
  
  beforeEach(async () => {
    // Initialize services based on configuration
    services = createTestServices(config);
    
    if (!config.useMocks) {
      // If using real services, ensure test source exists
      try {
        const existingSource = await services.jobSourceRepo.getById(testSourceId);
        if (!existingSource) {
          throw new Error('Source not found');
        }
      } catch (error) {
        // Create a test source record if it doesn't exist
        await services.jobSourceRepo.insert({
          id: testSourceId,
          url: testUrl,
          name: 'OpenAI Careers',
          keywords: 'ai, machine learning',
          status: 'ACTIVE',
          userId: 'test-user'
        });
      }
    }
  });
  
  describe('OpenAI Careers Crawler', () => {
    it('should crawl OpenAI careers page and find job postings', async () => {
      // This test will use either real or mock crawler based on configuration
      const timeout = config.useMocks ? 10000 : 120000;
      vi.setConfig({ testTimeout: timeout });
      
      // Track processed jobs
      const processedJobs: JobPostingData[] = [];
      const jobIds: number[] = [];
      
      // Execute the crawl
      const result = await services.webCrawler.crawlSite(
        {
          sourceId: testSourceId,
          url: testUrl,
          keywords: 'ai',
          maxJobs: config.useMocks ? 10 : 5 // Limit to 5 jobs for real crawls
        },
        async (job: JobPostingData) => {
          processedJobs.push(job);
          
          if (config.useMocks) {
            // For mocks, just return an incremented ID
            const mockId = 1000 + processedJobs.length;
            jobIds.push(mockId);
            return mockId;
          } else {
            // For real tests, use the processor but don't actually insert
            // to avoid polluting the database
            const mockId = 2000 + processedJobs.length;
            jobIds.push(mockId);
            return mockId;
          }
        }
      );
      
      // Verify results
      expect(result.jobsFound.length).toBeGreaterThan(0);
      expect(processedJobs.length).toBeGreaterThan(0);
      expect(result.jobsStored.length).toBe(processedJobs.length);
      
      // Log jobs found for diagnostic purposes
      console.log(`Crawler found ${result.jobsFound.length} jobs on OpenAI careers page`);
      console.log('Job titles:', result.jobsFound.map(job => job.title).join(', '));
    });
  });
  
  describe('OpenAI Careers Source Refresh', () => {
    it('should refresh OpenAI careers source', async () => {
      // This test will use either real or mock services based on configuration
      const timeout = config.useMocks ? 10000 : 180000;
      vi.setConfig({ testTimeout: timeout });
      
      // Track callback executions
      const callbackTracker = {
        jobFoundCount: 0,
        completeInvoked: false,
        jobsFromComplete: [] as JobPostingData[]
      };
      
      // Execute the refresh
      const result = await services.scraperService.refreshJobSource(
        testSourceId,
        {
          onJobFound: async () => { callbackTracker.jobFoundCount++; },
          onComplete: async (jobs: JobPostingData[]) => { 
            callbackTracker.completeInvoked = true;
            callbackTracker.jobsFromComplete = jobs;
          }
        },
        config.useMocks // Force refresh for mocks, use cache for real tests
      );
      
      // Verify results
      expect(result.jobsFound).toBeGreaterThan(0);
      expect(callbackTracker.jobFoundCount).toBeGreaterThan(0);
      expect(callbackTracker.completeInvoked).toBe(true);
      
      // Log results for diagnostic purposes
      console.log(`ScraperService refresh found ${result.jobsFound} jobs`);
      console.log(`Used cache: ${result.usedCache}`);
      
      if (callbackTracker.jobsFromComplete.length > 0) {
        console.log('Job titles from callback:', callbackTracker.jobsFromComplete.map(job => job.title).join(', '));
      }
      
      // Additional tests for real services
      if (!config.useMocks) {
        // If using real services, verify repository calls
        expect(services.jobSourceRepo.updateStatus).toHaveBeenCalledTimes(2);
        expect(services.jobPostingRepo.deactivateBySourceId).toHaveBeenCalledWith(testSourceId);
      }
    });
  });
});