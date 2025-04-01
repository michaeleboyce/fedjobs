// File path: packages/utils/src/Parsers/__tests__/JobPostingParser.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  parseJobPosting, 
  parseJobPostingWithRaw, 
  extractMultipleJobPostings,
  jobPostingSchema 
} from '../JobPostingParser';
import { aiService } from '../../Services/AIService';

// Mock the AI service
vi.mock('../../Services/AIService', () => {
  return {
    aiService: {
      generateStructuredOutput: vi.fn()
    }
  };
});

describe('JobPostingParser', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  
  describe('jobPostingSchema', () => {
    it('should have all required fields for job listings', () => {
      // Test that the schema contains all necessary fields
      expect(jobPostingSchema).toHaveProperty('title');
      expect(jobPostingSchema).toHaveProperty('organization');
      expect(jobPostingSchema).toHaveProperty('description');
      expect(jobPostingSchema).toHaveProperty('url');
      
      // Check field types
      expect(jobPostingSchema.title.type).toBe('string');
      expect(jobPostingSchema.organization.type).toBe('string');
      expect(jobPostingSchema.type.enum).toContain('FULL_TIME');
      expect(jobPostingSchema.skills.type).toBe('array');
      
      // Check that descriptions are provided
      expect(jobPostingSchema.title.description).toBeTruthy();
      expect(jobPostingSchema.organization.description).toBeTruthy();
    });
    
    it('should have the correct enums for organization types', () => {
      expect(jobPostingSchema.organizationType.enum).toEqual([
        'GOVERNMENT', 'NONPROFIT', 'PRIVATE', 'PUBLIC', 'ACADEMIC', 'STARTUP', 'OTHER'
      ]);
    });
    
    it('should have the correct enums for employment types', () => {
      expect(jobPostingSchema.type.enum).toEqual([
        'FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP', 'REMOTE', 'HYBRID', 'OTHER'
      ]);
    });
  });

  describe('parseJobPosting', () => {
    it('should parse a job posting into structured data', async () => {
      // Mock the AI service response
      const mockJobData = {
        title: 'Senior Software Engineer',
        organization: 'TechInnovate Inc.',
        location: 'New York, NY (Hybrid)',
        salary: '$120,000 - $150,000 USD annually',
        type: 'FULL_TIME',
        description: 'TechInnovate is seeking a Senior Software Engineer to join our growing team.',
        requirements: '5+ years of professional software engineering experience',
        benefits: 'Comprehensive health, dental, and vision insurance',
        url: 'https://example.com/job/123',
        skills: ['JavaScript', 'TypeScript', 'React']
      };

      vi.mocked(aiService.generateStructuredOutput).mockResolvedValue({
        data: mockJobData,
        rawResponse: JSON.stringify(mockJobData)
      });

      const jobText = `
        # Senior Software Engineer
        
        ## Company: TechInnovate Inc.
        
        **Location:** New York, NY (Hybrid - 3 days in office)
        **Salary:** $120,000 - $150,000 USD annually
        **Type:** Full-time
      `;

      const result = await parseJobPosting(jobText);

      // Assert the AI service was called correctly
      expect(aiService.generateStructuredOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining(jobText),
          schema: expect.any(Object),
          toolName: 'parse_job_posting'
        })
      );

      // Assert the result is as expected
      expect(result).toEqual(mockJobData);
    });

    it('should handle missing fields and use fallbacks', async () => {
      // Mock with missing URL and description
      const mockJobData = {
        title: 'Software Developer',
        organization: 'Tech Company',
        type: 'FULL_TIME'
      };

      vi.mocked(aiService.generateStructuredOutput).mockResolvedValue({
        data: mockJobData as any, // Type assertion to bypass TS checks
        rawResponse: JSON.stringify(mockJobData)
      });

      const jobText = 'Software Developer job at Tech Company';
      const url = 'https://example.com/job/456';

      const result = await parseJobPosting(jobText, { url });

      // Check if fallbacks were applied
      expect(result.url).toBe(url);
      expect(result.description).toBe(jobText);
    });

    it('should use Claude model when specified in options', async () => {
      const mockJobData = {
        title: 'Data Engineer',
        organization: 'BigData Inc.',
        description: 'Working with big data technologies',
        url: 'https://example.com/jobs/data-engineer'
      };

      vi.mocked(aiService.generateStructuredOutput).mockResolvedValue({
        data: mockJobData,
        rawResponse: JSON.stringify(mockJobData)
      });

      const jobText = 'Data Engineer position at BigData Inc.';
      const claudeModel = 'claude-3-7-sonnet-20250219';
      
      await parseJobPosting(jobText, { model: claudeModel });

      // Verify Claude model was used
      expect(aiService.generateStructuredOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          model: claudeModel
        })
      );
    });

    it('should parse government job postings correctly', async () => {
      // Government job data might have specific fields
      const govJobData = {
        title: 'Program Analyst',
        organization: 'Department of Labor',
        organizationType: 'GOVERNMENT',
        location: 'Washington, DC',
        description: 'Federal position with the Department of Labor',
        salary: 'GS-12 ($87,198 - $113,362)',
        type: 'FULL_TIME',
        requirements: 'US citizenship required. 3+ years of relevant experience.',
        url: 'https://usajobs.gov/jobs/123456'
      };

      vi.mocked(aiService.generateStructuredOutput).mockResolvedValue({
        data: govJobData,
        rawResponse: JSON.stringify(govJobData)
      });

      const jobText = `
        Program Analyst
        Department of Labor
        
        Location: Washington, DC
        Salary: GS-12 ($87,198 - $113,362)
        
        US citizenship required. 3+ years of relevant experience.
      `;

      const result = await parseJobPosting(jobText);

      expect(result.organizationType).toBe('GOVERNMENT');
      expect(result.salary).toContain('GS-12');
    });

    it('should handle structured data objects in the result', async () => {
      // Test with structured data in the job posting
      const jobWithStructuredData = {
        title: 'Senior Developer',
        organization: 'Tech Corp',
        description: 'Development role',
        url: 'https://example.com/jobs/dev',
        structuredData: {
          keyResponsibilities: ['Code reviews', 'System design'],
          techStack: ['Node.js', 'React', 'PostgreSQL'],
          projectTypes: ['Web applications', 'Mobile apps']
        }
      };

      vi.mocked(aiService.generateStructuredOutput).mockResolvedValue({
        data: jobWithStructuredData,
        rawResponse: JSON.stringify(jobWithStructuredData)
      });

      const result = await parseJobPosting('Senior Developer job description');

      expect(result.structuredData).toBeDefined();
      expect(result.structuredData?.techStack).toContain('React');
      expect(result.structuredData?.keyResponsibilities).toHaveLength(2);
    });

    it('should handle error from AI service gracefully', async () => {
      // Mock an error from the AI service
      const mockError = new Error('API rate limit exceeded');
      vi.mocked(aiService.generateStructuredOutput).mockRejectedValue(mockError);

      const jobText = 'Marketing Manager position';
      
      await expect(parseJobPosting(jobText)).rejects.toThrow('API rate limit exceeded');
    });
  });

  describe('parseJobPostingWithRaw', () => {
    it('should return both parsed data and raw response', async () => {
      const mockJobData = {
        title: 'Data Scientist',
        organization: 'AI Research Labs',
        description: 'Working on cutting-edge AI research',
        url: 'https://example.com/job/789'
      };

      const rawResponse = JSON.stringify(mockJobData);

      vi.mocked(aiService.generateStructuredOutput).mockResolvedValue({
        data: mockJobData as any,
        rawResponse
      });

      const jobText = 'Data Scientist job description';
      const result = await parseJobPostingWithRaw(jobText);

      expect(result.data).toEqual(mockJobData);
      expect(result.rawResponse).toBe(rawResponse);
    });
  });

  describe('extractMultipleJobPostings', () => {
    it('should extract multiple job postings from page content', async () => {
      const mockJobs = {
        jobs: [
          {
            title: 'Frontend Developer',
            organization: 'WebTech Inc.',
            description: 'Building user interfaces',
            url: 'https://example.com/jobs/frontend'
          },
          {
            title: 'Backend Developer',
            organization: 'WebTech Inc.',
            description: 'Building APIs',
            url: 'https://example.com/jobs/backend'
          }
        ]
      };

      vi.mocked(aiService.generateStructuredOutput).mockResolvedValue({
        data: mockJobs,
        rawResponse: JSON.stringify(mockJobs)
      });

      const pageText = 'Page with multiple job listings';
      const result = await extractMultipleJobPostings(pageText);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Frontend Developer');
      expect(result[1].title).toBe('Backend Developer');

      // Check keywords were passed correctly
      await extractMultipleJobPostings(pageText, { keywords: ['developer', 'javascript'] });
      expect(aiService.generateStructuredOutput).toHaveBeenLastCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('developer, javascript')
        })
      );
    });

    it('should handle job listings with missing fields', async () => {
      const mockJobs = {
        jobs: [
          {
            title: 'DevOps Engineer',
            organization: 'Cloud Solutions'
            // Missing description and URL
          }
        ]
      };

      vi.mocked(aiService.generateStructuredOutput).mockResolvedValue({
        data: mockJobs as any,
        rawResponse: JSON.stringify(mockJobs)
      });

      const pageText = 'DevOps job listing';
      const url = 'https://example.com/jobs';
      const result = await extractMultipleJobPostings(pageText, { url });

      expect(result[0].url).toBe(url);
      expect(result[0].description).toBe('No description provided.');
    });

    it('should handle a large page with many job listings', async () => {
      // Create mock data with 10 job listings
      const mockJobs = {
        jobs: Array.from({ length: 10 }, (_, i) => ({
          title: `Job Title ${i + 1}`,
          organization: 'Large Company',
          description: `Description for job ${i + 1}`,
          url: `https://example.com/jobs/${i + 1}`
        }))
      };

      vi.mocked(aiService.generateStructuredOutput).mockResolvedValue({
        data: mockJobs,
        rawResponse: JSON.stringify(mockJobs)
      });

      // Create a long page text (simulating a real job board)
      const largePageText = Array.from({ length: 10 }, (_, i) => 
        `Job ${i + 1}: Software Developer\nLarge Company\nApply now!`
      ).join('\n\n');

      const result = await extractMultipleJobPostings(largePageText);

      expect(result).toHaveLength(10);
      expect(result[5].title).toBe('Job Title 6');
      expect(aiService.generateStructuredOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          toolName: 'extract_job_listings'
        })
      );
    });

    it('should handle pages with no job listings', async () => {
      // Mock empty jobs array
      const mockJobs = { jobs: [] };

      vi.mocked(aiService.generateStructuredOutput).mockResolvedValue({
        data: mockJobs,
        rawResponse: JSON.stringify(mockJobs)
      });

      const pageText = 'This page has no job listings.';
      const result = await extractMultipleJobPostings(pageText);

      expect(result).toHaveLength(0);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should respect temperature settings in options', async () => {
      const mockJobs = {
        jobs: [
          {
            title: 'Product Manager',
            organization: 'Tech Startup',
            description: 'Product development role',
            url: 'https://example.com/jobs/pm'
          }
        ]
      };

      vi.mocked(aiService.generateStructuredOutput).mockResolvedValue({
        data: mockJobs,
        rawResponse: JSON.stringify(mockJobs)
      });

      const pageText = 'Product Manager job listing';
      const customTemperature = 0.7;
      
      await extractMultipleJobPostings(pageText, { temperature: customTemperature });

      expect(aiService.generateStructuredOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: customTemperature
        })
      );
    });

    it('should handle error from the AI service', async () => {
      // Simulate API error
      const mockError = new Error('Service temporarily unavailable');
      vi.mocked(aiService.generateStructuredOutput).mockRejectedValue(mockError);

      const pageText = 'Career opportunities page';
      
      await expect(extractMultipleJobPostings(pageText)).rejects.toThrow('Service temporarily unavailable');
    });
  });
});