// tests/unit/CacheService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CacheService } from '../../src/services/cache.service';
import { UrlNormalizationService, AIService } from '@fedjobs/utils';
import { 
  GlobalSourceCacheRepository, 
  JobSourceRepository, 
  JobPostingRepository, 
  db, 
  sql
} from '@fedjobs/database';

// Define mock implementations
const mockGlobalCacheRepo = {
  getByNormalizedUrl: vi.fn(),
  getById: vi.fn(),
  insert: vi.fn(),
  markRefreshed: vi.fn(),
  incrementUserCount: vi.fn()
};
const mockJobSourceRepo = {
  getByGlobalCacheId: vi.fn(),
  update: vi.fn()
};
const mockJobPostingRepo = {
  getBySourceId: vi.fn(),
  bulkInsert: vi.fn()
};
const mockUrlService = {
  normalizeUrl: vi.fn(),
  extractDomain: vi.fn()
};
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn()
};
const mockAIService = {
  generateText: vi.fn(),
  createStreamingResponse: vi.fn()
};

// Mock repositories and database from @fedjobs/database
vi.mock('@fedjobs/database', () => ({
  GlobalSourceCacheRepository: vi.fn(() => mockGlobalCacheRepo),
  JobSourceRepository: vi.fn(() => mockJobSourceRepo),
  JobPostingRepository: vi.fn(() => mockJobPostingRepo),
  neon: vi.fn(() => ({
    connect: vi.fn().mockResolvedValue({})
  })),
  db: {},
  drizzle: vi.fn(() => ({})),
  eq: vi.fn(),
  sql: { raw: vi.fn() }
}));

