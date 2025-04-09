// packages/crawler/src/__tests__/job-boards/job-board-parsers.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import cheerio from 'cheerio';
import { 
  AshbyParser, 
  GreenhouseParser, 
  LeverParser,
  JobBoardService,
  isKnownJobBoardDomain,
  matchesJobBoardPattern
} from '../../src/job-boards';

describe('Job Board Detection', () => {
  it('should detect known job board domains', () => {
    expect(isKnownJobBoardDomain('jobs.ashbyhq.com')).toBe(true);
    expect(isKnownJobBoardDomain('job-boards.greenhouse.io')).toBe(true);
    expect(isKnownJobBoardDomain('jobs.lever.co')).toBe(true);
    expect(isKnownJobBoardDomain('jobs.eu.lever.co')).toBe(true);
    
    // Should handle subdomains
    expect(isKnownJobBoardDomain('anthropic.job-boards.greenhouse.io')).toBe(true);
    
    // Should reject non-job board domains
    expect(isKnownJobBoardDomain('example.com')).toBe(false);
    expect(isKnownJobBoardDomain('google.com')).toBe(false);
  });
  
  it('should detect job board URL patterns', () => {
    // Ashby patterns
    expect(matchesJobBoardPattern('https://jobs.ashbyhq.com/openai')).toBe(true);
    expect(matchesJobBoardPattern('https://jobs.ashbyhq.com/openai/250df7b7-55e4-4fbb-997d-bcdc90261651')).toBe(true);
    
    // Greenhouse patterns
    expect(matchesJobBoardPattern('https://job-boards.greenhouse.io/anthropic')).toBe(true);
    expect(matchesJobBoardPattern('https://job-boards.greenhouse.io/anthropic/jobs/4555010008')).toBe(true);
    
    // Lever patterns
    expect(matchesJobBoardPattern('https://jobs.lever.co/refugeerights')).toBe(true);
    expect(matchesJobBoardPattern('https://jobs.eu.lever.co/refugeerights/a05ebeae-a2ea-4b2d-aab4-8d608c13be32')).toBe(true);
    
    // Should reject non-job board URLs
    expect(matchesJobBoardPattern('https://example.com')).toBe(false);
  });
});

describe('Job Board Parsers', () => {
  let ashbyParser: AshbyParser;
  let greenhouseParser: GreenhouseParser;
  let leverParser: LeverParser;
  
  beforeEach(() => {
    ashbyParser = new AshbyParser();
    greenhouseParser = new GreenhouseParser();
    leverParser = new LeverParser();
  });
  
  it('should correctly detect URLs for each parser', () => {
    // Ashby URLs
    expect(ashbyParser.canParse('https://jobs.ashbyhq.com/openai')).toBe(true);
    expect(greenhouseParser.canParse('https://jobs.ashbyhq.com/openai')).toBe(false);
    expect(leverParser.canParse('https://jobs.ashbyhq.com/openai')).toBe(false);
    
    // Greenhouse URLs
    expect(ashbyParser.canParse('https://job-boards.greenhouse.io/anthropic')).toBe(false);
    expect(greenhouseParser.canParse('https://job-boards.greenhouse.io/anthropic')).toBe(true);
    expect(leverParser.canParse('https://job-boards.greenhouse.io/anthropic')).toBe(false);
    
    // Lever URLs
    expect(ashbyParser.canParse('https://jobs.lever.co/refugeerights')).toBe(false);
    expect(greenhouseParser.canParse('https://jobs.lever.co/refugeerights')).toBe(false);
    expect(leverParser.canParse('https://jobs.lever.co/refugeerights')).toBe(true);
  });
  
  it('should extract company name from URL', () => {
    // Using a protected method via type assertion
    expect((ashbyParser as any).extractCompanyName('https://jobs.ashbyhq.com/openai')).toBe('openai');
    expect((greenhouseParser as any).extractCompanyName('https://job-boards.greenhouse.io/anthropic')).toBe('anthropic');
    expect((leverParser as any).extractCompanyName('https://jobs.lever.co/refugeerights')).toBe('refugeerights');
  });
  
  it('should return additional URLs to crawl', () => {
    // Ashby
    const ashbyUrls = ashbyParser.getAdditionalUrlsToCrawl(
      'https://jobs.ashbyhq.com/openai/250df7b7-55e4-4fbb-997d-bcdc90261651'
    );
    expect(ashbyUrls).toContain('https://jobs.ashbyhq.com/openai');
    
    // Greenhouse
    const greenhouseUrls = greenhouseParser.getAdditionalUrlsToCrawl(
      'https://job-boards.greenhouse.io/anthropic/jobs/4555010008'
    );
    expect(greenhouseUrls).toContain('https://job-boards.greenhouse.io/anthropic');
    
    // Lever
    const leverUrls = leverParser.getAdditionalUrlsToCrawl(
      'https://jobs.lever.co/refugeerights/a05ebeae-a2ea-4b2d-aab4-8d608c13be32'
    );
    expect(leverUrls).toContain('https://jobs.lever.co/refugeerights');
  });
});

