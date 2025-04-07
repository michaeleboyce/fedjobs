// File path: packages/crawler/__tests__/domain/job-posting.validator.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobPostingValidator } from '../../src/domain/job-posting.validator';
import { JobPostingData } from '../../src/types';
import { AIService } from '@fedjobs/utils';

// Mock AIService
vi.mock('@fedjobs/utils', () => ({
  AIService: vi.fn().mockImplementation(() => ({
    generateText: vi.fn()
  }))
}));

describe('JobPostingValidator', () => {
  let validator: JobPostingValidator;
  let mockAIService: any;

  beforeEach(() => {
    mockAIService = {
      generateText: vi.fn()
    };
    validator = new JobPostingValidator(mockAIService);
  });

  describe('validateJob', () => {
    it('should reject jobs missing required fields', async () => {
      // Test job missing title
      const jobMissingTitle: JobPostingData = {
        title: '',
        organization: 'Test Org',
        description: 'Test description',
        url: 'https://example.com',
        dateScraped: new Date()
      };

      const resultMissingTitle = await validator.validateJob(jobMissingTitle);
      expect(resultMissingTitle.isValid).toBe(false);
      expect(resultMissingTitle.reasons).toContain('No job title');

      // Test job missing organization
      const jobMissingOrg: JobPostingData = {
        title: 'Test Job',
        organization: '',
        description: 'Test description',
        url: 'https://example.com',
        dateScraped: new Date()
      };

      const resultMissingOrg = await validator.validateJob(jobMissingOrg);
      expect(resultMissingOrg.isValid).toBe(false);
      expect(resultMissingOrg.reasons).toContain('No organization');

      // Test job missing description
      const jobMissingDesc: JobPostingData = {
        title: 'Test Job',
        organization: 'Test Org',
        description: '',
        url: 'https://example.com',
        dateScraped: new Date()
      };

      const resultMissingDesc = await validator.validateJob(jobMissingDesc);
      expect(resultMissingDesc.isValid).toBe(false);
      expect(resultMissingDesc.reasons).toContain('No job description');
    });

    it('should reject jobs with too short descriptions', async () => {
      const job: JobPostingData = {
        title: 'Test Job',
        organization: 'Test Org',
        description: 'Too short', // Less than 50 chars
        url: 'https://example.com',
        dateScraped: new Date()
      };

      const result = await validator.validateJob(job);
      expect(result.isValid).toBe(false);
      expect(result.reasons).toContain('Job description too short');
    });

    it('should reject jobs with suspicious titles', async () => {
      // Test with different suspicious titles
      const suspiciousTitles = [
        '404 Not Found',
        'Home Page',
        'Welcome',
        'Index',
        'Login',
        'Sign In',
        'Register',
        'About Us',
        'Privacy Policy',
        'Terms of Service'
      ];

      for (const title of suspiciousTitles) {
        const job: JobPostingData = {
          title,
          organization: 'Test Org',
          description: 'This is a long enough description to pass the length check. It should be more than 50 characters long.',
          url: 'https://example.com',
          dateScraped: new Date()
        };

        const result = await validator.validateJob(job);
        expect(result.isValid).toBe(false);
        expect(result.reasons).toContain('Suspicious job title indicates this is not a job posting');
      }
    });

    it('should validate legitimate jobs', async () => {
      const job: JobPostingData = {
        title: 'Software Engineer',
        organization: 'Tech Corp',
        description: 'This is a job description for a Software Engineer position. We are looking for someone with experience in Node.js and TypeScript.',
        url: 'https://example.com/jobs/software-engineer',
        dateScraped: new Date()
      };

      const result = await validator.validateJob(job);
      expect(result.isValid).toBe(true);
    });

    it('should use AI validation for ambiguous cases', async () => {
      // Create a job with a generic title that would trigger AI validation
      const genericJob: JobPostingData = {
        title: 'Great Opportunity',  // Generic title
        organization: 'Company XYZ',
        description: 'Join our team! This is a short description but still over 50 characters long.',
        url: 'https://example.com/jobs/123',
        dateScraped: new Date()
      };

      // Mock AI service response - AI thinks it's legitimate
      mockAIService.generateText.mockResolvedValue(JSON.stringify({
        isLegitimateJob: true,
        confidence: 0.8,
        reasons: ['Contains job-related language']
      }));

      const resultLegitimate = await validator.validateJob(genericJob);
      expect(mockAIService.generateText).toHaveBeenCalled();
      expect(resultLegitimate.isValid).toBe(true);

      // Mock AI service response - AI thinks it's not legitimate
      mockAIService.generateText.mockResolvedValue(JSON.stringify({
        isLegitimateJob: false,
        confidence: 0.9,
        reasons: ['Lacks specific job details', 'Too generic']
      }));

      const resultNotLegitimate = await validator.validateJob(genericJob);
      expect(resultNotLegitimate.isValid).toBe(false);
      expect(resultNotLegitimate.reasons).toContain('Lacks specific job details');
      expect(resultNotLegitimate.reasons).toContain('Too generic');
    });

    it('should handle errors gracefully', async () => {
      const job: JobPostingData = {
        title: 'Generic Job',
        organization: 'Test Org',
        description: 'Short description but over 50 characters to pass the basic check.',
        url: 'https://example.com',
        dateScraped: new Date()
      };

      // Mock AI service to throw an error
      mockAIService.generateText.mockRejectedValue(new Error('AI service failure'));

      // Should default to valid on AI failure
      const result = await validator.validateJob(job);
      expect(result.isValid).toBe(true);
    });

    it('should handle AI response parsing errors', async () => {
      const job: JobPostingData = {
        title: 'Generic Role',
        organization: 'Test Org',
        description: 'Short description but over 50 characters to pass the basic check.',
        url: 'https://example.com',
        dateScraped: new Date()
      };

      // Mock AI service to return invalid JSON
      mockAIService.generateText.mockResolvedValue('Not valid JSON');

      // Should default to valid on parsing failure
      const result = await validator.validateJob(job);
      expect(result.isValid).toBe(true);
    });
  });
});