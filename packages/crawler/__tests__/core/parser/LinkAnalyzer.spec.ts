// File path: packages/crawler/__tests__/core/parser/LinkAnalyzer.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LinkAnalyzer } from '../../../src/core/parser/LinkAnalyzer';
import { AnalyzeLinksInput } from '../../../src/types';
import { AIService } from '@fedjobs/utils';

// Mock the AIService
vi.mock('@fedjobs/utils', () => ({
  AIService: vi.fn().mockImplementation(() => ({
    generateText: vi.fn(),
  })),
}));

describe('LinkAnalyzer', () => {
  let linkAnalyzer: LinkAnalyzer;
  let mockAIService: any;

  beforeEach(() => {
    mockAIService = {
      generateText: vi.fn(),
    };
    linkAnalyzer = new LinkAnalyzer(mockAIService);
    vi.clearAllMocks();
  });

  it('should return empty array if no links are provided', async () => {
    const input: AnalyzeLinksInput = {
      sourceUrl: 'https://example.com',
      pageTitle: 'Example Page',
      links: [],
    };

    const result = await linkAnalyzer.analyzeLinks(input);
    
    expect(result).toEqual([]);
    expect(mockAIService.generateText).not.toHaveBeenCalled();
  });

  it('should format links correctly for AI analysis', async () => {
    // Mock the AI service response
    mockAIService.generateText.mockResolvedValue('[]');
    
    const input: AnalyzeLinksInput = {
      sourceUrl: 'https://example.com',
      pageTitle: 'Careers Page',
      links: [
        { href: 'https://example.com/jobs/123', text: 'Software Engineer', title: 'Apply Now', aria: '' },
        { href: 'https://example.com/about', text: 'About Us', title: '', aria: 'About Us Page' }
      ],
    };

    await linkAnalyzer.analyzeLinks(input);
    
    // Verify the AI service was called with correctly formatted links
    expect(mockAIService.generateText).toHaveBeenCalledWith(expect.objectContaining({
      prompt: expect.stringContaining('1. URL: https://example.com/jobs/123'),
      model: "gpt-4o",
      temperature: 0.1,
      maxTokens: 2000
    }));
    
    // Check that the prompt contains both links
    const prompt = mockAIService.generateText.mock.calls[0][0].prompt;
    expect(prompt).toContain('Software Engineer');
    expect(prompt).toContain('About Us');
  });

  it('should parse AI response with job link URLs', async () => {
    // Mock a valid JSON response from AI
    mockAIService.generateText.mockResolvedValue(`
      Some text before the JSON array
      ["https://example.com/jobs/123", "https://example.com/jobs/456"]
      Some text after
    `);
    
    const input: AnalyzeLinksInput = {
      sourceUrl: 'https://example.com',
      pageTitle: 'Careers Page',
      links: [{ href: 'https://example.com/jobs/123', text: 'Job 1', title: '', aria: '' }],
    };

    const result = await linkAnalyzer.analyzeLinks(input);
    
    expect(result).toEqual(['https://example.com/jobs/123', 'https://example.com/jobs/456']);
  });

  it('should handle invalid URLs in the AI response', async () => {
    // Include an invalid URL in the response
    mockAIService.generateText.mockResolvedValue(`["https://example.com/jobs/123", "invalid-url"]`);
    
    const input: AnalyzeLinksInput = {
      sourceUrl: 'https://example.com',
      pageTitle: 'Careers Page',
      links: [{ href: 'https://example.com/jobs/123', text: 'Job 1', title: '', aria: '' }],
    };

    const result = await linkAnalyzer.analyzeLinks(input);
    
    // Only valid URLs should be returned
    expect(result).toEqual(['https://example.com/jobs/123']);
  });

  it('should handle invalid JSON in the AI response', async () => {
    // Mock an invalid JSON response
    mockAIService.generateText.mockResolvedValue(`Not a valid JSON array`);
    
    const input: AnalyzeLinksInput = {
      sourceUrl: 'https://example.com',
      pageTitle: 'Careers Page',
      links: [{ href: 'https://example.com/jobs/123', text: 'Job 1', title: '', aria: '' }],
    };

    const result = await linkAnalyzer.analyzeLinks(input);
    
    expect(result).toEqual([]);
  });

  it('should extract domain from sourceUrl', async () => {
    mockAIService.generateText.mockResolvedValue('[]');
    
    const input: AnalyzeLinksInput = {
      sourceUrl: 'https://www.example.com/careers',
      pageTitle: 'Careers Page',
      links: [{ href: 'https://example.com/jobs/123', text: 'Job 1', title: '', aria: '' }],
    };

    await linkAnalyzer.analyzeLinks(input);
    
    // Verify the domain was extracted and included in the prompt
    const prompt = mockAIService.generateText.mock.calls[0][0].prompt;
    expect(prompt).toContain('example.com');
    expect(prompt).not.toContain('www.example.com');
  });

  it('should handle errors and return empty array', async () => {
    // Mock the AI service to throw an error
    mockAIService.generateText.mockRejectedValue(new Error('AI service error'));
    
    const input: AnalyzeLinksInput = {
      sourceUrl: 'https://example.com',
      pageTitle: 'Careers Page',
      links: [{ href: 'https://example.com/jobs/123', text: 'Job 1', title: '', aria: '' }],
    };

    const result = await linkAnalyzer.analyzeLinks(input);
    
    // Should handle error gracefully and return empty array
    expect(result).toEqual([]);
  });

  it('should fallback to split method if URL parsing fails', async () => {
    mockAIService.generateText.mockResolvedValue('[]');
    
    // Provide an invalid URL that will cause URL parsing to fail
    const input: AnalyzeLinksInput = {
      sourceUrl: 'invalid-url',
      pageTitle: 'Careers Page',
      links: [{ href: 'https://example.com/jobs/123', text: 'Job 1', title: '', aria: '' }],
    };

    await linkAnalyzer.analyzeLinks(input);
    
    // The service should still work despite the invalid URL
    expect(mockAIService.generateText).toHaveBeenCalled();
  });
});