// Mock services from @fedjobs/utils
vi.mock('@fedjobs/utils', async (importOriginal) => {
  const actualUtils = await importOriginal() as any;
  return {
    ...actualUtils, // Keep original exports if needed, otherwise remove
    UrlNormalizationService: vi.fn(() => mockUrlService),
    AIService: vi.fn(() => mockAIService),
    Logger: vi.fn(() => mockLogger)
  };
});

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Re-assign default mock implementations if needed (or specific ones for each test)
    mockGlobalCacheRepo.getByNormalizedUrl.mockResolvedValue(null);
    mockGlobalCacheRepo.getById.mockResolvedValue(null);
    mockGlobalCacheRepo.insert.mockImplementation(data => Promise.resolve({ ...data, id: 100 }));
    mockGlobalCacheRepo.markRefreshed.mockResolvedValue([{ id: 100 }]);
    mockGlobalCacheRepo.incrementUserCount.mockResolvedValue(undefined);
    
    mockJobSourceRepo.getByGlobalCacheId.mockResolvedValue([
      { id: 1, url: 'https://example.com', lastScraped: new Date().toISOString() }
    ]);
    mockJobSourceRepo.update.mockResolvedValue([{ id: 1 }]);
    
    mockJobPostingRepo.getBySourceId.mockResolvedValue([
      { id: 101, title: 'Software Engineer', organization: 'Test Corp', description: 'Job description', url: 'https://example.com/jobs/1' }
    ]);
    mockJobPostingRepo.bulkInsert.mockImplementation(jobs => Promise.resolve(jobs.map((j: any, i: number) => ({ ...j, id: 200 + i }))));
    
    mockUrlService.normalizeUrl.mockImplementation(url => url ? url.toLowerCase() : '');
    mockUrlService.extractDomain.mockImplementation(url => {
      try {
        return new URL(url).hostname;
      } catch (e) {
        return url ? url.split('/')[2] || '' : '';
      }
    });
    mockAIService.generateText.mockResolvedValue('');

    // Create a new instance for each test to ensure isolation
    cacheService = new CacheService();
  });
  
  it('should initialize correctly', () => {
    expect(cacheService).toBeDefined();
  });
  
  it('should return undefined when checking cache for invalid URL', async () => {
    mockUrlService.normalizeUrl.mockReturnValueOnce('');
    const result = await cacheService.checkCache('');
    expect(result).toBeUndefined();
    expect(mockGlobalCacheRepo.getByNormalizedUrl).not.toHaveBeenCalled();
  });
  
  it('should return undefined when no cache entry exists', async () => {
    mockUrlService.normalizeUrl.mockReturnValueOnce('https://example.com');
    mockGlobalCacheRepo.getByNormalizedUrl.mockResolvedValueOnce(null);
    
    const result = await cacheService.checkCache('https://example.com');
    expect(result).toBeUndefined();
    expect(mockGlobalCacheRepo.getByNormalizedUrl).toHaveBeenCalledWith('https://example.com');
  });
  
  it('should return undefined for expired cache entry', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    mockUrlService.normalizeUrl.mockReturnValueOnce('https://example.com');
    mockGlobalCacheRepo.getByNormalizedUrl.mockResolvedValueOnce({
      id: 100,
      normalizedUrl: 'https://example.com',
      expiresAt: yesterday,
      status: 'ACTIVE',
      // Add other required fields from GlobalSourceCacheRecord
      originalUrl: 'https://example.com',
      domain: 'example.com',
      jobCount: 5,
      userCount: 1,
      lastRefreshedAt: new Date(),
      createdAt: new Date()
    });
    
    const result = await cacheService.checkCache('https://example.com');
    expect(result).toBeUndefined();
    expect(mockGlobalCacheRepo.getByNormalizedUrl).toHaveBeenCalledWith('https://example.com');
  });
  
  it('should return cache entry when fresh', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const mockCacheEntry = {
      id: 100,
      normalizedUrl: 'https://example.com',
      expiresAt: tomorrow,
      status: 'ACTIVE',
      // Add other required fields
      originalUrl: 'https://example.com',
      domain: 'example.com',
      jobCount: 5,
      userCount: 1,
      lastRefreshedAt: new Date(),
      createdAt: new Date()
    };
    
    mockUrlService.normalizeUrl.mockReturnValueOnce('https://example.com');
    mockGlobalCacheRepo.getByNormalizedUrl.mockResolvedValueOnce(mockCacheEntry);
    
    const result = await cacheService.checkCache('https://example.com');
    expect(result).toEqual(mockCacheEntry);
    expect(mockGlobalCacheRepo.getByNormalizedUrl).toHaveBeenCalledWith('https://example.com');
  });
  
  it('should create new cache entry correctly', async () => {
    mockUrlService.normalizeUrl.mockReturnValueOnce('example.com');
    mockUrlService.extractDomain.mockReturnValueOnce('example.com');
    mockGlobalCacheRepo.insert.mockResolvedValueOnce({ id: 100, normalizedUrl: 'example.com' }); // Ensure insert mock returns an object with id
    
    const result = await cacheService.createCacheEntry('https://example.com', 5);
    
    expect(mockGlobalCacheRepo.insert).toHaveBeenCalledWith(expect.objectContaining({
      normalizedUrl: 'example.com',
      originalUrl: 'https://example.com',
      domain: 'example.com',
      jobCount: 5,
      status: 'ACTIVE'
    }));
    
    expect(result.id).toBe(100);
  });
  
  it('should throw error for invalid URL in createCacheEntry', async () => {
    mockUrlService.normalizeUrl.mockReturnValueOnce(''); // Simulate invalid normalization
    
    await expect(cacheService.createCacheEntry('invalid')).rejects.toThrow('Invalid URL');
    expect(mockUrlService.normalizeUrl).toHaveBeenCalledWith('invalid');
    expect(mockGlobalCacheRepo.insert).not.toHaveBeenCalled();
  });
  
  it('should update cache entry correctly', async () => {
    mockGlobalCacheRepo.markRefreshed.mockResolvedValueOnce([
      { id: 100, jobCount: 10, normalizedUrl: 'https://example.com' } // Ensure return type matches expected
    ]);
    
    const result = await cacheService.updateCacheEntry(100, 10);
    
    expect(mockGlobalCacheRepo.markRefreshed).toHaveBeenCalledWith(100, 10, 1); // Default ttlDays is 1
    expect(result?.id).toBe(100);
  });
  
  it('should get or create cache entry when it exists and is fresh', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const existingEntry = {
      id: 100,
      normalizedUrl: 'https://example.com',
      expiresAt: tomorrow,
      status: 'ACTIVE',
      originalUrl: 'https://example.com',
      domain: 'example.com',
      jobCount: 5,
      userCount: 1,
      lastRefreshedAt: new Date(),
      createdAt: new Date()
    };
    
    mockUrlService.normalizeUrl.mockReturnValueOnce('https://example.com');
    mockGlobalCacheRepo.getByNormalizedUrl.mockResolvedValueOnce(existingEntry);
    mockGlobalCacheRepo.markRefreshed.mockResolvedValueOnce([existingEntry]); // Mock markRefreshed

    const result = await cacheService.getOrCreateCacheEntry('https://example.com', 5);
    
    expect(mockGlobalCacheRepo.getByNormalizedUrl).toHaveBeenCalledWith('https://example.com');
    expect(mockGlobalCacheRepo.markRefreshed).toHaveBeenCalledWith(100, 5, 1); // Check if markRefreshed is called
    expect(mockGlobalCacheRepo.insert).not.toHaveBeenCalled(); // Should not insert
    expect(result).toEqual(existingEntry);
  });
  
  it('should get or create cache entry when it does not exist', async () => {
    mockUrlService.normalizeUrl.mockReturnValueOnce('https://example.com');
    mockUrlService.extractDomain.mockReturnValueOnce('example.com');
    mockGlobalCacheRepo.getByNormalizedUrl.mockResolvedValueOnce(null);
    mockGlobalCacheRepo.insert.mockResolvedValueOnce({ id: 101, normalizedUrl: 'https://example.com' }); // Mock insert return

    const result = await cacheService.getOrCreateCacheEntry('https://example.com', 5);
    
    expect(mockGlobalCacheRepo.getByNormalizedUrl).toHaveBeenCalledWith('https://example.com');
    expect(mockGlobalCacheRepo.insert).toHaveBeenCalledWith(expect.objectContaining({
      normalizedUrl: 'https://example.com',
      originalUrl: 'https://example.com',
      domain: 'example.com',
      jobCount: 5
    }));
    expect(mockGlobalCacheRepo.markRefreshed).not.toHaveBeenCalled(); // Should not refresh
    expect(result.id).toBe(101);
  });
  
  it('should copy jobs from cache correctly', async () => {
    const cacheEntry = { id: 100, normalizedUrl: 'https://cached.com' };
    const sourceToCopyFrom = { id: 50, url: 'https://cached.com/source', globalCacheId: 100, lastScraped: new Date().toISOString(), userId: 'user1', sourceConfigId: 1 };
    const jobsToCopy = [
      { id: 201, sourceId: 50, title: 'Cached Job 1', url: 'https://cached.com/job1' },
      { id: 202, sourceId: 50, title: 'Cached Job 2', url: 'https://cached.com/job2' }
    ];
    
    mockGlobalCacheRepo.getById.mockResolvedValueOnce(cacheEntry);
    mockJobSourceRepo.getByGlobalCacheId.mockResolvedValueOnce([sourceToCopyFrom]);
    mockJobPostingRepo.getBySourceId.mockResolvedValueOnce(jobsToCopy);
    mockJobPostingRepo.bulkInsert.mockResolvedValueOnce(jobsToCopy.map((j, i) => ({ ...j, id: 300 + i }))); // Mock bulk insert return
    mockJobSourceRepo.update.mockResolvedValueOnce([{ id: 1 }]); // Mock the target source update
    
    const targetSourceId = 1;
    const cacheId = 100;
    
    const result = await cacheService.copyJobsFromCache(targetSourceId, cacheId);
    
    expect(mockGlobalCacheRepo.getById).toHaveBeenCalledWith(cacheId);
    expect(mockJobSourceRepo.getByGlobalCacheId).toHaveBeenCalledWith(cacheId);
    expect(mockJobPostingRepo.getBySourceId).toHaveBeenCalledWith(sourceToCopyFrom.id);
    expect(mockJobPostingRepo.bulkInsert).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ title: 'Cached Job 1', sourceId: targetSourceId }),
      expect.objectContaining({ title: 'Cached Job 2', sourceId: targetSourceId })
    ]));
    expect(mockGlobalCacheRepo.incrementUserCount).toHaveBeenCalledWith(cacheId);
    expect(mockJobSourceRepo.update).toHaveBeenCalledWith(targetSourceId, expect.objectContaining({ usedCache: true, globalCacheId: cacheId }));
    expect(result).toBe(jobsToCopy.length); // Should return the number of jobs copied
  });
  
  it('should throw error if cache entry not found during copy', async () => {
    mockGlobalCacheRepo.getById.mockResolvedValueOnce(null);
    
    await expect(cacheService.copyJobsFromCache(1, 999)).rejects.toThrow('Cache entry 999 not found');
    expect(mockGlobalCacheRepo.getById).toHaveBeenCalledWith(999);
  });
  
  it('should throw error if no sources found for cache entry during copy', async () => {
    mockGlobalCacheRepo.getById.mockResolvedValueOnce({ id: 100, normalizedUrl: 'https://cached.com' });
    mockJobSourceRepo.getByGlobalCacheId.mockResolvedValueOnce([]);
    
    await expect(cacheService.copyJobsFromCache(1, 100)).rejects.toThrow('No sources found using cache entry 100');
    expect(mockJobSourceRepo.getByGlobalCacheId).toHaveBeenCalledWith(100);
  });
  
  it('should link source to cache correctly', async () => {
    mockJobSourceRepo.update.mockResolvedValueOnce([{ id: 1 }]);
    
    await cacheService.linkSourceToCache(1, 100, true);
    
    expect(mockJobSourceRepo.update).toHaveBeenCalledWith(1, {
      globalCacheId: 100,
      usedCache: true
    });
  });
});