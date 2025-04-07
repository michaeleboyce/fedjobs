// File path: packages/crawler/__tests__/services/job-source.service.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobSourceService } from '../../src/services/job-source.service';
import { JobPostingData } from '../../src/types';

describe('JobSourceService', () => {
  let service: JobSourceService;
  let mockJobSourceRepo: any;
  let mockJobPostingRepo: any;
  
  beforeEach(() => {
    // Mock the repositories
    mockJobSourceRepo = {
      getById: vi.fn(),
      updateStatus: vi.fn(),
      getSourcesForScheduledRefresh: vi.fn(),
      update: vi.fn()
    };
    
    mockJobPostingRepo = {
      deactivateBySourceId: vi.fn(),
      getBySourceId: vi.fn(),
      getJobCountsBySourceIds: vi.fn()
    };
    
    // Create the service with mocked dependencies
    service = new JobSourceService(mockJobSourceRepo, mockJobPostingRepo);
  });
  
  describe('getSourceById', () => {
    it('should return the source when found', async () => {
      // Arrange: Mock repository to return a source
      const mockSource = { id: 123, name: 'Test Source', url: 'https://example.com' };
      mockJobSourceRepo.getById.mockResolvedValue(mockSource);
      
      // Act: Call getSourceById
      const result = await service.getSourceById(123);
      
      // Assert: Check results
      expect(result).toBe(mockSource);
      expect(mockJobSourceRepo.getById).toHaveBeenCalledWith(123);
    });
    
    it('should throw an error when source is not found', async () => {
      // Arrange: Mock repository to return null
      mockJobSourceRepo.getById.mockResolvedValue(null);
      
      // Act & Assert: Check that it throws
      await expect(service.getSourceById(123)).rejects.toThrow('Job source with ID 123 not found');
    });
  });
  
  describe('updateSourceStatus', () => {
    it('should call the repository with the correct parameters', async () => {
      // Arrange: Set up test data
      const sourceId = 123;
      const status = 'ACTIVE';
      const errorMessage = 'Test error';
      
      // Act: Call updateSourceStatus
      await service.updateSourceStatus(sourceId, status, errorMessage);
      
      // Assert: Check repository was called correctly
      expect(mockJobSourceRepo.updateStatus).toHaveBeenCalledWith(sourceId, status, errorMessage);
    });
  });
  
  describe('getSourcesForFrequency', () => {
    it('should return sources from the repository', async () => {
      // Arrange: Mock repository to return sources
      const mockSources = [
        { id: 1, name: 'Source 1', refreshFrequency: 'DAILY' },
        { id: 2, name: 'Source 2', refreshFrequency: 'DAILY' }
      ];
      mockJobSourceRepo.getSourcesForScheduledRefresh.mockResolvedValue(mockSources);
      
      // Act: Call getSourcesForFrequency
      const result = await service.getSourcesForFrequency('DAILY');
      
      // Assert: Check results
      expect(result).toBe(mockSources);
      expect(mockJobSourceRepo.getSourcesForScheduledRefresh).toHaveBeenCalledWith('DAILY');
    });
  });
  
  describe('deactivateSourceJobs', () => {
    it('should call the repository to deactivate jobs', async () => {
      // Act: Call deactivateSourceJobs
      await service.deactivateSourceJobs(123);
      
      // Assert: Check repository was called
      expect(mockJobPostingRepo.deactivateBySourceId).toHaveBeenCalledWith(123);
    });
  });
  
  describe('getJobsForSource', () => {
    it('should convert repository records to JobPostingData', async () => {
      // Arrange: Mock repository to return job records
      const mockRepoJobs = [
        {
          id: 1,
          title: 'Job 1',
          organization: 'Org 1',
          description: 'Desc 1',
          url: 'https://example.com/1',
          dateScraped: new Date(),
          skills: ['skill1', 'skill2'],
          structuredData: { field1: 'value1' }
        },
        {
          id: 2,
          title: 'Job 2',
          organization: 'Org 2',
          description: 'Desc 2',
          url: 'https://example.com/2',
          dateScraped: new Date(),
          skills: [],
          structuredData: {}
        }
      ];
      mockJobPostingRepo.getBySourceId.mockResolvedValue(mockRepoJobs);
      
      // Act: Call getJobsForSource
      const result = await service.getJobsForSource(123);
      
      // Assert: Check conversion
      expect(result.length).toBe(2);
      expect(result[0].title).toBe('Job 1');
      expect(result[0].skills).toEqual(['skill1', 'skill2']);
      expect(result[1].title).toBe('Job 2');
      expect(mockJobPostingRepo.getBySourceId).toHaveBeenCalledWith(123);
    });
  });
  
  describe('updateSourceAfterCrawl', () => {
    it('should call the repository with the correct update data', async () => {
      // Act: Call updateSourceAfterCrawl
      await service.updateSourceAfterCrawl(123);
      
      // Assert: Check repository was called with correct data
      expect(mockJobSourceRepo.update).toHaveBeenCalledWith(123, {
        status: 'ACTIVE',
        lastScraped: expect.any(Date),
        usedCache: false
      });
    });
  });
  
  describe('getJobCount', () => {
    it('should return the job count for a source', async () => {
      // Arrange: Mock repository to return counts
      mockJobPostingRepo.getJobCountsBySourceIds.mockResolvedValue({ 123: 42 });
      
      // Act: Call getJobCount
      const result = await service.getJobCount(123);
      
      // Assert: Check results
      expect(result).toBe(42);
      expect(mockJobPostingRepo.getJobCountsBySourceIds).toHaveBeenCalledWith([123]);
    });
    
    it('should return 0 if no count is found', async () => {
      // Arrange: Mock repository to return empty counts
      mockJobPostingRepo.getJobCountsBySourceIds.mockResolvedValue({});
      
      // Act: Call getJobCount
      const result = await service.getJobCount(123);
      
      // Assert: Check results
      expect(result).toBe(0);
    });
  });
});