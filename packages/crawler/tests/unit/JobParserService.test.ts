// tests/unit/JobParserService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobParserService } from '../../src/core/parser';
import { AIService } from '@fedjobs/utils';
import { ILogger } from '../../src/interfaces/ILogger';
import { ErrorCode, ParserError } from '../../src/utils/errors';
import type { MockedClass, Mocked, Mock } from 'vitest';
import { JobPostingData, PageType, LinkPriority } from '../../src/types';

// --- Define Mock Implementations FIRST (before vi.mock) ---
const mockAIServiceImpl = {
  generateText: vi.fn(),
  createStreamingResponse: vi.fn()
};

// Logger mock
const mockLoggerImpl: ILogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

// Define the Cheerio mock API (before vi.mock)
const mockCheerioAPI = {
  remove: vi.fn().mockReturnThis(), 
  removeAttr: vi.fn().mockReturnThis(),
  length: 1,
  text: vi.fn().mockReturnValue('Mock content with sufficient length'),
  trim: vi.fn().mockReturnValue('Mock content with sufficient length'),
  find: vi.fn().mockReturnThis(), 
  map: vi.fn((callback: (index: number, element: any) => any) => {
      const mockElements = [
          { attribs: { href: '/jobs/engineer' }, children: [{ data: 'Engineer' }] },
          { attribs: { href: 'https://example.com/jobs/designer' }, children: [{ data: 'Designer' }] },
          { attribs: { href: 'about-us' }, children: [{ data: 'About' }] } 
      ];
      return {
          get: vi.fn().mockReturnValue(mockElements.map((el, i) => callback(i, el)))
      };
  }),
  each: vi.fn((callback: (index: number, element: any) => void) => {
    const mockAnchors = [
        { attribs: { href: '/jobs/engineer' }, children: [{ data: 'Engineer' }], tagName: 'a' },
        { attribs: { href: 'https://example.com/jobs/designer' }, children: [{ data: 'Designer' }], tagName: 'a' },
        { attribs: {}, children: [], tagName: 'div' } 
    ];
    mockAnchors.forEach((el, i) => callback.call(el, i, el)); 
  }),
};

// --- Mock Modules AFTER implementation definitions --- 
vi.mock('@fedjobs/utils', () => ({
  AIService: vi.fn(() => mockAIServiceImpl)
}));

vi.mock('cheerio', () => ({
  load: vi.fn().mockReturnValue(mockCheerioAPI) 
}));

