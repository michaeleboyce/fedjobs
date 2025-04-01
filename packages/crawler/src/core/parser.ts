// File path: packages/crawler/src/core/parser.ts
import { load } from 'cheerio';
import { AnalyzeLinksInput, JobPostingData, ParsePageInput } from '../types';
import { AIService, ParsedJobPosting, extractMultipleJobPostings } from '@fedjobs/utils';

export class JobParserService {
  private aiService: AIService;
  
  constructor() {
    this.aiService = new AIService();
  }
  
  /**
   * Get the underlying AI service
   * This is useful for direct AI operations
   */
  getAIService(): AIService {
    return this.aiService;
  }
  
  /**
   * Analyzes a batch of links to determine which ones are likely job listings
   * Returns an array of URLs that should be prioritized for crawling
   */
  async analyzeLinks(input: AnalyzeLinksInput): Promise<string[]> {
    try {
      const { sourceUrl, pageTitle, links } = input;
      
      // Skip if no links
      if (!links || links.length === 0) {
        return [];
      }
      
      // Format links for AI analysis
      const linksFormatted = links.map((link, index) => {
        return `${index + 1}. URL: ${link.href}
   Text: ${link.text}
   Title: ${link.title || 'N/A'}
   Aria: ${link.aria || 'N/A'}`;
      }).join('\n\n');
      
      // Extract domain for context
      let domain = '';
      try {
        domain = new URL(sourceUrl).hostname.replace('www.', '');
      } catch (e) {
        domain = sourceUrl.split('/')[2] || '';
      }
      
      // Define schema for structured output
      const linkAnalysisSchema = {
        jobLinks: {
          type: 'array',
          items: { 
            type: 'string',
            description: 'URL of a direct job posting page'
          },
          description: 'Array of URLs that lead directly to specific job postings'
        }
      };
      
      // Prepare prompt for AI - make it simpler and more direct
      const prompt = `
        Analyze these links from "${pageTitle}" on ${domain}.
        
        Identify which URLs point to specific job listing pages, not career overview pages.
        
        LINKS:
        ${linksFormatted}
        
        Evaluate each link:
        1. Does the URL or text contain job titles or IDs?
        2. Is it likely a direct job posting rather than a category page?

        Return ONLY the complete URLs for links that lead directly to specific job postings.
      `;
      
      // Try multiple models and approaches if the first one fails
      let jobLinks: string[] = [];
      try {
        // Try with Claude model first (seems to handle URL analysis better)
        console.log(`[JobParser] Analyzing ${links.length} links using structured output (Claude)`);
        const result = await this.aiService.generateStructuredOutput<{jobLinks: string[]}>({
          prompt,
          model: "claude-3-7-sonnet-20250219",
          schema: linkAnalysisSchema,
          temperature: 0.1,
          maxTokens: 2000,
          toolName: 'analyze_job_links',
          toolDescription: 'Identify links that point to direct job posting pages'
        });
        
        jobLinks = result.data.jobLinks || [];
      } catch (error) {
        console.log(`[JobParser] Claude model failed for link analysis, trying GPT-4o: ${error}`);
        
        try {
          // Try with GPT-4o as fallback
          const result = await this.aiService.generateStructuredOutput<{jobLinks: string[]}>({
            prompt,
            model: "gpt-4o",
            schema: linkAnalysisSchema,
            temperature: 0.1,
            maxTokens: 2000,
            toolName: 'analyze_job_links',
            toolDescription: 'Identify links that point to direct job posting pages'
          });
          
          jobLinks = result.data.jobLinks || [];
        } catch (gptError) {
          console.log(`[JobParser] GPT-4o also failed for link analysis: ${gptError}`);
          
          // Fallback to simple regex-based heuristic analysis
          console.log(`[JobParser] Using fallback heuristic analysis for link detection`);
          jobLinks = this.heuristicLinkAnalysis(links);
        }
      }
      
      // Validate each URL
      const validUrls = jobLinks.filter(url => 
        typeof url === 'string' && 
        (url.startsWith('http://') || url.startsWith('https://'))
      );
      
      console.log(`[JobParser] Found ${validUrls.length} valid job posting links`);
      return validUrls;
    } catch (error) {
      console.error('[JobParser] Error in analyzeLinks:', error);
      return [];
    }
  }
  
