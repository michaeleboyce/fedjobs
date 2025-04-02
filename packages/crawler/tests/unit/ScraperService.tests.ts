// tests/unit/ScraperService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScraperService } from '../../src/services/scraper.service';
import { ICrawler } from '../../src/interfaces/ICrawler';
import { IParser } from '../../src/interfaces/IParser';
import { ICacheService } from '../../src/interfaces/ICacheService';
import { ILogger } from '../../src/interfaces/ILogger';
import { UrlNormalizer } from '../../src/types';
import { JobPostingRepository, JobSourceRepository } from '@fedjobs/database';
import { ErrorCode } from '../../src/utils/errors';

// Mock repositories
vi.mock('@fedjobs/database', () => {
  return {
    JobPostingRepository: vi.fn().mockImplementation(() => ({
      insert: vi.fn().mockResolvedValue({ id: 123 }),
      update: vi.fn().mockResolvedValue([{ id: 123 }]),
      getBySourceId: vi.fn().mockResolvedValue([]),
      findByUrlAndSourceId: vi.fn().mockResolvedValue(null),
      findByTitleAndOrganization: vi.fn().mockResolvedValue(null),
      deactivateBySourceId: vi.fn().mockResolvedValue(undefined)
    })),
    JobSourceRepository: vi.fn().mockImplementation(() => ({
      getById: vi.fn().mockResolvedValue({ 
        id: 1, 
        userId: 'user1', 
        url: 'https://example.com',
        name: 'Example Jobs',
        keywords: 'software',
        status: 'ACTIVE'
      }),
      update: vi.fn().mockResolvedValue([{ id: 1 }]),
      updateStatus: vi.fn().mockResolvedValue([{ id: 1 }]),
      getSourcesForScheduledRefresh: vi.fn().mockResolvedValue([
        { id: 1, name: 'Example', url: 'https://example.com' }
      ])
    })),
    employmentType: {
      enumValues: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP', 'REMOTE', 'HYBRID', 'OTHER']
    },
    organizationType: {
      enumValues: ['GOVERNMENT', 'NONPROFIT', 'PRIVATE', 'PUBLIC', 'ACADEMIC', 'STARTUP', 'OTHER']
    }
  };
});

// Mock dependencies
const createMockCrawler = () => ({
  crawlJobSite: vi.fn().mockResolvedValue([]),
  cancelCrawler: vi.fn().mockResolvedValue(true)
});

const createMockParser = () => ({
  parseJobsFromPage: vi.fn().mockResolvedValue([]),
  analyzeLinks: vi.fn().mockResolvedValue([]),
  enrichJobData: vi.fn().mockImplementation(job => Promise.resolve(job)),
  getAIService: vi.fn().mockReturnValue({
    generateText: vi.fn().mockResolvedValue('{"isLegitimateJob":true,"confidence":0.9}')
  })
});

const createMockCacheService = () => ({
  checkCache: vi.fn().mockResolvedValue(null),
  createCacheEntry: vi.fn().mockResolvedValue({ id: 100 }),
  updateCacheEntry: vi.fn().mockResolvedValue({ id: 100 }),
  copyJobsFromCache: vi.fn().mockResolvedValue(5),
  linkSourceToCache: vi.fn().mockResolvedValue(undefined)
});

const createMockLogger = () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
});

const createMockUrlNormalizer = () => ({
  normalizeUrl: vi.fn().mockImplementation(url => url.toLowerCase()),
  extractDomain: vi.fn().mockImplementation(url => url.split('/')[2] || '')
});

