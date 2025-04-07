// File path: packages/crawler/__tests__/domain/duplicate.detector.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DuplicateDetector } from '../../src/domain/duplicate.detector';
import { JobPostingData } from '../../src/types';

describe('DuplicateDetector', () => {
  let detector: DuplicateDetector;
  let mockJobPostingRepo: any;

  beforeEach(() => {
    // Mock the JobPostingRepository
    mockJobPostingRepo = {
      findByUrlAndSourceId: vi.fn(),
      findByTitleAndOrganization: vi.fn()
    };

    detector = new DuplicateDetector(mockJobPostingRepo);
  });

  describe('findDuplicate', () => {
    it('should find duplicates by URL first', async () => {
      const sourceId = 123;
      const job: JobPostingData = {
        title: 'Software Engineer',
        organization: 'Tech Corp',
        description: 'Job description',
        url: 'https://example.com/jobs/123',
        dateScraped: new Date()
      };

      // Mock repository to return a result for URL match
      mockJobPostingRepo.findByUrlAndSourceId.mockResolvedValue({ id: 456 });

      const result = await detector.findDuplicate(sourceId, job);

      // Should return the ID of the existing job
      expect(result).toBe(456);
      
      // Should have called the URL matcher
      expect(mockJobPostingRepo.findByUrlAndSourceId).toHaveBeenCalledWith(
        'https://example.com/jobs/123',
        123
      );
      
      // Should not have called the title/org matcher since URL match was found
      expect(mockJobPostingRepo.findByTitleAndOrganization).not.toHaveBeenCalled();
    });

    it('should find duplicates by title and organization if no URL match', async () => {
      const sourceId = 123;
      const job: JobPostingData = {
        title: 'Software Engineer',
        organization: 'Tech Corp',
        description: 'Job description',
        url: 'https://example.com/jobs/123',
        dateScraped: new Date()
      };

      // Mock repository to return null for URL match but a result for title/org match
      mockJobPostingRepo.findByUrlAndSourceId.mockResolvedValue(null);
      mockJobPostingRepo.findByTitleAndOrganization.mockResolvedValue({ id: 789 });

      const result = await detector.findDuplicate(sourceId, job);

      // Should return the ID of the existing job
      expect(result).toBe(789);
      
      // Should have called both matchers
      expect(mockJobPostingRepo.findByUrlAndSourceId).toHaveBeenCalled();
      expect(mockJobPostingRepo.findByTitleAndOrganization).toHaveBeenCalledWith(
        'Software Engineer',
        'Tech Corp',
        123
      );
    });

    it('should return null if no duplicate is found', async () => {
      const sourceId = 123;
      const job: JobPostingData = {
        title: 'Software Engineer',
        organization: 'Tech Corp',
        description: 'Job description',
        url: 'https://example.com/jobs/123',
        dateScraped: new Date()
      };

      // Mock repository to return null for both matchers
      mockJobPostingRepo.findByUrlAndSourceId.mockResolvedValue(null);
      mockJobPostingRepo.findByTitleAndOrganization.mockResolvedValue(null);

      const result = await detector.findDuplicate(sourceId, job);

      // Should return null when no duplicate is found
      expect(result).toBeNull();
      
      // Should have called both matchers
      expect(mockJobPostingRepo.findByUrlAndSourceId).toHaveBeenCalled();
      expect(mockJobPostingRepo.findByTitleAndOrganization).toHaveBeenCalled();
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

      // Mock repository to throw an error
      mockJobPostingRepo.findByUrlAndSourceId.mockRejectedValue(new Error('Database error'));

      const result = await detector.findDuplicate(sourceId, job);

      // Should return null when an error occurs
      expect(result).toBeNull();
    });
  });
});