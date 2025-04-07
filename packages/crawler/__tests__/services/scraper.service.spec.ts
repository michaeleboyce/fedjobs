// File path: packages/crawler/__tests__/services/scraper.service.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScraperService } from '../../src/services/scraper.service';
import { JobPostingData } from '../../src/types';

describe('ScraperService', () => {
  let service: ScraperService;
  let mockJobSourceService: any;
  let mockCacheService: any;
  let mockJobPostingProcessor: any;
  let mockWebCrawler: any;
  
  beforeEach(() => {
    // Create mock dependencies
    mockJobSourceService = {
      getSourceById: vi.fn(),
      updateSourceStatus: vi.fn(),
      getSourcesForFrequency: vi.fn(),
      deactivateSourceJobs: vi.fn(),
      getJobsForSource: vi.fn(),
      updateSourceAfterCrawl: vi.fn()
    };
    
    mockCacheService = {
      checkCache: vi.fn(),
      copyJobsFromCache: vi.fn(),
      getOrCreateCacheEntry: vi.fn(),
      linkSourceToCache: vi.fn(),
      updateCacheEntry: vi.fn()
    };
    
    mockJobPostingProcessor = {
      processJob: vi.fn()
    };
    
    mockWebCrawler = {
      cancelCrawler: vi.fn(),
      crawlSite: vi.fn()
    };
    
    // Create service with mocks
    service = new ScraperService(
      mockJobSourceService,
      mockCacheService,
      mockJobPostingProcessor,
      mockWebCrawler
    );
    
    // Default mock responses
    mockJobSourceService.getSourceById.mockResolvedValue({
      id: 123,
      url: 'https://example.com',
      name: 'Test Source'
    });
    
    // Mock crawl results
    mockWebCrawler.crawlSite.mockResolvedValue({
      jobsFound: [
        { title: 'Job 1', organization: 'Org 1', description: 'Desc 1', url: 'https://example.com/1', dateScraped: new Date() }
      ],
      jobsStored: [101]
    });
  });
  
  describe('cancelRefresh', () => {
    it('should return true when cancellation succeeds', async () => {
      // Arrange: Mock crawler to succeed
      mockWebCrawler.cancelCrawler.mockResolvedValue(true);
      
      // Act: Call cancelRefresh
      const result = await service.cancelRefresh(123);
      
      // Assert: Check results
      expect(result).toBe(true);
      expect(mockWebCrawler.cancelCrawler).toHaveBeenCalledWith(123);
      expect(mockJobSourceService.updateSourceStatus).toHaveBeenCalledWith(123, 'ACTIVE');
    });
    
    it('should return false when cancellation fails', async () => {
      // Arrange: Mock crawler to fail
      mockWebCrawler.cancelCrawler.mockResolvedValue(false);
      
      // Act: Call cancelRefresh
      const result = await service.cancelRefresh(123);
      
      // Assert: Check results
      expect(result).toBe(false);
      expect(mockWebCrawler.cancelCrawler).toHaveBeenCalledWith(123);
      expect(mockJobSourceService.updateSourceStatus).toHaveBeenCalledWith(123, 'ACTIVE');
    });
    
    it('should return false when an error occurs', async () => {
      // Arrange: Mock source service to throw
      mockJobSourceService.getSourceById.mockRejectedValue(new Error('Source not found'));
      
      // Act: Call cancelRefresh
      const result = await service.cancelRefresh(123);
      
      // Assert: Check results
      expect(result).toBe(false);
      expect(mockWebCrawler.cancelCrawler).not.toHaveBeenCalled();
    });
  });
  
  describe('refreshJobSource', () => {
    it('should use cache when available and not forcing refresh', async () => {
      // Arrange: Mock cache to be available
      const mockCacheEntry = { id: 456, url: 'https://example.com' };
      mockCacheService.checkCache.mockResolvedValue(mockCacheEntry);
      mockCacheService.copyJobsFromCache.mockResolvedValue(10); // 10 jobs copied
      
      // Mock job source to have no globalCacheId
      mockJobSourceService.getSourceById.mockResolvedValue({
        id: 123,
        url: 'https://example.com',
        name: 'Test Source',
        globalCacheId: null
      });
      
      // Mock callbacks
      const callbacks = {
        onComplete: vi.fn()
      };
      
      // Act: Call refreshJobSource (not forcing refresh)
      const result = await service.refreshJobSource(123, callbacks, false);
      
      // Assert: Check results
      expect(result.usedCache).toBe(true);
      expect(result.jobsFound).toBe(10);
      expect(result.jobsStored).toBe(10);
      expect(mockCacheService.checkCache).toHaveBeenCalledWith('https://example.com');
      expect(mockCacheService.copyJobsFromCache).toHaveBeenCalledWith(123, 456);
      expect(mockWebCrawler.crawlSite).not.toHaveBeenCalled(); // Should not crawl
    });
    
    it('should perform fresh crawl when forcing refresh', async () => {
      // Arrange: Mock cache to be available (but should be ignored)
      mockCacheService.checkCache.mockResolvedValue({ id: 456 });
      
      // Mock callbacks
      const callbacks = {
        onJobFound: vi.fn(),
        onComplete: vi.fn()
      };
      
      // Act: Call refreshJobSource (forcing refresh)
      const result = await service.refreshJobSource(123, callbacks, true);
      
      // Assert: Check results
      expect(result.usedCache).toBe(false);
      expect(result.jobsFound).toBe(1);
      expect(result.jobsStored).toBe(1);
      expect(mockCacheService.checkCache).not.toHaveBeenCalled(); // Should not check cache
      expect(mockWebCrawler.crawlSite).toHaveBeenCalled(); // Should crawl
    });
    
    it('should perform fresh crawl when cache is unavailable', async () => {
      // Arrange: Mock cache to be unavailable
      mockCacheService.checkCache.mockResolvedValue(null);
      
      // Act: Call refreshJobSource (not forcing refresh)
      const result = await service.refreshJobSource(123);
      
      // Assert: Check results
      expect(result.usedCache).toBe(false);
      expect(mockCacheService.checkCache).toHaveBeenCalled();
      expect(mockWebCrawler.crawlSite).toHaveBeenCalled(); // Should crawl
    });
    
    it('should update cache after fresh crawl', async () => {
      // Arrange: Mock cache to be unavailable
      mockCacheService.checkCache.mockResolvedValue(null);
      
      // Mock cache entry creation
      const mockCacheEntry = { id: 789 };
      mockCacheService.getOrCreateCacheEntry.mockResolvedValue(mockCacheEntry);
      
      // Act: Call refreshJobSource
      await service.refreshJobSource(123);
      
      // Assert: Check cache was updated
      expect(mockCacheService.getOrCreateCacheEntry).toHaveBeenCalledWith(
        'https://example.com', 
        1 // One job found
      );
      expect(mockCacheService.linkSourceToCache).toHaveBeenCalledWith(123, 789, false);
    });
    
    it('should handle errors during refresh', async () => {
      // Arrange: Mock source service to throw
      mockJobSourceService.deactivateSourceJobs.mockRejectedValue(new Error('Database error'));
      
      // Mock callbacks
      const callbacks = {
        onError: vi.fn()
      };
      
      // Act: Call refreshJobSource
      const result = await service.refreshJobSource(123, callbacks);
      
      // Assert: Check results
      expect(result.error).toBe('Database error');
      expect(callbacks.onError).toHaveBeenCalled();
      expect(mockJobSourceService.updateSourceStatus).toHaveBeenCalledWith(
        123, 
        'ERROR', 
        'Database error'
      );
    });
  });
  
  describe('scheduleRefresh', () => {
    it('should process each source with the given frequency', async () => {
      // Arrange: Mock sources
      const mockSources = [
        { id: 1, name: 'Source 1', url: 'https://example1.com' },
        { id: 2, name: 'Source 2', url: 'https://example2.com' }
      ];
      mockJobSourceService.getSourcesForFrequency.mockResolvedValue(mockSources);
      
      // Mock refreshJobSource to succeed
      vi.spyOn(service, 'refreshJobSource').mockResolvedValue({} as any);
      
      // Act: Call scheduleRefresh
      await service.scheduleRefresh('DAILY');
      
      // Assert: Check each source was processed
      expect(mockJobSourceService.getSourcesForFrequency).toHaveBeenCalledWith('DAILY');
      expect(service.refreshJobSource).toHaveBeenCalledTimes(2);
      expect(service.refreshJobSource).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          onComplete: expect.any(Function),
          onError: expect.any(Function)
        }),
        false
      );
      expect(service.refreshJobSource).toHaveBeenCalledWith(
        2,
        expect.objectContaining({
          onComplete: expect.any(Function),
          onError: expect.any(Function)
        }),
        false
      );
    }, 10000); // Increase timeout to 10 seconds
    
    it('should continue processing sources even if one fails', async () => {
      // Arrange: Mock sources
      const mockSources = [
        { id: 1, name: 'Source 1', url: 'https://example1.com' },
        { id: 2, name: 'Source 2', url: 'https://example2.com' }
      ];
      mockJobSourceService.getSourcesForFrequency.mockResolvedValue(mockSources);
      
      // First call fails, second succeeds
      vi.spyOn(service, 'refreshJobSource')
        .mockRejectedValueOnce(new Error('First source failed'))
        .mockResolvedValueOnce({} as any);
      
      // Act: Call scheduleRefresh
      await service.scheduleRefresh('WEEKLY');
      
      // Assert: Second source should still be processed
      expect(service.refreshJobSource).toHaveBeenCalledTimes(2);
    }, 10000); // Increase timeout to 10 seconds
    
    it('should handle errors when retrieving sources', async () => {
      // Arrange: Mock sources query to fail
      mockJobSourceService.getSourcesForFrequency.mockRejectedValue(new Error('Failed to get sources'));
      
      // Act & Assert: Should not throw
      await expect(service.scheduleRefresh('DAILY')).resolves.not.toThrow();
    });
  });
});