describe('ScraperService', () => {
  let scraperService: ScraperService;
  let mockCrawler: ReturnType<typeof createMockCrawler>;
  let mockParser: ReturnType<typeof createMockParser>;
  let mockCacheService: ReturnType<typeof createMockCacheService>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockUrlNormalizer: ReturnType<typeof createMockUrlNormalizer>;
  let mockJobPostingRepo: JobPostingRepository;
  let mockJobSourceRepo: JobSourceRepository;
  
  beforeEach(() => {
    mockCrawler = createMockCrawler();
    mockParser = createMockParser();
    mockCacheService = createMockCacheService();
    mockLogger = createMockLogger();
    mockUrlNormalizer = createMockUrlNormalizer();
    mockJobPostingRepo = new JobPostingRepository();
    mockJobSourceRepo = new JobSourceRepository();
    
    scraperService = new ScraperService(
      mockCrawler as unknown as ICrawler,
      mockParser as unknown as IParser,
      mockCacheService as unknown as ICacheService,
      mockLogger as unknown as ILogger,
      mockUrlNormalizer as unknown as UrlNormalizer,
      mockJobPostingRepo,
      mockJobSourceRepo
    );
    
    // Reset mocks
    vi.clearAllMocks();
  });
  
  it('should initialize correctly', () => {
    expect(scraperService).toBeDefined();
    expect(mockLogger.info).toHaveBeenCalledWith('ScraperService initialized');
  });
  
  it('should cancel refresh correctly', async () => {
    const result = await scraperService.cancelRefresh(1);
    
    expect(result).toBe(true);
    expect(mockCrawler.cancelCrawler).toHaveBeenCalledWith(1);
    expect(mockJobSourceRepo.updateStatus).toHaveBeenCalledWith(1, 'ACTIVE');
  });
  
  it('should handle non-existent source in cancelRefresh', async () => {
    vi.mocked(mockJobSourceRepo.getById).mockResolvedValueOnce(undefined);
    
    const result = await scraperService.cancelRefresh(999);
    
    expect(result).toBe(false);
    expect(mockCrawler.cancelCrawler).not.toHaveBeenCalled();
  });
  
  it('should handle crawler errors in cancelRefresh', async () => {
    mockCrawler.cancelCrawler.mockRejectedValueOnce(new Error('Crawler error'));
    
    const result = await scraperService.cancelRefresh(1);
    
    expect(result).toBe(false);
    expect(mockLogger.error).toHaveBeenCalled();
  });
  
  it('should schedule refresh correctly', async () => {
    await scraperService.scheduleRefresh('DAILY');
    
    expect(mockJobSourceRepo.getSourcesForScheduledRefresh).toHaveBeenCalledWith('DAILY');
    expect(mockLogger.info).toHaveBeenCalledWith('Scheduling refresh for DAILY frequency sources');
  });
  
  it('should handle error in scheduleRefresh', async () => {
    vi.spyOn(mockJobSourceRepo, 'getSourcesForScheduledRefresh').mockImplementationOnce(() => {
      return Promise.reject(new Error('Database error'));
    });
    
    await expect(scraperService.scheduleRefresh('DAILY')).rejects.toMatchObject({
      code: ErrorCode.UNEXPECTED_ERROR
    });
    
    expect(mockLogger.error).toHaveBeenCalled();
  });
  
  it('should refresh job source from cache when available', async () => {
    mockCacheService.checkCache.mockResolvedValueOnce({ id: 100 });
    
    const result = await scraperService.refreshJobSource(1);
    
    expect(result.usedCache).toBe(true);
    expect(mockCacheService.copyJobsFromCache).toHaveBeenCalledWith(1, 100);
    expect(mockJobSourceRepo.update).toHaveBeenCalled();
    expect(mockCrawler.crawlJobSite).not.toHaveBeenCalled();
  });
  
  it('should perform fresh crawl when cache not available', async () => {
    mockCrawler.crawlJobSite.mockImplementationOnce(async (options) => {
      // Simulate finding a job
      if (options.onJobFound) {
        await options.onJobFound({
          title: 'Software Engineer',
          organization: 'Example Inc',
          description: 'Job Description',
          url: 'https://example.com/job/123',
          dateScraped: new Date()
        });
      }
      
      return [];
    });
    
    const result = await scraperService.refreshJobSource(1);
    
    expect(result.usedCache).toBe(false);
    expect(mockCrawler.crawlJobSite).toHaveBeenCalled();
    expect(mockJobPostingRepo.insert).toHaveBeenCalled();
    expect(mockCacheService.createCacheEntry).toHaveBeenCalled();
  });
  
  it('should handle errors in refreshJobSource', async () => {
    mockCrawler.crawlJobSite.mockRejectedValueOnce(new Error('Crawler error'));
    
    const result = await scraperService.refreshJobSource(1);
    
    expect(result.error).toBeDefined();
    expect(mockJobSourceRepo.updateStatus).toHaveBeenCalledWith(1, 'ERROR', 'Crawler error');
  });
  
  it('should validate job postings correctly', async () => {
    // Access private method for testing
    const validateJobPosting = (scraperService as any).validateJobPosting.bind(scraperService);
    
    // Valid job
    const validJob = {
      title: 'Software Engineer',
      organization: 'Example Inc',
      description: 'This is a detailed job description with more than 50 characters.'
    };
    
    expect(await validateJobPosting(validJob)).toEqual({ isValid: true });
    
    // Invalid job - missing fields
    const invalidJob1 = {
      title: 'Software Engineer',
      organization: '',
      description: ''
    };
    
    const validation1 = await validateJobPosting(invalidJob1);
    expect(validation1.isValid).toBe(false);
    expect(validation1.reasons).toContain('No job description');
    
    // Invalid job - short description
    const invalidJob2 = {
      title: 'Software Engineer',
      organization: 'Example Inc',
      description: 'Too short'
    };
    
    const validation2 = await validateJobPosting(invalidJob2);
    expect(validation2.isValid).toBe(false);
    expect(validation2.reasons).toContain('Job description too short');
    
    // Invalid job - suspicious title
    const invalidJob3 = {
      title: '404 Not Found',
      organization: 'Example Inc',
      description: 'This is a detailed job description with more than 50 characters.'
    };
    
    const validation3 = await validateJobPosting(invalidJob3);
    expect(validation3.isValid).toBe(false);
  });
  
  it('should normalize employment types correctly', () => {
    // Access private method for testing
    const normalizeEmploymentType = (scraperService as any).normalizeEmploymentType.bind(scraperService);
    
    expect(normalizeEmploymentType('FULL_TIME')).toBe('FULL_TIME');
    expect(normalizeEmploymentType('Full Time')).toBe('FULL_TIME');
    expect(normalizeEmploymentType('FULL-TIME')).toBe('FULL_TIME');
    expect(normalizeEmploymentType('INTERN')).toBe('INTERNSHIP');
    expect(normalizeEmploymentType('REMOTE')).toBe('REMOTE');
    expect(normalizeEmploymentType('UNKNOWN')).toBe('OTHER');
    expect(normalizeEmploymentType()).toBeUndefined();
  });
});