// packages/crawler/__tests__/integration/test-mocks.ts
import { vi } from 'vitest';
import { JobPostingData, CrawlJobOptions } from '../../src/types';
import { JobParserService } from '../../src/core/parser';

/**
 * MockPlaywrightCrawler - A mock implementation of WebCrawler for testing
 */
export class MockPlaywrightCrawler {
  private mockJobs: JobPostingData[] = [];
  
  constructor(private parser: JobParserService) {}
  
  /**
   * Set mock job data to be returned by the crawler
   */
  setMockJobs(jobs: JobPostingData[]): void {
    this.mockJobs = jobs;
  }
  
  /**
   * Mock implementation of crawlSite
   */
  async crawlSite(
    options: { sourceId: number; url: string; keywords?: string; maxJobs?: number },
    onProcessJob: (job: JobPostingData) => Promise<number>
  ): Promise<{ jobsFound: JobPostingData[]; jobsStored: number[] }> {
    const jobsFound: JobPostingData[] = [];
    const jobsStored: number[] = [];
    
    // Process each mock job
    for (const job of this.mockJobs) {
      const jobId = await onProcessJob(job);
      if (jobId > 0) {
        jobsFound.push(job);
        jobsStored.push(jobId);
      }
    }
    
    return { jobsFound, jobsStored };
  }
  
  /**
   * Mock implementation of crawlJobSite
   */
  async crawlJobSite(options: CrawlJobOptions): Promise<JobPostingData[]> {
    // If there are callback functions, call them
    if (options.onJobFound) {
      for (const job of this.mockJobs) {
        await options.onJobFound(job);
      }
    }
    
    if (options.onComplete) {
      await options.onComplete(this.mockJobs);
    }
    
    return this.mockJobs;
  }
  
  /**
   * Mock implementation of cancelCrawler
   */
  async cancelCrawler(sourceId: number): Promise<boolean> {
    return true;
  }
}

/**
 * Create mocked repositories for testing
 */
export function createMockRepositories() {
  return {
    jobSourceRepo: {
      getById: vi.fn(),
      updateStatus: vi.fn(),
      getSourcesForFrequency: vi.fn(),
      deactivateSourceJobs: vi.fn(),
      updateSourceAfterCrawl: vi.fn(),
      update: vi.fn()
    },
    jobPostingRepo: {
      insert: vi.fn(),
      update: vi.fn(),
      findByUrlAndSourceId: vi.fn(),
      findByTitleAndOrganization: vi.fn(),
      deactivateBySourceId: vi.fn(),
      getBySourceId: vi.fn(),
      getJobCountsBySourceIds: vi.fn()
    },
    cacheService: {
      checkCache: vi.fn(),
      copyJobsFromCache: vi.fn(),
      getOrCreateCacheEntry: vi.fn(),
      linkSourceToCache: vi.fn(),
      updateCacheEntry: vi.fn()
    }
  };
}

/**
 * Create a mock crawler instance
 */
export function createMockCrawler(parser: JobParserService): MockPlaywrightCrawler {
  return new MockPlaywrightCrawler(parser);
}

/**
 * Create a mock parser instance
 */
export function createMockParser() {
  return {
    parseJobsFromPage: vi.fn().mockResolvedValue([]),
    analyzeLinks: vi.fn().mockResolvedValue([])
  };
}