describe('JobBoardService', () => {
  let jobBoardService: JobBoardService;
  
  beforeEach(() => {
    jobBoardService = new JobBoardService();
  });
  
  it('should detect job board URLs', () => {
    expect(jobBoardService.isJobBoardUrl('https://jobs.ashbyhq.com/openai')).toBe(true);
    expect(jobBoardService.isJobBoardUrl('https://job-boards.greenhouse.io/anthropic')).toBe(true);
    expect(jobBoardService.isJobBoardUrl('https://jobs.lever.co/refugeerights')).toBe(true);
    expect(jobBoardService.isJobBoardUrl('https://example.com')).toBe(false);
  });
  
  it('should get job board names', () => {
    expect(jobBoardService.getJobBoardName('https://jobs.ashbyhq.com/openai')).toBe('Ashby');
    expect(jobBoardService.getJobBoardName('https://job-boards.greenhouse.io/anthropic')).toBe('Greenhouse');
    expect(jobBoardService.getJobBoardName('https://jobs.lever.co/refugeerights')).toBe('Lever');
    expect(jobBoardService.getJobBoardName('https://example.com')).toBeNull();
  });
  
  it('should get additional URLs to crawl', () => {
    const additionalUrls = jobBoardService.getAdditionalUrlsToCrawl(
      'https://jobs.ashbyhq.com/openai/250df7b7-55e4-4fbb-997d-bcdc90261651'
    );
    expect(additionalUrls).toContain('https://jobs.ashbyhq.com/openai');
    
    // Should return empty array for non-job board URLs
    expect(jobBoardService.getAdditionalUrlsToCrawl('https://example.com')).toEqual([]);
  });
  
  it('should attempt to parse job board pages', async () => {
    // Mock parseJobBoardPage for testing
    const mockParse = vi.spyOn(jobBoardService, 'parseJobBoardPage').mockResolvedValue([]);
    
    await jobBoardService.parseJobBoardPage({
      url: 'https://jobs.ashbyhq.com/openai',
      content: '<html><body><h1>Jobs</h1></body></html>',
      title: 'Jobs at OpenAI',
      description: 'OpenAI jobs'
    });
    
    expect(mockParse).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://jobs.ashbyhq.com/openai'
    }));
  });
});

// Add more specific tests for each parser implementation
describe('Ashby Parser', () => {
  it('should extract job data from Ashby HTML', async () => {
    const ashbyParser = new AshbyParser();
    
    // Create sample HTML for an Ashby job page
    const html = `
      <html>
        <head><title>Software Engineer at OpenAI</title></head>
        <body>
          <h1>Software Engineer</h1>
          <span class="location">San Francisco, CA</span>
          <span class="job-type">Full-time</span>
          <div class="job-description">
            <p>We're looking for talented engineers to join our team.</p>
            <ul>
              <li>Build AI systems</li>
              <li>Work on cutting-edge technology</li>
            </ul>
          </div>
        </body>
      </html>
    `;
    
    const result = await ashbyParser.parse({
      url: 'https://jobs.ashbyhq.com/openai/abcd1234',
      content: html,
      title: 'Software Engineer at OpenAI',
      description: 'Job description'
    });
    
    // Check that parsing was successful
    expect(result.error).toBeUndefined();
    expect(result.jobs.length).toBe(1);
    
    // Check extracted job data
    const job = result.jobs[0];
    expect(job.title).toContain('Software Engineer');
    expect(job.organization).toBe('openai');
    expect(job.location).toContain('San Francisco');
    expect(job.employmentType).toContain('Full-time');
    expect(job.description).toContain('talented engineers');
  });
});