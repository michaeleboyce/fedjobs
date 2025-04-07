// packages/crawler/src/test/factory.ts
import { JobParserService } from '../core/parser';
import { WebCrawler } from '../core/crawler/WebCrawler';
import { JobSourceService } from '../services/job-source.service';
import { CacheService } from '../services/cache.service';
import { JobPostingProcessor } from '../domain/job-posting.processor';
import { JobPostingValidator } from '../domain/job-posting.validator';
import { DuplicateDetector } from '../domain/duplicate.detector';
import { ScraperService } from '../services/scraper.service';
import { TestConfig } from './config';
import { JobSourceRepository, JobPostingRepository } from '@fedjobs/database';
import { AIService } from '@fedjobs/utils';
import { vi } from 'vitest';
import { JobPostingData } from '../types';

/**
 * Creates mock or real dependencies based on configuration
 */
export function createTestServices(config: TestConfig) {
  // Create repositories (real or mock)
  const jobSourceRepo = createJobSourceRepository(config);
  const jobPostingRepo = createJobPostingRepository(config);
  
  // Create AI service (real or mock)
  const aiService = createAIService(config);
  
  // Create validators and processors
  const jobPostingValidator = new JobPostingValidator(aiService);
  const duplicateDetector = new DuplicateDetector(jobPostingRepo);
  
  const jobPostingProcessor = new JobPostingProcessor(
    jobPostingRepo,
    jobPostingValidator,
    duplicateDetector
  );
  
  // Create services
  const jobSourceService = new JobSourceService(jobSourceRepo, jobPostingRepo);
  const cacheService = createCacheService(config);
  
  // Create parser (real or mock)
  const parser = createParser(config, aiService);
  
  // Create crawler (real or mock)
  const webCrawler = createWebCrawler(config, parser);
  
  // Create main service
  const scraperService = new ScraperService(
    jobSourceService,
    cacheService,
    jobPostingProcessor,
    webCrawler
  );
  
  return {
    jobSourceRepo,
    jobPostingRepo,
    aiService,
    jobPostingValidator,
    duplicateDetector,
    jobPostingProcessor,
    jobSourceService,
    cacheService,
    parser,
    webCrawler,
    scraperService
  };
}

/**
 * Creates JobSourceRepository based on configuration
 */
function createJobSourceRepository(config: TestConfig): JobSourceRepository {
  if (!config.useMocks || config.useRealDatabase) {
    return new JobSourceRepository();
  }
  
  // Mock repository
  const mockRepo = {
    getById: vi.fn(),
    updateStatus: vi.fn(),
    getSourcesForScheduledRefresh: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn()
  };
  
  // Setup default mock responses
  mockRepo.getById.mockImplementation((id: number) => ({
    id,
    url: config.defaultTestUrl,
    name: 'OpenAI Careers Test',
    status: 'ACTIVE',
    userId: 'test-user'
  }));
  
  return mockRepo as unknown as JobSourceRepository;
}

/**
 * Creates JobPostingRepository based on configuration
 */
function createJobPostingRepository(config: TestConfig): JobPostingRepository {
  if (!config.useMocks || config.useRealDatabase) {
    return new JobPostingRepository();
  }
  
  // Mock repository
  const mockRepo = {
    insert: vi.fn(),
    update: vi.fn(),
    deactivateBySourceId: vi.fn(),
    getBySourceId: vi.fn(),
    getJobCountsBySourceIds: vi.fn(),
    findByUrlAndSourceId: vi.fn(),
    findByTitleAndOrganization: vi.fn()
  };
  
  // Setup default mock implementations
  mockRepo.insert.mockImplementation((data: any) => 
    Promise.resolve({ ...data, id: Math.floor(Math.random() * 1000) + 1 })
  );
  
  return mockRepo as unknown as JobPostingRepository;
}

/**
 * Creates AIService based on configuration
 */
