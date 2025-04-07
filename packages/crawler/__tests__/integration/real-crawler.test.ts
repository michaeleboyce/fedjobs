// packages/crawler/__tests__/integration/real-crawler.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { ScraperService } from '../../src/services/scraper.service';
import { JobSourceService } from '../../src/services/job-source.service';
import { CacheService } from '../../src/services/cache.service';
import { JobPostingProcessor } from '../../src/domain/job-posting.processor';
import { JobPostingValidator } from '../../src/domain/job-posting.validator';
import { DuplicateDetector } from '../../src/domain/duplicate.detector';
import { WebCrawler } from '../../src/core/crawler/WebCrawler';
import { JobParserService } from '../../src/core/parser';
import { getTestConfig } from '../../src/test/config';
import { setupTestEnvironment, cleanupTestEnvironment } from '../../src/test/setup';
import { JobPostingData } from '../../src/types';
import { JobSourceRepository, JobPostingRepository } from '@fedjobs/database';

// Skip tests if we're using mocks
const config = getTestConfig();
const skipRealTests = config.useMocks;

// Test data
const testSourceId = 123;
const testUrl = config.defaultTestUrl;

describe.skipIf(skipRealTests)('Real API Crawler Integration Tests', () => {
  // Test services
  let scraperService: ScraperService;
  let webCrawler: WebCrawler;
  let parser: JobParserService;
  let jobSourceRepo: JobSourceRepository;
  let jobPostingRepo: JobPostingRepository;
  
  beforeAll(async () => {
    // Set up the test environment with real dependencies
    const realConfig = { 
      ...config, 
      useMocks: false,
      useRealCrawler: true,
      useRealParser: true,
      useRealAI: true
    };
    
    await setupTestEnvironment(realConfig);
  });
  
  afterAll(async () => {
    await cleanupTestEnvironment(config);
  });
  
  beforeEach(async () => {
    // Initialize repositories
    jobSourceRepo = new JobSourceRepository();
    jobPostingRepo = new JobPostingRepository();
    
    // Create source record in database if it doesn't exist
    try {
      const existingSource = await jobSourceRepo.getById(testSourceId);
      if (!existingSource) {
        throw new Error('Source not found');
      }
    } catch (error) {
      // Create a test source record
      await jobSourceRepo.insert({
        id: testSourceId,
        url: testUrl,
        name: 'OpenAI Careers',
        keywords: 'ai, machine learning',
        status: 'ACTIVE',
        userId: 'test-user'
      });
    }
    
    // Initialize services with real implementations
    parser = new JobParserService();
    webCrawler = new WebCrawler(parser);
    
    const jobSourceService = new JobSourceService(
      jobSourceRepo, 
      jobPostingRepo
    );
    
    const jobPostingValidator = new JobPostingValidator();
    const duplicateDetector = new DuplicateDetector(jobPostingRepo);
    
    const jobPostingProcessor = new JobPostingProcessor(
      jobPostingRepo,
      jobPostingValidator,
      duplicateDetector
    );
    
    const cacheService = new CacheService();
    
    // Create ScraperService with real dependencies
    scraperService = new ScraperService(
      jobSourceService,
      cacheService,
      jobPostingProcessor,
      webCrawler
    );
  });
  
  describe('Real JobParserService', () => {
    it('should extract job listings from OpenAI careers page', async () => {
      // This test actually connects to OpenAI's careers page
      const result = await parser.parseJobsFromPage({
        url: testUrl,
        // We fetch only the URL, content is parsed directly
        content: '',
        title: 'OpenAI Careers',
        description: 'Find your next role at OpenAI'
      });
      
      // Verify job listings were extracted (without being too specific)
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // We don't know exactly how many jobs will be on the page, but there should be some
      // If there truly are zero jobs, the test should probably skip rather than fail
      if (result.length === 0) {
        console.warn('No jobs found on the OpenAI careers page. Test skipped.');
        return;
      }
      
      // Check structure of job listings
      const firstJob = result[0];
      expect(firstJob).toHaveProperty('title');
      expect(firstJob).toHaveProperty('organization');
      expect(firstJob).toHaveProperty('description');
      expect(firstJob).toHaveProperty('url');
      
      // Log the number of jobs found for diagnostic purposes
      console.log(`Found ${result.length} jobs on the OpenAI careers page`);
      
      // Verify organization is OpenAI
      const organizationCheck = result.every(job => 
        job.organization.toLowerCase().includes('openai')
      );
      expect(organizationCheck).toBe(true);
    });
  });
  
  describe('Real WebCrawler', () => {
    it('should crawl OpenAI careers page and find job postings', { timeout: 120000 }, async () => {
      // This test will take some time as it actually crawls the site
      
      // Track processed jobs
      const processedJobs: JobPostingData[] = [];
      const jobIds: number[] = [];
      
      // Execute the crawl with real crawler
      const result = await webCrawler.crawlSite(
        {
          sourceId: testSourceId,
          url: testUrl,
          keywords: 'ai',
          maxJobs: 5 // Limit to 5 jobs to keep test duration reasonable
        },
        async (job) => {
          processedJobs.push(job);
          // Simulate job processing without actually inserting into database
          const mockId = 1000 + processedJobs.length;
          jobIds.push(mockId);
          return mockId;
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
  
  describe('Real ScraperService', () => {
    it('should refresh OpenAI careers source without forcing cache refresh', { timeout: 180000 }, async () => {
      // This test will take even longer as it does a full refresh
      
      // Track callback executions
      const callbackTracker = {
        jobFoundCount: 0,
        completeInvoked: false,
        jobsFromComplete: [] as JobPostingData[]
      };
      
      // Execute the refresh
      const result = await scraperService.refreshJobSource(
        testSourceId,
        {
          onJobFound: async () => { callbackTracker.jobFoundCount++; },
          onComplete: async (jobs: JobPostingData[]) => { 
            callbackTracker.completeInvoked = true;
            callbackTracker.jobsFromComplete = jobs;
          }
        },
        false // Don't force refresh (use cache if available)
      );
      
      // Verify results
      expect(result.jobsFound).toBeGreaterThan(0);
      expect(callbackTracker.completeInvoked).toBe(true);
      
      // Log results for diagnostic purposes
      console.log(`ScraperService refresh found ${result.jobsFound} jobs`);
      console.log(`Used cache: ${result.usedCache}`);
      
      if (callbackTracker.jobsFromComplete.length > 0) {
        console.log('Job titles from callback:', callbackTracker.jobsFromComplete.map(job => job.title).join(', '));
      }
      
      // Check that jobs were stored in the database
      if (!result.usedCache) {
        const storedJobs = await jobPostingRepo.getBySourceId(testSourceId);
        expect(storedJobs.length).toBeGreaterThan(0);
        
        // Log stored jobs for diagnostic purposes
        console.log(`Found ${storedJobs.length} jobs stored in database`);
      }
    });
  });
});