describe('JobParserService', () => {
  let parser: JobParserService;
  const MockAIService = AIService as MockedClass<typeof AIService>; // Get the mocked constructor
  const mockLogger: ILogger = mockLoggerImpl; // Use the mock implementation directly

  beforeEach(() => {
    // Reset all mocks defined with vi.fn()
    vi.clearAllMocks(); 
    // Also reset mocks on the Cheerio API object
    Object.values(mockCheerioAPI).forEach(m => typeof m === 'function' && m.mockClear());
    mockCheerioAPI.find.mockReturnThis(); // Re-set chaining mocks
    mockCheerioAPI.remove.mockReturnThis();
    mockCheerioAPI.removeAttr.mockReturnThis();
    // Reset the AIService mock implementation
    mockAIServiceImpl.generateText.mockImplementation(async ({ prompt }) => '[]'); 
    
    // Create new parser instance
    parser = new JobParserService(new MockAIService(), mockLogger);
    
    // Mock cleanHtml - ensure this uses the parser instance created *after* mocks are set up
    vi.spyOn(parser as any, 'cleanHtml').mockReturnValue('Cleaned HTML content long enough for parsing.');
  });

  it('should initialize correctly', () => {
    expect(parser).toBeDefined();
    expect(MockAIService).toHaveBeenCalledTimes(1);
  });

  it('should call AI service with correct prompt for analyzeLinks and parse valid JSON', async () => {
    const links = [
      { href: 'https://example.com/job/123', text: 'Software Engineer', title: 'View Job', aria: '' },
      { href: 'https://example.com/careers', text: 'Careers Page', title: '', aria: '' }
    ];
    const expectedJsonResponse = '["https://example.com/job/123"]';
    const expectedResult = ['https://example.com/job/123'];
    
    mockAIServiceImpl.generateText.mockResolvedValueOnce(expectedJsonResponse);
    
    const result = await parser.analyzeLinks({
      sourceUrl: 'https://example.com',
      pageTitle: 'Careers',
      links
    });
    
    expect(mockAIServiceImpl.generateText).toHaveBeenCalledOnce();
    expect(mockLogger.error).not.toHaveBeenCalled(); 
    expect(result).toEqual(expectedResult);
  });

  it('should handle AI service errors gracefully in analyzeLinks', async () => {
    const aiError = new Error('AI service failed miserably');
    mockAIServiceImpl.generateText.mockRejectedValueOnce(aiError);
    
    await expect(parser.analyzeLinks({
      sourceUrl: 'https://example.com',
      pageTitle: 'Careers',
      links: [{ href: 'https://example.com/job/123', text: 'Job', title: '', aria: '' }]
    })).rejects.toThrow(ParserError);

    expect(mockLogger.error).toHaveBeenCalledWith('Error in AI service call:', expect.objectContaining({ error: aiError }));
  });

  it('should handle JSON parsing errors gracefully in analyzeLinks', async () => {
    const invalidJsonResponse = 'this is not json{';
    mockAIServiceImpl.generateText.mockResolvedValueOnce(invalidJsonResponse); 
    try {
        await parser.analyzeLinks({
          sourceUrl: 'https://example.com',
          pageTitle: 'Careers',
          links: [{ href: 'https://example.com/job/123', text: 'Job', title: '', aria: '' }]
        });
        expect.fail('Promise should have rejected but resolved instead.');
    } catch (error) {
        expect(error).toBeInstanceOf(ParserError);
        expect((error as ParserError).code).toBe(ErrorCode.PARSER_LINK_ANALYSIS_FAILED);
        expect((error as ParserError).context?.response).toBe(invalidJsonResponse);
        expect(mockLogger.error).toHaveBeenCalledWith('Error parsing AI response for link analysis:', expect.any(SyntaxError)); 
    }
  });

  it('should return empty array for empty links input in analyzeLinks', async () => {
    const result = await parser.analyzeLinks({
      sourceUrl: 'https://example.com',
      pageTitle: 'Careers',
      links: []
    });
    
    expect(result).toEqual([]);
    expect(mockAIServiceImpl.generateText).not.toHaveBeenCalled();
  });

  it('should call AI service and parse valid job data from page', async () => {
    const mockHtml = '<html><body>Valid Job Data Page Content Long Enough</body></html>'; 
    const aiJsonResponse = JSON.stringify([{
        title: 'Real Job Title', organization: 'example.com', location: 'Remote', 
        description: 'Description', url: 'https://example.com/job/apply/123', employmentType: 'FULL_TIME'
    }]);
    const expectedJob = {
      title: 'Real Job Title',
      organization: 'example.com',
      location: 'Remote',
      description: 'Description',
      url: 'https://example.com/job/apply/123',
      employmentType: 'FULL_TIME',
      dateScraped: expect.any(Date)
    };

    mockAIServiceImpl.generateText.mockResolvedValueOnce(aiJsonResponse);
    
    const result = await parser.parseJobsFromPage({ url: '...', content: mockHtml, title:'...', description:'...' });
    
    expect(mockAIServiceImpl.generateText).toHaveBeenCalledOnce(); 
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject(expectedJob);
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should return empty array if cleaned HTML content is too short', async () => {
    vi.spyOn(parser as any, 'cleanHtml').mockReturnValueOnce('Short');
    
    const shortHtml = '<html><body>Hi</body></html>';
    
    const result = await parser.parseJobsFromPage({
      url: 'https://example.com/short',
      content: shortHtml,
      title: 'Short Page',
      description: ''
    });

    expect(result).toEqual([]);
    expect(mockAIServiceImpl.generateText).not.toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith('Content too short, skipping parsing');
  });

  it('should handle AI service errors gracefully in parseJobsFromPage', async () => {
    const mockHtml = '<html><body>Content long enough for parseJobsFromPage AI error test</body></html>';
    const aiError = new Error('AI service error during parse');
    mockAIServiceImpl.generateText.mockRejectedValueOnce(aiError);
    
    await expect(parser.parseJobsFromPage({ url: '...', content: mockHtml, title:'...', description:'...' })).rejects.toMatchObject({
      code: ErrorCode.PARSER_AI_QUERY_FAILED,
      message: expect.stringContaining('AI service failed during job extraction')
    });

    expect(mockLogger.error).toHaveBeenCalledWith('Error in AI service call:', expect.objectContaining({ error: aiError }));
  });

  it('should handle JSON parsing errors gracefully in parseJobsFromPage', async () => {
    const mockHtml = '<html><body>Content long enough for JSON error test</body></html>';
    const invalidJsonResponse = 'not json at all [';
    mockAIServiceImpl.generateText.mockResolvedValueOnce(invalidJsonResponse);

    try {
        await parser.parseJobsFromPage({ url: '...', content: mockHtml, title:'...', description:'...' });
        expect.fail('Promise should have rejected but resolved instead.');
    } catch (error) {
        expect(error).toBeInstanceOf(ParserError);
        expect((error as ParserError).code).toBe(ErrorCode.PARSER_JOB_EXTRACTION_FAILED);
        expect((error as ParserError).message).toContain('Failed to parse AI response for job extraction');
        expect((error as ParserError).context?.response).toBe(invalidJsonResponse);
        expect(mockLogger.error).toHaveBeenCalledWith('Error parsing AI response:', expect.any(SyntaxError));
    }
  });

  it('should enrich job data correctly using AI service', async () => {
    const enrichmentJsonResponse = JSON.stringify({
        skills: ['Node.js', 'TypeScript'], experienceLevel: 'Mid-level', benefits: '401k, Health',
        organizationType: 'STARTUP', keyResponsibilities: ['Develop features', 'Write tests']
    });
    const initialJob: JobPostingData = {
      title: 'Backend Engineer',
      organization: 'Startup Co',
      description: 'Build cool things',
      url: 'https://startup.co/job/backend',
      dateScraped: new Date(2025, 3, 2)
    };
    mockAIServiceImpl.generateText.mockResolvedValueOnce(enrichmentJsonResponse);

    const result = await parser.enrichJobData(initialJob);
    
    expect(mockAIServiceImpl.generateText).toHaveBeenCalledOnce();
    expect(result).toEqual(expect.objectContaining({ 
      ...initialJob,
      skills: ['Node.js', 'TypeScript'],
      experience: 'Mid-level',
      benefits: '401k, Health',
      organizationType: 'STARTUP',
      structuredData: {
        keyResponsibilities: ['Develop features', 'Write tests']
      }
    }));
  });

  it('should return original job data if AI enrichment service fails', async () => {
    const initialJob: JobPostingData = { 
      title: 'Test Job', 
      organization: 'Test Org', 
      description: 'Test Desc', 
      url: 'https://test.com/job', 
      dateScraped: new Date()
    }; 
    const aiError = new Error('Enrichment failed specific test');

    mockAIServiceImpl.generateText.mockReset();
    mockAIServiceImpl.generateText.mockRejectedValueOnce(aiError);

    const result = await parser.enrichJobData(initialJob);
    
    expect(result).toEqual(initialJob); 
    expect(mockLogger.error).toHaveBeenCalledWith('Error in enrichJobData:', { error: aiError });
  });

  it('should return original job data if AI enrichment response is invalid JSON', async () => {
    const initialJob: JobPostingData = { 
      title: 'Test Job', 
      organization: 'Test Org', 
      description: 'Test Desc', 
      url: 'https://test.com/job', 
      dateScraped: new Date()
    }; 
    const invalidJsonResponse = '{';

    mockAIServiceImpl.generateText.mockResolvedValueOnce(invalidJsonResponse);

    const result = await parser.enrichJobData(initialJob);
    
    expect(result).toEqual(initialJob);
    expect(mockLogger.error).toHaveBeenCalledWith('Error parsing enrichment response:', expect.any(Object));
  });

  it('should correctly classify a job listing page', async () => {
    vi.spyOn(parser as any, 'cleanHtml').mockReturnValue('Long enough content for classification');
    const aiResponseJson = JSON.stringify({
      classification: 'JOB_LISTING', confidence: 0.95, relevance: 0.9,
      estimatedJobCount: 8, jobIndicators: ['multiple job titles'],
      pageStructure: 'List', reasoning: 'Looks like jobs'
    });
    mockAIServiceImpl.generateText.mockResolvedValueOnce(aiResponseJson);
    
    const result = await parser.classifyPage({ url: '...', content: 'Valid length content for classify job listing', title:'...', description:'...' });
    
    expect(mockAIServiceImpl.generateText).toHaveBeenCalledOnce();
    expect(result.pageType).toBe(PageType.JOB_LISTING);
    expect(result.confidence).toBeCloseTo(0.95);
    expect(result.relevance).toBeCloseTo(0.9);
    expect(result.metadata.estimatedJobCount).toBe(8);
    expect(Array.isArray(result.metadata.jobIndicators)).toBe(true);
  });

  it('should correctly classify a single job page', async () => {
    vi.spyOn(parser as any, 'cleanHtml').mockReturnValue('Valid content for single job classification test');
    const aiResponseJson = JSON.stringify({
      classification: 'SINGLE_JOB', confidence: 0.98, relevance: 0.95, 
      jobIndicators: ['description'], pageStructure: 'Single', reasoning: 'Looks like one job'
    });
    mockAIServiceImpl.generateText.mockResolvedValueOnce(aiResponseJson);
    
    const result = await parser.classifyPage({ url: '...', content: 'Valid content for single job classification test', title:'...', description:'...' });
    
    expect(mockAIServiceImpl.generateText).toHaveBeenCalledOnce();
    expect(result.pageType).toBe(PageType.SINGLE_JOB);
    expect(result.confidence).toBeCloseTo(0.98);
    expect(result.relevance).toBeCloseTo(0.95);
    expect(Array.isArray(result.metadata.jobIndicators)).toBe(true);
  });

  it('should classify a page as UNKNOWN when content is too short', async () => {
    vi.spyOn(parser as any, 'cleanHtml').mockReturnValueOnce('Very short content');
    
    const mockHtml = '<html><body><p>Short</p></body></html>';
    
    const result = await parser.classifyPage({
      url: 'https://example.com/notajob',
      content: mockHtml,
      title: 'Not a Job Page',
      description: 'This is not a job-related page'
    });
    
    expect(mockAIServiceImpl.generateText).not.toHaveBeenCalled();
    expect(result.pageType).toBe(PageType.UNKNOWN);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.relevance).toBeLessThan(0.5);
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('too short'));
  });

  it('should handle AI service errors in classifyPage', async () => {
    const mockHtml = '<html><body>Content long enough for classify AI error test</body></html>';
    const aiError = new Error('AI classification service failed');
    mockAIServiceImpl.generateText.mockRejectedValueOnce(aiError);
    
    try {
        await parser.classifyPage({ url: '...', content: mockHtml, title:'...', description:'...' });
        expect.fail('Promise should have rejected but resolved instead.');
    } catch (error) {
        expect(error).toBeInstanceOf(ParserError);
        expect((error as ParserError).code).toBe(ErrorCode.PARSER_AI_QUERY_FAILED);
        expect((error as ParserError).message).toContain('AI service failed during page classification');
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error in AI service call'), expect.objectContaining({ error: aiError }));
    }
  });

  it('should extract jobs and links from a job listing page', async () => {
    const mockHtml = '<html><body>Job listing page with links</body></html>';
    const expectedJobs = [ { title: 'Job1', organization: 'Org', description: 'Desc', url: 'url1', dateScraped: new Date() }];
    
    parser.parseJobsFromPage = vi.fn().mockResolvedValueOnce(expectedJobs);
    
    const result = await parser.parseJobListingPage({ url: 'https://example.com/listing', content: mockHtml, title:'Listing', description:'Desc' });
    
    expect(parser.parseJobsFromPage).toHaveBeenCalledOnce();
    expect(result.jobs).toEqual(expectedJobs);
    expect(result.links).toBeDefined();
    expect(result.links).toHaveLength(2);
    expect(result.links[0]).toMatchObject({ href: 'https://example.com/jobs/engineer', text: 'Engineer' });
    expect(result.links[1]).toMatchObject({ href: 'https://example.com/jobs/designer', text: 'Designer' });
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should handle errors in parseJobListingPage', async () => {
    const mockHtml = '<html><body>Error page content</body></html>';
    const parseError = new ParserError('Test parse error', ErrorCode.PARSER_JOB_EXTRACTION_FAILED);
    
    parser.parseJobsFromPage = vi.fn().mockRejectedValueOnce(parseError);

    await expect(parser.parseJobListingPage({ url: '...', content: mockHtml, title:'...', description:'...' })).rejects.toThrow(parseError);
    
    expect(mockLogger.error).toHaveBeenCalledWith('Error parsing job listing page:', expect.objectContaining({ error: parseError }));
  });

  it('should extract job data from a single job page', async () => {
    const mockHtml = '<html><body>Valid single job content</body></html>';
    const aiJsonResponse = JSON.stringify({
      title: 'Software Engineer', organization: 'Example Corp', /* ... other fields ... */
    });
    mockAIServiceImpl.generateText.mockResolvedValueOnce(aiJsonResponse);
    
    const result = await parser.parseSingleJobPage({ url: '...', content: mockHtml, title:'...', description:'...' });
    
    expect(mockAIServiceImpl.generateText).toHaveBeenCalledOnce();
    expect(result).not.toBeNull();
  });

  it('should return null for a single job page with missing required fields', async () => {
    const mockHtml = '<html><body>Content for missing fields test</body></html>';
    const aiJsonResponse = JSON.stringify({ title: '', location: 'Remote' });
    
    mockAIServiceImpl.generateText.mockResolvedValueOnce(aiJsonResponse);

    const result = await parser.parseSingleJobPage({ url: '...', content: mockHtml, title:'...', description:'...' });
    
    expect(mockAIServiceImpl.generateText).toHaveBeenCalledOnce();
    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Missing required fields'), expect.any(Object));
  });

  it('should prioritize links based on job relevance', async () => {
    const links: Array<{ href: string; text: string; title: string; aria: string }> = [
        { href: 'https://example.com/jobs/engineer', text: 'Software Engineer', title: 'View Job', aria: '' },
        { href: 'https://example.com/about', text: 'About Us', title: '', aria: '' },
        { href: 'https://example.com/careers', text: 'Careers', title: 'View all jobs', aria: '' }
    ];
    const aiJsonResponse = JSON.stringify([
      { url: 'https://example.com/jobs/engineer', score: 9.5, estimatedType: 'SINGLE_JOB', reasons: [] },
      { url: 'https://example.com/careers', score: 7.0, estimatedType: 'JOB_LISTING', reasons: [] },
      { url: 'https://example.com/about', score: 2.0, estimatedType: 'UNKNOWN', reasons: [] }
    ] as LinkPriority[]);
    
    mockAIServiceImpl.generateText.mockResolvedValueOnce(aiJsonResponse);
    
    const result = await parser.prioritizeLinks({ sourceUrl: 'https://example.com', pageTitle: 'Example Site', links });
    
    expect(mockAIServiceImpl.generateText).toHaveBeenCalledOnce();
    expect(result.prioritizedLinks).toHaveLength(3);
    expect(result.prioritizedLinks[0]).toBe('https://example.com/jobs/engineer');
    expect(result.scores['https://example.com/jobs/engineer']).toBe(9.5);
    expect(result.scores['https://example.com/careers']).toBe(7.0);
    expect(result.scores['https://example.com/about']).toBe(2.0);
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should return empty results when there are no links to prioritize', async () => {
    const result = await parser.prioritizeLinks({
      sourceUrl: 'https://example.com',
      pageTitle: 'Example Site',
      links: []
    });
    
    expect(mockAIServiceImpl.generateText).not.toHaveBeenCalled();
    expect(result.prioritizedLinks).toHaveLength(0);
    expect(Object.keys(result.scores)).toHaveLength(0);
  });

});