function createAIService(config: TestConfig): AIService {
  if (!config.useMocks || config.useRealAI) {
    return new AIService();
  }
  
  // Mock AI service
  return {
    generateText: vi.fn().mockImplementation(async ({ prompt }) => {
      // Simple regex-based mock response generator
      if (prompt.includes('job listing')) {
        return JSON.stringify([
          {
            title: 'Software Engineer',
            organization: 'OpenAI',
            description: 'Join our team to build cutting-edge AI technology.',
            url: 'https://openai.com/careers/software-engineer',
            location: 'San Francisco, CA',
            employmentType: 'FULL_TIME'
          }
        ]);
      }
      
      // Default empty response
      return JSON.stringify([]);
    })
  } as unknown as AIService;
}

/**
 * Creates CacheService based on configuration
 */
function createCacheService(config: TestConfig): CacheService {
  const cacheService = new CacheService();
  
  if (config.useMocks) {
    // Add mock methods to the real CacheService instance
    Object.assign(cacheService, {
      checkCache: vi.fn(),
      copyJobsFromCache: vi.fn(),
      getOrCreateCacheEntry: vi.fn(),
      linkSourceToCache: vi.fn(),
      updateCacheEntry: vi.fn()
    });
  }
  
  return cacheService;
}

/**
 * Creates JobParserService based on configuration
 */
function createParser(config: TestConfig, aiService: AIService): JobParserService {
  if (!config.useMocks || config.useRealParser) {
    return new JobParserService({ aiService });
  }
  
  // Create parser with mocked methods
  const parser = new JobParserService({ aiService });
  
  // Mock parser methods
  vi.spyOn(parser, 'parseJobsFromPage').mockImplementation(async () => {
    return [
      {
        title: 'Software Engineer',
        organization: 'OpenAI',
        description: 'Join our team to build cutting-edge AI technology.',
        url: 'https://openai.com/careers/software-engineer',
        location: 'San Francisco, CA',
        employmentType: 'FULL_TIME',
        dateScraped: new Date()
      },
      {
        title: 'Research Scientist',
        organization: 'OpenAI',
        description: 'Conduct frontier research in artificial intelligence.',
        url: 'https://openai.com/careers/research-scientist',
        location: 'San Francisco, CA',
        employmentType: 'FULL_TIME',
        dateScraped: new Date()
      }
    ];
  });
  
  vi.spyOn(parser, 'analyzeLinks').mockResolvedValue([]);
  
  return parser;
}

/**
 * Creates WebCrawler based on configuration
 */
function createWebCrawler(config: TestConfig, parser: JobParserService): WebCrawler {
  if (!config.useMocks || config.useRealCrawler) {
    return new WebCrawler(parser);
  }
  
  // Create crawler with mocked methods
  const crawler = new WebCrawler(parser);
  
  // Define mock jobs
  const mockJobs: JobPostingData[] = [
    {
      title: 'Software Engineer',
      organization: 'OpenAI',
      description: 'Join our team to build cutting-edge AI technology.',
      url: 'https://openai.com/careers/software-engineer',
      location: 'San Francisco, CA',
      employmentType: 'FULL_TIME',
      dateScraped: new Date()
    },
    {
      title: 'Research Scientist',
      organization: 'OpenAI',
      description: 'Conduct frontier research in artificial intelligence.',
      url: 'https://openai.com/careers/research-scientist',
      location: 'San Francisco, CA',
      employmentType: 'FULL_TIME',
      dateScraped: new Date()
    }
  ];
  
  // Mock crawlSite method
  vi.spyOn(crawler, 'crawlSite').mockImplementation(async (options, callback) => {
    const jobsFound = [...mockJobs];
    const jobsStored = [];
    
    for (const job of jobsFound) {
      const jobId = await callback(job);
      if (jobId > 0) {
        jobsStored.push(jobId);
      }
    }
    
    return { jobsFound, jobsStored };
  });
  
  // Mock cancelCrawler method
  vi.spyOn(crawler, 'cancelCrawler').mockResolvedValue(true);
  
  return crawler;
}