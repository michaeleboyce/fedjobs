// tests/performance/Crawler.perf.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { CrawlerFactory } from '../../src/CrawlerFactory';
import { JobSourceRepository, JobPostingRepository } from '@fedjobs/database';
import { setupTestDb, teardownTestDb } from '../helpers/db';

// Performance test for crawler
// Only runs in CI with PERF_TEST env var set
const shouldRunPerfTests = process.env.PERF_TEST === 'true';
const testFn = shouldRunPerfTests ? it : it.skip;

describe('Crawler Performance', () => {
  let testSourceId: number;
  
  beforeAll(async () => {
    if (!shouldRunPerfTests) return;
    
    // Set up test database
    await setupTestDb();
    
    // Create test job source
    const jobSourceRepo = new JobSourceRepository();
    
    const testSource = await jobSourceRepo.insert({
      userId: 'test-user',
      url: 'https://example.com/jobs',
      name: 'Performance Test Source',
      keywords: 'software,engineering',
      status: 'ACTIVE',
      refreshFrequency: 'DAILY'
    });
    
    testSourceId = testSource.id;
  });
  
  afterAll(async () => {
    if (!shouldRunPerfTests) return;
    await teardownTestDb();
  });
  
  testFn('should handle large number of jobs efficiently', async () => {
    // Create scraper with factory
    const scraperService = CrawlerFactory.createScraperService({
      maxConcurrency: 5, // Higher concurrency for performance test
      navigationTimeoutSecs: 60
    });
    
    // Mock the crawler to simulate high volume
    const crawler = (scraperService as any).crawler;
    
    // Generate a large number of test jobs
    const testJobs = Array.from({ length: 100 }, (_, i) => ({
      title: `Performance Test Job ${i}`,
      organization: 'Test Corp',
      description: `This is performance test job ${i}. It contains a sufficiently long description to simulate a realistic job posting that would be found on a typical job website.`,
      url: `https://example.com/jobs/${i}`,
      location: i % 2 === 0 ? 'Remote' : 'Washington, DC',
      salary: i % 3 === 0 ? '$100,000 - $150,000' : undefined,
      requirements: i % 4 === 0 ? 'Bachelor\'s degree, 3+ years experience' : undefined,
      employmentType: ['FULL_TIME', 'PART_TIME', 'CONTRACT'][i % 3],
      dateScraped: new Date()
    }));
    
    // Override crawlJobSite to simulate finding many jobs
    crawler.crawlJobSite = async (options: any) => {
      // Start perf measurement
      const startTime = performance.now();
      
      // Process all test jobs
      for (const job of testJobs) {
        if (options.onJobFound) {
          await options.onJobFound(job);
        }
      }
      
      if (options.onComplete) {
        await options.onComplete(testJobs);
      }
      
      const endTime = performance.now();
      console.log(`Processed ${testJobs.length} jobs in ${(endTime - startTime).toFixed(2)}ms`);
      
      return [];
    };
    
    // Test the refreshJobSource method with timing
    const overallStart = performance.now();
    const result = await scraperService.refreshJobSource(testSourceId);
    const overallEnd = performance.now();
    
    const totalTime = overallEnd - overallStart;
    console.log(`Total refresh time: ${totalTime.toFixed(2)}ms`);
    console.log(`Average time per job: ${(totalTime / testJobs.length).toFixed(2)}ms`);
    
    expect(result.sourceId).toBe(testSourceId);
    expect(result.jobsFound).toBe(testJobs.length);
    expect(result.error).toBeUndefined();
    
    // Verify jobs were stored
    const jobPostingRepo = new JobPostingRepository();
    const jobs = await jobPostingRepo.getBySourceId(testSourceId);
    
    expect(jobs.length).toBe(testJobs.length);
    
    // Performance assertions
    expect(totalTime).toBeLessThan(30000); // Should complete in under 30 seconds
  }, 60000); // Increase timeout for performance test
  
  testFn('should efficiently use cache system', async () => {
    // Create scraper with factory
    const scraperService = CrawlerFactory.createScraperService();
    
    // First run - populate cache
    const crawler = (scraperService as any).crawler;
    crawler.crawlJobSite = async (options: any) => {
      if (options.onJobFound) {
        await options.onJobFound({
          title: 'Cache Test Job',
          organization: 'Test Corp',
          description: 'This is a test job for the cache performance test.',
          url: 'https://example.com/jobs/cache-test',
          dateScraped: new Date()
        });
      }
      return [];
    };
    
    console.log('Running first pass to populate cache...');
    const firstRunStart = performance.now();
    const firstResult = await scraperService.refreshJobSource(testSourceId);
    const firstRunEnd = performance.now();
    const firstRunTime = firstRunEnd - firstRunStart;
    
    console.log(`First run (no cache) time: ${firstRunTime.toFixed(2)}ms`);
    
    // Force cache usage in second run
    console.log('Running second pass using cache...');
    const secondRunStart = performance.now();
    const secondResult = await scraperService.refreshJobSource(testSourceId, {}, false);
    const secondRunEnd = performance.now();
    const secondRunTime = secondRunEnd - secondRunStart;
    
    console.log(`Second run (with cache) time: ${secondRunTime.toFixed(2)}ms`);
    
    // Cache should be faster
    expect(secondRunTime).toBeLessThan(firstRunTime);
    expect(secondResult.usedCache).toBe(true);
  }, 60000);
});