  /**
   * Fallback method for link analysis using regex patterns
   * Used when AI service fails
   */
  private heuristicLinkAnalysis(links: Array<{href: string; text: string; title: string; aria: string}>): string[] {
    // Common job posting URL patterns
    const jobUrlPatterns = [
      /\/jobs?\/[^\/]+$/i,
      /\/careers?\/[^\/]+$/i,
      /\/positions?\/[^\/]+$/i,
      /\/vacancies?\/[^\/]+$/i,
      /\/openings?\/[^\/]+$/i,
      /\/apply\/[^\/]+$/i,
      /jobs?id=/i,
      /positionid=/i,
      /jobdetails?/i,
      /job-id=/i,
      /jobcode=/i,
      /posting=/i,
      /opportunity/i,
      /requisition/i,
    ];
    
    // Common job title patterns in link text
    const jobTitlePatterns = [
      /engineer/i,
      /developer/i,
      /designer/i,
      /manager/i,
      /director/i,
      /specialist/i,
      /analyst/i,
      /assistant/i,
      /associate/i,
      /coordinator/i,
      /consultant/i,
      /lead/i,
      /head of/i,
      /architect/i,
      /scientist/i,
      /researcher/i,
      /executive/i,
      /ops/i,
      /operations/i,
      /administrator/i,
      /officer/i,
      /technician/i,
    ];
    
    // Common job action words
    const jobActionPatterns = [
      /apply/i,
      /view job/i,
      /see details/i,
      /more info/i,
      /learn more/i,
      /job details/i,
      /view details/i,
    ];
    
    // Filter links based on patterns
    return links
      .filter(link => {
        // Check URL patterns
        const urlMatch = jobUrlPatterns.some(pattern => pattern.test(link.href));
        
        // Check text patterns if URL doesn't match
        const textMatch = 
          jobTitlePatterns.some(pattern => 
            (link.text && pattern.test(link.text)) || 
            (link.title && pattern.test(link.title))
          );
        
        // Check for action words in link text
        const actionMatch =
          jobActionPatterns.some(pattern => 
            (link.text && pattern.test(link.text)) || 
            (link.title && pattern.test(link.title)) ||
            (link.aria && pattern.test(link.aria))
          );
        
        return urlMatch || textMatch || actionMatch;
      })
      .map(link => link.href);
  }
  
  /**
   * Clean HTML content to extract meaningful text
   */
  private cleanHtml(html: string): string {
    try {
      // Load HTML into cheerio
      const $ = load(html);
      
      // Log the page structure for debugging
      console.log(`[JobParser] Page structure analysis:`);
      console.log(`  - Document title: ${$('title').text()}`);
      console.log(`  - Meta description: ${$('meta[name="description"]').attr('content') || 'none'}`);
      console.log(`  - Has main content areas: main=${$('main').length}, article=${$('article').length}, #content=${$('#content').length}`);
      
      // Remove scripts, styles, and other non-content elements
      $('script, style, svg, img, iframe, noscript, head, link, meta').remove();
      
      // Remove CSS classes and inline styles that might affect extraction
      $('*').removeAttr('class').removeAttr('style');
      
      // Extract main content selectors that typically contain the actual page content
      const mainContentSelectors = ['main', 'article', '#content', '#main', '.content', '.main-content'];
      
      let mainContent = '';
      let mainSelector = '';
      
      // Try to find main content using common selectors
      for (const selector of mainContentSelectors) {
        if ($(selector).length) {
          const text = $(selector).text().trim();
          if (text.length > mainContent.length) {
            mainContent = text;
            mainSelector = selector;
          }
        }
      }
      
      // If none of the selectors found substantial content, fall back to body
      if (mainContent.length < 100) {
        console.log('[JobParser] No main content found from standard selectors, falling back to body text');
        mainContent = $('body').text();
        mainSelector = 'body';
      }
      
      // Clean up whitespace
      const cleaned = mainContent.replace(/\s+/g, ' ').trim();
      
      console.log(`[JobParser] Content extraction info: used selector "${mainSelector}", extracted ${cleaned.length} chars`);
      
      // Check if we have actual content
      if (cleaned.length < 50) {
        console.log('[JobParser] Warning: cleanHtml produced very little content, falling back to partial HTML');
        console.log('[JobParser] Original HTML preview (first 300 chars):');
        console.log(html.substring(0, 300).replace(/\n/g, ' ') + '...');
        
        // As a fallback, get visible text from paragraphs, lists, headings, etc.
        const visibleElements = $('h1, h2, h3, h4, h5, h6, p, li, div > *:not(script):not(style)').map((index, element) => {
          return $(element).text().trim();
        }).get().join(' ');
        
        const fallbackCleaned = visibleElements.replace(/\s+/g, ' ').trim();
        console.log(`[JobParser] Fallback extraction yielded ${fallbackCleaned.length} chars`);
        
        return fallbackCleaned;
      }
      
      return cleaned;
    } catch (error) {
      console.error('[JobParser] Error in cleanHtml:', error);
      
      // If Cheerio fails, try a simple regex approach to extract text
      const strippedHtml = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      console.log('[JobParser] Falling back to regex-based HTML cleaning');
      return strippedHtml;
    }
  }
  
