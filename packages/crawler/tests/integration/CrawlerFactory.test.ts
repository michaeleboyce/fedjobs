// tests/integration/CrawlerFactory.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { CrawlerFactory } from '../../src/CrawlerFactory';
import { setupTestDb, teardownTestDb } from '../helpers/db';

// This is an end-to-end integration test for the crawler factory

describe('CrawlerFactory Integration', () => {
  let testSourceId: number;
  
  beforeAll(async () => {
    // Set up test database
    await setupTestDb();
    
    // Create test job source
    const { JobSourceRepository } = await import('@fedjobs/database');
    const jobSourceRepo = new JobSourceRepository();
    
    const testSource = await jobSourceRepo.insert({
      userId: 'test-user',
      url: 'https://example.com/jobs',
      name: 'Factory Test Source',
      keywords: 'software,engineering',
      status: 'ACTIVE',
      refreshFrequency: 'DAILY'
    });
    
    testSourceId = testSource.id;
  });
  
  afterAll(async () => {
    await teardownTestDb();
  });
  
  it('should create a working scraper service', () => {
    const scraperService = CrawlerFactory.createScraperService();
    expect(scraperService).toBeDefined();
  });
  
  it('should create scraper service with custom config', () => {
    const scraperService = CrawlerFactory.createScraperService({
      maxConcurrency: 1,
      navigationTimeoutSecs: 30,
      logLevel: 'debug'
    });
    
    expect(scraperService).toBeDefined();
  });
  
  it('should be able to refresh a job source', async () => {
    // Create scraper with factory
    const scraperService = CrawlerFactory.createScraperService();
    
    // Mock the crawler to prevent actual HTTP requests during testing
    const crawler = (scraperService as any).crawler;
    
    // Override crawlJobSite to simulate finding a job
    crawler.crawlJobSite = async (options: any) => {
      if (options.onJobFound) {
        await options.onJobFound({
          title: 'Factory Test Job',
          organization: 'Test Corp',
          description: 'This is a test job for the factory integration test.',
          url: 'https://example.com/jobs/123',
          dateScraped: new Date()
        });
      }
      
      if (options.onComplete) {
        await options.onComplete([{
          title: 'Factory Test Job',
          organization: 'Test Corp',
          description: 'This is a test job for the factory integration test.',
          url: 'https://example.com/jobs/123',
          dateScraped: new Date()
        }]);
      }
      
      return [];
    };
    
    // Test the refreshJobSource method
    const result = await scraperService.refreshJobSource(testSourceId);
    
    expect(result.sourceId).toBe(testSourceId);
    expect(result.jobsFound).toBeGreaterThan(0);
    expect(result.error).toBeUndefined();
    
    // Verify job was stored
    const { JobPostingRepository } = await import('@fedjobs/database');
    const jobPostingRepo = new JobPostingRepository();
    
    const jobs = await jobPostingRepo.getBySourceId(testSourceId);
    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs[0].title).toBe('Factory Test Job');
  });
});