// File path: packages/crawler/__tests__/core/parser/JobParserService.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobParserService } from '../../../src/core/parser/JobParserService';
import { 
  ILinkAnalyzer, 
  IHtmlCleaner, 
  IJobDataExtractor, 
  IJobEnricher 
} from '../../../src/core/parser/types';
import { JobPostingData } from '../../../src/types';

// Create mock components
const mockLinkAnalyzer: ILinkAnalyzer = {
  analyzeLinks: vi.fn()
};

const mockHtmlCleaner: IHtmlCleaner = {
  cleanHtml: vi.fn()
};

const mockJobDataExtractor: IJobDataExtractor = {
  extractJobListings: vi.fn()
};

const mockJobEnricher: IJobEnricher = {
  enrichJobData: vi.fn()
};

// Mock AIService - this will be passed to JobParserService
const mockAIService = {
  generateText: vi.fn()
};

describe('JobParserService', () => {
  let parserService: JobParserService;
  
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create a fresh JobParserService with mock components
    parserService = new JobParserService({
      aiService: mockAIService as any,
      linkAnalyzer: mockLinkAnalyzer,
      htmlCleaner: mockHtmlCleaner,
      jobDataExtractor: mockJobDataExtractor,
      jobEnricher: mockJobEnricher
    });
  });
  
  it('should delegate analyzeLinks to the LinkAnalyzer', async () => {
    // Configure mock to return sample data
    const expectedLinks = ['https://example.com/job/123'];
    mockLinkAnalyzer.analyzeLinks = vi.fn().mockResolvedValue(expectedLinks);
    
    // Test input
    const input = {
      sourceUrl: 'https://example.com',
      pageTitle: 'Careers',
      links: [{ href: 'https://example.com/job/123', text: 'Job Title', title: '', aria: '' }]
    };
    
    // Call the method
    const result = await parserService.analyzeLinks(input);
    
    // Verify linkAnalyzer was called with correct arguments
    expect(mockLinkAnalyzer.analyzeLinks).toHaveBeenCalledWith(input);
    
    // Verify the service returns whatever the analyzer returns
    expect(result).toBe(expectedLinks);
  });
  
  it('should delegate parseJobsFromPage to the JobDataExtractor', async () => {
    // Configure mock to return sample data
    const sampleJobs: JobPostingData[] = [{
      title: 'Software Engineer',
      organization: 'Example Corp',
      description: 'A job description',
      url: 'https://example.com/job/123',
      dateScraped: new Date()
    }];
    
    mockJobDataExtractor.extractJobListings = vi.fn().mockResolvedValue(sampleJobs);
    
    // Test input
    const input = {
      url: 'https://example.com/careers',
      content: '<html>...</html>',
      title: 'Careers Page',
      description: 'Find your next job'
    };
    
    // Call the method
    const result = await parserService.parseJobsFromPage(input);
    
    // Verify jobDataExtractor was called with correct arguments
    expect(mockJobDataExtractor.extractJobListings).toHaveBeenCalledWith(input);
    
    // Verify the service returns whatever the extractor returns
    expect(result).toBe(sampleJobs);
  });
  
  it('should delegate enrichJobData to the JobEnricher', async () => {
    // Input job data
    const inputJob: JobPostingData = {
      title: 'Software Engineer',
      organization: 'Example Corp',
      description: 'A job description',
      url: 'https://example.com/job/123',
      dateScraped: new Date()
    };
    
    // Enriched job data
    const enrichedJob: JobPostingData = {
      ...inputJob,
      skills: ['JavaScript', 'TypeScript'],
      experience: 'Senior',
      benefits: 'Great benefits package'
    };
    
    // Configure mock to return enriched data
    mockJobEnricher.enrichJobData = vi.fn().mockResolvedValue(enrichedJob);
    
    // Call the method
    const result = await parserService.enrichJobData(inputJob);
    
    // Verify jobEnricher was called with correct arguments
    expect(mockJobEnricher.enrichJobData).toHaveBeenCalledWith(inputJob);
    
    // Verify the service returns the enriched job data
    expect(result).toBe(enrichedJob);
  });
  
  it('should delegate cleanHtml to the HtmlCleaner', () => {
    // Configure mock to return cleaned HTML
    const cleanedHtml = 'Cleaned Content';
    mockHtmlCleaner.cleanHtml = vi.fn().mockReturnValue(cleanedHtml);
    
    // Test input
    const html = '<html><body>Content</body></html>';
    
    // Call the method
    const result = parserService.cleanHtml(html);
    
    // Verify htmlCleaner was called with correct arguments
    expect(mockHtmlCleaner.cleanHtml).toHaveBeenCalledWith(html);
    
    // Verify the service returns whatever the cleaner returns
    expect(result).toBe(cleanedHtml);
  });
  
  it('should provide access to the AIService', () => {
    // The service should expose the AIService
    const aiService = parserService.getAIService();
    
    // Should be the same instance we provided in the constructor
    expect(aiService).toBe(mockAIService);
  });
});