  /**
   * Parse job listings from a webpage
   * @param input Page data to parse
   * @returns Array of job postings found on the page
   */
  async parseJobsFromPage(input: ParsePageInput): Promise<JobPostingData[]> {
    try { 
      const { url, content, title, description, keywords } = input;
      
      // Clean HTML to get text content
      const cleanedContent = this.cleanHtml(content);
      
      console.log(`[JobParser] Parsing page: ${url}`);
      console.log(`[JobParser] Page title: ${title}`);
      console.log(`[JobParser] Content length: ${cleanedContent.length}`);
      console.log(`[JobParser] Content preview: "${cleanedContent.substring(0, 200)}..."`);
      
      // Log first 100 characters of raw HTML for debugging 
      console.log(`[JobParser] Raw HTML preview: "${content.substring(0, 100).replace(/\n/g, ' ')}..."`);
      
      // Check for job indicators in content
      const jobContentIndicators = [
        'apply', 'application', 'applicant', 'experience', 'skills', 'qualification', 
        'responsibilities', 'requirements', 'job description', 'position', 'employment'
      ];
      
      const foundIndicators = jobContentIndicators.filter(indicator => 
        cleanedContent.toLowerCase().includes(indicator.toLowerCase())
      );
      
      console.log(`[JobParser] Job indicators found: ${foundIndicators.join(', ') || 'none'}`);
      
      
      // If content is too short, likely not a job page
      if (cleanedContent.length < 100) {
        console.log(`[JobParser] Content too short, skipping parsing`);
        return [];
      }
      
      // Check if this looks like a job page
      const jobIndicators = [
        /job/i, /career/i, /position/i, /employment/i, /work/i, /hiring/i,
        /apply/i, /application/i, /vacancy/i, /opening/i, /opportunity/i
      ];
      
      const isLikelyJobPage = 
        jobIndicators.some(pattern => pattern.test(title)) || 
        jobIndicators.some(pattern => pattern.test(url));
      
      // Extract domain for context
      let domain = '';
      try {
        domain = new URL(url).hostname.replace('www.', '');
      } catch (e) {
        domain = url.split('/')[2] || '';
      }
      
      console.log(`[JobParser] Using structured output parser for ${url}`);
      
      // Convert keywords string to array if provided
      const keywordsArray = keywords ? keywords.split(',').map(k => k.trim()) : [];
      
      // Try multiple models if first one fails
      let parsedJobs: ParsedJobPosting[] = [];
      let parseError = null;
      
      // Try with GPT-4o first (best quality)
      try {
        parsedJobs = await extractMultipleJobPostings(cleanedContent, {
          url,
          model: "gpt-4o",
          temperature: 0.2,
          keywords: keywordsArray
        });
      } catch (error) {
        console.log(`[JobParser] Error with GPT-4o model, trying Claude model: ${error}`);
        parseError = error;
        
        // If that fails, try with Claude model
        try {
          parsedJobs = await extractMultipleJobPostings(cleanedContent, {
            url,
            model: "claude-3-7-sonnet-20250219",
            temperature: 0.2, 
            keywords: keywordsArray
          });
          parseError = null;
        } catch (claudeError) {
          console.log(`[JobParser] Error with Claude model too: ${claudeError}`);
          
          // If both models fail, try with traditional method as fallback
          try {
            // This is a minimal fallback approach based on content analysis
            // Extract at least a job title and description from page
            const jobTitle = title.replace(/\s*[|]\s*.+$/, '').trim();
            
            if (isLikelyJobPage) {
              console.log(`[JobParser] Using fallback extraction method for ${url}`);
              
              // Create a minimal job object for the page
              parsedJobs = [{
                title: jobTitle,
                organization: domain,
                description: cleanedContent.slice(0, 2000), // Take first 2000 chars as description
                url: url,
                // Add other required fields with default values
                type: 'FULL_TIME',
                skills: []
              }];
              
              parseError = null;
            }
          } catch (fallbackError) {
            console.error(`[JobParser] Fallback extraction also failed: ${fallbackError}`);
            // If even the fallback fails, re-throw the original error
            throw parseError;
          }
        }
      }
      
      console.log(`[JobParser] Extracted ${parsedJobs.length} jobs using structured output parser`);
      
      // Convert ParsedJobPosting to JobPostingData format
      return parsedJobs.map(job => {
        // For job URL handling
        let jobUrl = job.url;
        
        if (!jobUrl || jobUrl === '' || jobUrl === url) {
          // No specific URL was provided, use the current page URL
          jobUrl = url;
        } else if (!/^https?:\/\//i.test(jobUrl)) {
          // The URL is relative, make it absolute
          try {
            const baseUrl = new URL(url);
            if (jobUrl.startsWith('/')) {
              // Absolute path
              jobUrl = `${baseUrl.protocol}//${baseUrl.host}${jobUrl}`;
            } else {
              // Relative path
              const pathParts = baseUrl.pathname.split('/');
              pathParts.pop(); // Remove last segment
              const basePath = pathParts.join('/');
              jobUrl = `${baseUrl.protocol}//${baseUrl.host}${basePath}/${jobUrl}`;
            }
          } catch (e) {
            // If URL parsing fails, fall back to the source URL
            jobUrl = url;
          }
        }
        
        // Ensure all required fields are present
        return {
          title: job.title || 'Untitled Position',
          organization: job.organization || domain,
          location: job.location || undefined,
          description: job.description || cleanedContent.slice(0, 500),
          salary: job.salary || undefined,
          requirements: job.requirements || undefined,
          url: jobUrl,
          employmentType: job.type || 'FULL_TIME',
          experience: job.experience || undefined,
          benefits: job.benefits || undefined,
          organizationType: job.organizationType || undefined,
          skills: job.skills || [],
          dateScraped: new Date(),
          datePosted: job.postedDate ? new Date(job.postedDate) : undefined,
          structuredData: job.structuredData || {}
        };
      });
    } catch (error) {
      console.error('[JobParser] Error in parseJobsFromPage:', error);
      return [];
    }
  }
  
