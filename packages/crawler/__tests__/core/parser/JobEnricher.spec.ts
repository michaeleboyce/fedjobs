// File path: packages/crawler/__tests__/core/parser/JobEnricher.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobEnricher } from '../../../src/core/parser/JobEnricher';
import { JobPostingData } from '../../../src/types';
import { AIService } from '@fedjobs/utils';

// Mock the AIService
vi.mock('@fedjobs/utils', () => ({
  AIService: vi.fn().mockImplementation(() => ({
    generateText: vi.fn(),
  })),
}));

describe('JobEnricher', () => {
  let jobEnricher: JobEnricher;
  let mockAIService: any;

  beforeEach(() => {
    mockAIService = {
      generateText: vi.fn(),
    };
    jobEnricher = new JobEnricher(mockAIService);
    vi.clearAllMocks();
  });

  it('should build prompt with correct job information', async () => {
    // Setup a sample job
    const job: JobPostingData = {
      title: 'Software Engineer',
      organization: 'Example Corp',
      location: 'Remote',
      description: 'We are looking for a talented software engineer...',
      url: 'https://example.com/jobs/123',
      dateScraped: new Date(),
    };
    
    // Mock AI service to return empty JSON object
    mockAIService.generateText.mockResolvedValue('{}');
    
    await jobEnricher.enrichJobData(job);
    
    // Verify the prompt content
    const prompt = mockAIService.generateText.mock.calls[0][0].prompt;
    expect(prompt).toContain('Software Engineer');
    expect(prompt).toContain('Example Corp');
    expect(prompt).toContain('Remote');
    expect(prompt).toContain('We are looking for a talented software engineer');
    
    // Verify the AI service params
    expect(mockAIService.generateText).toHaveBeenCalledWith(expect.objectContaining({
      model: "gpt-4o",
      temperature: 0.2,
      maxTokens: 1000
    }));
  });

  it('should handle undefined location in prompt', async () => {
    // Setup a job without location
    const job: JobPostingData = {
      title: 'Software Engineer',
      organization: 'Example Corp',
      description: 'We are looking for a talented software engineer...',
      url: 'https://example.com/jobs/123',
      dateScraped: new Date(),
    };
    
    mockAIService.generateText.mockResolvedValue('{}');
    
    await jobEnricher.enrichJobData(job);
    
    // Check that the prompt includes a fallback for missing location
    const prompt = mockAIService.generateText.mock.calls[0][0].prompt;
    expect(prompt).toContain('Location: Not specified');
  });

  it('should enrich job data with AI response data', async () => {
    const job: JobPostingData = {
      title: 'Software Engineer',
      organization: 'Example Corp',
      description: 'We are looking for a talented software engineer...',
      url: 'https://example.com/jobs/123',
      dateScraped: new Date(),
    };
    
    // Mock AI service with enrichment data
    const enrichmentData = {
      skills: ['JavaScript', 'TypeScript', 'React'],
      experienceLevel: 'Senior',
      benefits: 'Health insurance, 401k, remote work',
      organizationType: 'PRIVATE',
      keyResponsibilities: ['Develop web applications', 'Code reviews', 'Mentoring junior devs']
    };
    
    mockAIService.generateText.mockResolvedValue(JSON.stringify(enrichmentData));
    
    const enrichedJob = await jobEnricher.enrichJobData(job);
    
    // Check that the job was enriched with the data
    expect(enrichedJob.skills).toEqual(['JavaScript', 'TypeScript', 'React']);
    expect(enrichedJob.experience).toBe('Senior');
    expect(enrichedJob.benefits).toBe('Health insurance, 401k, remote work');
    expect(enrichedJob.organizationType).toBe('PRIVATE');
    expect(enrichedJob.structuredData?.keyResponsibilities).toEqual([
      'Develop web applications', 'Code reviews', 'Mentoring junior devs'
    ]);
    
    // Original data should be preserved
    expect(enrichedJob.title).toBe('Software Engineer');
    expect(enrichedJob.organization).toBe('Example Corp');
  });

  it('should merge structured data with existing structured data', async () => {
    // Setup a job with existing structured data
    const job: JobPostingData = {
      title: 'Software Engineer',
      organization: 'Example Corp',
      description: 'Job description',
      url: 'https://example.com/jobs/123',
      dateScraped: new Date(),
      structuredData: {
        existingField: 'This should be preserved',
        salary: '$100k-$150k'
      }
    };
    
    // Mock AI service with enrichment data
    const enrichmentData = {
      skills: ['JavaScript'],
      experienceLevel: 'Mid-level',
      keyResponsibilities: ['Coding']
    };
    
    mockAIService.generateText.mockResolvedValue(JSON.stringify(enrichmentData));
    
    const enrichedJob = await jobEnricher.enrichJobData(job);
    
    // Check that existing structured data was preserved
    expect(enrichedJob.structuredData?.existingField).toBe('This should be preserved');
    expect(enrichedJob.structuredData?.salary).toBe('$100k-$150k');
    
    // And new data was added
    expect(enrichedJob.structuredData?.keyResponsibilities).toEqual(['Coding']);
  });

  it('should handle AI response with embedded JSON', async () => {
    const job: JobPostingData = {
      title: 'Software Engineer',
      organization: 'Example Corp',
      description: 'Job description',
      url: 'https://example.com/jobs/123',
      dateScraped: new Date(),
    };
    
    // Mock AI service with text before and after the JSON
    const aiResponse = `
    Here's the information you requested:
    
    {
      "skills": ["Python", "Data Science"],
      "experienceLevel": "Junior"
    }
    
    I hope this helps!
    `;
    
    mockAIService.generateText.mockResolvedValue(aiResponse);
    
    const enrichedJob = await jobEnricher.enrichJobData(job);
    
    // Check that the JSON was correctly extracted
    expect(enrichedJob.skills).toEqual(['Python', 'Data Science']);
    expect(enrichedJob.experience).toBe('Junior');
  });

  it('should handle invalid JSON response gracefully', async () => {
    const job: JobPostingData = {
      title: 'Software Engineer',
      organization: 'Example Corp',
      description: 'Job description',
      url: 'https://example.com/jobs/123',
      dateScraped: new Date(),
    };
    
    // Mock AI service with invalid JSON
    mockAIService.generateText.mockResolvedValue('Not a valid JSON response');
    
    const enrichedJob = await jobEnricher.enrichJobData(job);
    
    // Should return the original job without changes
    expect(enrichedJob).toEqual(job);
  });

  it('should handle AI service errors gracefully', async () => {
    const job: JobPostingData = {
      title: 'Software Engineer',
      organization: 'Example Corp',
      description: 'Job description',
      url: 'https://example.com/jobs/123',
      dateScraped: new Date(),
    };
    
    // Mock AI service to throw an error
    mockAIService.generateText.mockRejectedValue(new Error('AI service error'));
    
    const enrichedJob = await jobEnricher.enrichJobData(job);
    
    // Should return the original job without changes
    expect(enrichedJob).toEqual(job);
  });

  it('should handle undefined or null fields in AI response', async () => {
    const job: JobPostingData = {
      title: 'Software Engineer',
      organization: 'Example Corp',
      description: 'Job description',
      url: 'https://example.com/jobs/123',
      dateScraped: new Date(),
    };
    
    // Mock AI service with partial data
    const partialData = {
      // skills is missing
      experienceLevel: 'Senior',
      // other fields missing
    };
    
    mockAIService.generateText.mockResolvedValue(JSON.stringify(partialData));
    
    const enrichedJob = await jobEnricher.enrichJobData(job);
    
    // Fields should be set with defaults if missing from response
    expect(enrichedJob.skills).toEqual([]);
    expect(enrichedJob.experience).toBe('Senior');
    expect(enrichedJob.benefits).toBeUndefined();
    expect(enrichedJob.organizationType).toBeUndefined();
  });
});