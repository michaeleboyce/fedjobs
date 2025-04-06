// File: packages/crawler/__tests__/core/parser/JobDataExtractor.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobDataExtractor } from '../../../src/core/parser/JobDataExtractor';
import { ParsePageInput } from '../../../src/types';
import { AIService } from '@fedjobs/utils';
import { HtmlCleaner } from '../../../src/core/parser/HtmlCleaner';

// Mock the AI service so we can control generateText calls
vi.mock('@fedjobs/utils', () => ({
  AIService: vi.fn().mockImplementation(() => ({
    generateText: vi.fn(), // We’ll spy on this in tests
  })),
}));

// Mock HtmlCleaner so we can control the cleaned HTML length, etc.
vi.mock('../../../src/core/parser/HtmlCleaner', () => ({
  HtmlCleaner: vi.fn().mockImplementation(() => ({
    cleanHtml: vi.fn(),
  })),
}));

describe('JobDataExtractor', () => {
  let jobDataExtractor: JobDataExtractor;
  let mockAIService: any;
  let mockHtmlCleaner: any;

  beforeEach(() => {
    // Fresh mocks before each test
    mockAIService = {
      generateText: vi.fn(),
    };
    mockHtmlCleaner = {
      cleanHtml: vi.fn(),
    };

    // Instantiate with our mocked dependencies
    jobDataExtractor = new JobDataExtractor(mockAIService, mockHtmlCleaner);

    vi.clearAllMocks();
  });

  it('should skip parsing if content is too short', async () => {
    const input: ParsePageInput = {
      url: 'https://example.com/jobs',
      content: '<html><body>Short content</body></html>',
      title: 'Jobs Page',
      description: 'Description',
    };

    // Force the cleaner to return a short string, so the code bails out
    mockHtmlCleaner.cleanHtml.mockReturnValue('Very short');

    const result = await jobDataExtractor.extractJobListings(input);

    // We expect no AI call because the content was too short
    expect(result).toEqual([]);
    expect(mockAIService.generateText).not.toHaveBeenCalled();
  });

  it('should detect if a page is likely a job listing page', async () => {
    const input: ParsePageInput = {
      url: 'https://example.com/careers/job-listings',
      content: '<html><body>Content</body></html>',
      title: 'Job Listings',
      description: 'Description',
    };

    // The returned cleaned HTML must exceed 100 chars so the code doesn’t skip
    mockHtmlCleaner.cleanHtml.mockReturnValue('A'.repeat(150));
    mockAIService.generateText.mockResolvedValue('[]');

    await jobDataExtractor.extractJobListings(input);

    // The prompt is found in generateText.mock.calls[0][0].prompt
    const prompt = mockAIService.generateText.mock.calls[0][0].prompt;
    expect(prompt).toContain('This appears to be a job-related page');
  });

  it('should correctly extract domain from URL', async () => {
    const input: ParsePageInput = {
      url: 'https://www.example.com/careers',
      content: '<html><body>Content</body></html>',
      title: 'Careers',
      description: 'Description',
    };

    // Again, ensure it's >100 chars so the AI call is made
    mockHtmlCleaner.cleanHtml.mockReturnValue('B'.repeat(150));
    mockAIService.generateText.mockResolvedValue('[]');

    await jobDataExtractor.extractJobListings(input);

    const prompt = mockAIService.generateText.mock.calls[0][0].prompt;
    // The domain should be "example.com" (no "www.")
    expect(prompt).toContain('example.com');
    expect(prompt).not.toContain('www.example.com');
  });

  it('should parse and process job data from AI response', async () => {
    const input: ParsePageInput = {
      url: 'https://example.com/jobs',
      content: '<html><body>Content</body></html>',
      title: 'Jobs',
      description: 'Description',
    };

    const mockJobListings = [
      {
        title: 'Software Engineer',
        organization: 'Example Corp',
        description: 'Job description',
        url: 'https://example.com/jobs/123',
      },
      {
        title: 'Product Manager',
        organization: '',
        description: 'Another job',
        url: '/jobs/456',
      },
    ];

    // Return a sufficiently long string
    mockHtmlCleaner.cleanHtml.mockReturnValue('C'.repeat(200));

    // Mock AI’s response to be JSON of 2 jobs
    mockAIService.generateText.mockResolvedValue(JSON.stringify(mockJobListings));

    const result = await jobDataExtractor.extractJobListings(input);
    expect(result).toHaveLength(2);

    expect(result[0].title).toBe('Software Engineer');
    expect(result[0].organization).toBe('Example Corp');
    expect(result[0].url).toBe('https://example.com/jobs/123');

    expect(result[1].title).toBe('Product Manager');
    // Organization fallback uses the domain from "example.com"
    expect(result[1].organization).toBe('example.com');
    expect(result[1].url).toBe('https://example.com/jobs/456');

    // The code automatically sets dateScraped
    expect(result[0].dateScraped).toBeInstanceOf(Date);
    expect(result[1].dateScraped).toBeInstanceOf(Date);
  });

  it('should handle different formats of AI response', async () => {
    const input: ParsePageInput = {
      url: 'https://example.com/jobs',
      content: '<html><body>Content</body></html>',
      title: 'Jobs',
      description: 'Description',
    };

    // Must be >100 chars
    mockHtmlCleaner.cleanHtml.mockReturnValue('D'.repeat(150));

    // AI returns an object with "jobs" array
    const mockResponse = {
      jobs: [
        {
          title: 'Developer',
          organization: 'Example Corp',
          description: 'Job description',
          url: 'https://example.com/jobs/789',
        },
      ],
    };
    mockAIService.generateText.mockResolvedValue(JSON.stringify(mockResponse));

    const result = await jobDataExtractor.extractJobListings(input);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Developer');
  });

  it('should handle AI response with invalid JSON', async () => {
    const input: ParsePageInput = {
      url: 'https://example.com/jobs',
      content: '<html><body>Content</body></html>',
      title: 'Jobs',
      description: 'Description',
    };

    mockHtmlCleaner.cleanHtml.mockReturnValue('E'.repeat(150));
    // Return something that's not valid JSON
    mockAIService.generateText.mockResolvedValue('Not a valid JSON response');

    const result = await jobDataExtractor.extractJobListings(input);
    // Should fail gracefully, returning empty array
    expect(result).toEqual([]);
  });

  it('should include keywords in the prompt if provided', async () => {
    const input: ParsePageInput = {
      url: 'https://example.com/jobs',
      content: '<html><body>Content</body></html>',
      title: 'Jobs',
      description: 'Description',
      keywords: 'developer, javascript',
    };

    mockHtmlCleaner.cleanHtml.mockReturnValue('F'.repeat(150));
    mockAIService.generateText.mockResolvedValue('[]');

    await jobDataExtractor.extractJobListings(input);

    const prompt = mockAIService.generateText.mock.calls[0][0].prompt;
    expect(prompt).toContain('Focus on jobs related to these keywords: developer, javascript');
  });

  it('should handle various URL formats correctly', async () => {
    const input: ParsePageInput = {
      url: 'https://example.com/careers/',
      content: '<html><body>Content</body></html>',
      title: 'Careers',
      description: 'Description',
    };

    const mockJobs = [
      {
        title: 'Job with absolute URL',
        organization: 'Example Corp',
        description: 'Description',
        url: 'https://different-domain.com/jobs/123',
      },
      {
        title: 'Job with relative URL',
        organization: 'Example Corp',
        description: 'Description',
        url: '../jobs/456',
      },
      {
        title: 'Job with no URL',
        organization: 'Example Corp',
        description: 'Description',
        url: '',
      },
    ];

    mockHtmlCleaner.cleanHtml.mockReturnValue('G'.repeat(150));
    mockAIService.generateText.mockResolvedValue(JSON.stringify(mockJobs));

    const result = await jobDataExtractor.extractJobListings(input);

    // The first job's URL should remain as is
    expect(result[0].url).toBe('https://different-domain.com/jobs/123');

    // The second job's URL should become absolute for "https://example.com/careers/"
    expect(result[1].url).toBe('https://example.com/jobs/456');

    // If there's no URL, fallback to the current page URL
    expect(result[2].url).toBe('https://example.com/careers/');
  });

  it('should handle errors gracefully', async () => {
    const input: ParsePageInput = {
      url: 'https://example.com/jobs',
      content: '<html><body>Content</body></html>',
      title: 'Jobs',
      description: 'Description',
    };

    mockHtmlCleaner.cleanHtml.mockReturnValue('H'.repeat(150));
    // Simulate AI failing
    mockAIService.generateText.mockRejectedValue(new Error('AI service error'));

    const result = await jobDataExtractor.extractJobListings(input);
    // Should catch and return empty array
    expect(result).toEqual([]);
  });
});
