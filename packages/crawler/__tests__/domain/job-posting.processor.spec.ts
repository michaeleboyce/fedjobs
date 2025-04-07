// File path: packages/crawler/__tests__/domain/job-posting.processor.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobPostingProcessor } from '../../src/domain/job-posting.processor';
import { JobPostingData } from '../../src/types';

// Mock dependencies
vi.mock('../../src/utils/employment-type.normalizer', () => ({
  EmploymentTypeNormalizer: {
    normalize: vi.fn(type => type ? 'NORMALIZED_TYPE' : null)
  }
}));

vi.mock('../../src/utils/organization-type.normalizer', () => ({
  OrganizationTypeNormalizer: {
    normalize: vi.fn(type => type ? 'NORMALIZED_ORG_TYPE' : null)
  }
}));

describe('JobPostingProcessor', () => {
  let processor: JobPostingProcessor;
  let mockJobPostingRepo: any;
  let mockValidator: any;
  let mockDuplicateDetector: any;
  
  beforeEach(() => {
    mockJobPostingRepo = {
      insert: vi.fn().mockResolvedValue({ id: 789 }),
      update: vi.fn().mockResolvedValue([{ id: 456 }])
    };
    
    mockValidator = {
      validateJob: vi.fn()
    };
    
    mockDuplicateDetector = {
      findDuplicate: vi.fn()
    };
    
    processor = new JobPostingProcessor(
      mockJobPostingRepo,
      mockValidator,
      mockDuplicateDetector
    );
    
    // Default validator to return valid
    mockValidator.validateJob.mockResolvedValue({ isValid: true });
    
    // Default duplicate detector to find no duplicates
    mockDuplicateDetector.findDuplicate.mockResolvedValue(null);
  });
  
  describe('processJob', () => {
    it('should reject invalid jobs', async () => {
      const sourceId = 123;
      const job: JobPostingData = {
        title: 'Software Engineer',
        organization: 'Tech Corp',
        description: 'Job description',
        url: 'https://example.com/jobs/123',
        dateScraped: new Date()
      };
      
      // Mock validator to reject the job
      mockValidator.validateJob.mockResolvedValue({
        isValid: false,
        reasons: ['Some validation error']
      });
      
      const result = await processor.processJob(sourceId, job);
      
      // Should return -1 for invalid jobs
      expect(result).toBe(-1);
      
      // Should have called validator but not other services
      expect(mockValidator.validateJob).toHaveBeenCalledWith(job);
      expect(mockDuplicateDetector.findDuplicate).not.toHaveBeenCalled();
      expect(mockJobPostingRepo.insert).not.toHaveBeenCalled();
      expect(mockJobPostingRepo.update).not.toHaveBeenCalled();
    });
    
    it('should update existing jobs when duplicate is found', async () => {
      const sourceId = 123;
      const job: JobPostingData = {
        title: 'Software Engineer',
        organization: 'Tech Corp',
        description: 'Job description',
        url: 'https://example.com/jobs/123',
        employmentType: 'FULL_TIME',
        organizationType: 'PRIVATE',
        dateScraped: new Date()
      };
      
      // Mock duplicate detector to find a duplicate
      mockDuplicateDetector.findDuplicate.mockResolvedValue(456);
      
      const result = await processor.processJob(sourceId, job);
      
      // Should return the ID of the updated job
      expect(result).toBe(456);
      
      // Should have called the update method
      expect(mockJobPostingRepo.update).toHaveBeenCalledWith(456, expect.objectContaining({
        title: 'Software Engineer',
        organization: 'Tech Corp',
        type: 'NORMALIZED_TYPE',
        organizationType: 'NORMALIZED_ORG_TYPE',
        isActive: true
      }));
      
      // Should not have called insert
      expect(mockJobPostingRepo.insert).not.toHaveBeenCalled();
    });
    
    it('should create new jobs when no duplicate is found', async () => {
      const sourceId = 123;
      const job: JobPostingData = {
        title: 'Software Engineer',
        organization: 'Tech Corp',
        description: 'Job description',
        url: 'https://example.com/jobs/123',
        employmentType: 'FULL_TIME',
        organizationType: 'PRIVATE',
        dateScraped: new Date()
      };
      
      // Mock duplicate detector to not find a duplicate
      mockDuplicateDetector.findDuplicate.mockResolvedValue(null);
      
      const result = await processor.processJob(sourceId, job);
      
      // Should return the ID of the new job
      expect(result).toBe(789);
      
      // Should have called the insert method
      expect(mockJobPostingRepo.insert).toHaveBeenCalledWith(expect.objectContaining({
        sourceId: 123,
        title: 'Software Engineer',
        organization: 'Tech Corp',
        type: 'NORMALIZED_TYPE',
        organizationType: 'NORMALIZED_ORG_TYPE'
      }));
      
      // Should not have called update
      expect(mockJobPostingRepo.update).not.toHaveBeenCalled();
    });
    
    it('should include creation history when creating new jobs', async () => {
      const sourceId = 123;
      const job: JobPostingData = {
        title: 'Software Engineer',
        organization: 'Tech Corp',
        description: 'Job description',
        url: 'https://example.com/jobs/123',
        dateScraped: new Date()
      };
      
      await processor.processJob(sourceId, job);
      
      // Should include history in structuredData
      expect(mockJobPostingRepo.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          structuredData: expect.objectContaining({
            creationHistory: expect.arrayContaining([
              expect.objectContaining({
                action: 'created'
              })
            ])
          })
        })
      );
    });
    
    it('should include update history when updating existing jobs', async () => {
      const sourceId = 123;
      const job: JobPostingData = {
        title: 'Software Engineer',
        organization: 'Tech Corp',
        description: 'Job description',
        url: 'https://example.com/jobs/123',
        dateScraped: new Date(),
        structuredData: {
          updateHistory: []
        }
      };
      
      // Mock duplicate detector to find a duplicate
      mockDuplicateDetector.findDuplicate.mockResolvedValue(456);
      
      await processor.processJob(sourceId, job);
      
      // Should include history in structuredData
      expect(mockJobPostingRepo.update).toHaveBeenCalledWith(
        456,
        expect.objectContaining({
          structuredData: expect.objectContaining({
            updateHistory: expect.arrayContaining([
              expect.objectContaining({
                action: 'updated'
              })
            ])
          })
        })
      );
    });
    
    it('should handle errors gracefully', async () => {
      const sourceId = 123;
      const job: JobPostingData = {
        title: 'Software Engineer',
        organization: 'Tech Corp',
        description: 'Job description',
        url: 'https://example.com/jobs/123',
        dateScraped: new Date()
      };
      
      // Mock repo to throw an error
      mockJobPostingRepo.insert.mockRejectedValue(new Error('Database error'));
      
      const result = await processor.processJob(sourceId, job);
      
      // Should return -1 on error
      expect(result).toBe(-1);
    });
  });
});