  /**
   * Enrich job data with additional structured information
   * @param job Basic job data
   * @returns Enriched job data
   */
  async enrichJobData(job: JobPostingData): Promise<JobPostingData> {
    try {
      // Define schema for job enrichment
      const enrichmentSchema = {
        skills: { 
          type: 'array',
          items: { type: 'string' },
          description: 'Key skills required for this job'
        },
        experienceLevel: { 
          type: 'string',
          description: 'Experience level (Junior, Mid-level, Senior, or Executive)'
        },
        benefits: { 
          type: 'string',
          description: 'Benefits offered with the position'
        },
        organizationType: { 
          type: 'string',
          enum: ['GOVERNMENT', 'NONPROFIT', 'PRIVATE', 'PUBLIC', 'ACADEMIC', 'STARTUP', 'OTHER'],
          description: 'Type of organization'
        },
        keyResponsibilities: { 
          type: 'array',
          items: { type: 'string' },
          description: 'Main job responsibilities'
        }
      };

      // Prepare prompt for the AI
      const prompt = `
        Analyze this job posting and extract additional structured information:
        
        Job Title: ${job.title}
        Organization: ${job.organization}
        Location: ${job.location || 'Not specified'}
        Description: ${job.description}
        
        Extract key information about this job posting.
      `;
      
      // Call AI service to enrich job data with structured output
      const result = await this.aiService.generateStructuredOutput({
        prompt,
        model: "gpt-4o",
        schema: enrichmentSchema,
        temperature: 0.2,
        maxTokens: 1000,
        toolName: 'enrich_job_data',
        toolDescription: 'Extract additional structured information from a job posting'
      });
      
      const enrichment = result.data;
      console.log(`[JobParser] Successfully enriched job data for "${job.title}" using structured output`);
      
      return {
        ...job,
        skills: enrichment.skills || job.skills || [],
        experience: enrichment.experienceLevel || job.experience,
        benefits: enrichment.benefits || job.benefits,
        organizationType: enrichment.organizationType || job.organizationType,
        structuredData: {
          ...(job.structuredData || {}),
          keyResponsibilities: enrichment.keyResponsibilities || []
        }
      };
    } catch (error: any) {
      console.error('[JobParser] Error in enrichJobData:', error);
      // Return the original job data if enrichment fails
      return job;
    }
  }
}