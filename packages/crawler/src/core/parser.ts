// src/core/parser.ts
import { load } from 'cheerio';
import { AnalyzeLinksInput, JobPostingData, ParsePageInput, PageClassificationResult, PageType } from '../types';
import { IParser } from '../interfaces/IParser';
import { ILogger } from '../interfaces/ILogger';
import { AIService } from '@fedjobs/utils';
import { ParserError, ErrorCode } from '../utils/errors';

/**
 * JobParserService implements the IParser interface.
 * This service is responsible for:
 * 1. Analyzing links to identify potential job postings
 * 2. Parsing web pages to extract job information
 * 3. Enriching job data with additional structured information
 * 
 * It leverages AI capabilities (via the AIService) for intelligent content analysis
 * and uses Cheerio for HTML parsing and manipulation.
 */
export class JobParserService implements IParser {
  // AIService provides access to language model capabilities for intelligent parsing
  private aiService: AIService;
  // Logger for recording operation details and errors
  private logger: ILogger;
  
  /**
   * Creates a new JobParserService instance.
   * @param aiService The AI service that will be used for content analysis and extraction
   * @param logger Logger implementation for recording operations and errors
   */
  constructor(aiService: AIService, logger: ILogger) {
    this.aiService = aiService;
    this.logger = logger;
  }
  
  /**
   * Get the underlying AI service.
   * This is useful for direct AI operations outside the standard parser methods.
   * @returns The AIService instance used by this parser
   */
  getAIService(): AIService {
    return this.aiService;
  }
  
  /**
   * Analyzes a batch of links to determine which ones are likely job listings.
   * Uses AI to evaluate links based on URL patterns, link text, titles, and other attributes.
   * 
   * @param input Object containing the source URL, page title, and links to analyze
   * @returns Promise resolving to an array of URLs that likely point to job postings
   * @throws ParserError if analysis fails
   */
  async analyzeLinks(input: AnalyzeLinksInput): Promise<string[]> {
    try {
      const { sourceUrl, pageTitle, links } = input;
      
      // Early exit if there are no links to analyze
      if (!links || links.length === 0) {
        return [];
      }
      
      // Format links into a structured text format for AI analysis
      // Each link is numbered and includes its href, text content, title, and aria attributes
      const linksFormatted = links.map((link, index) => {
        return `${index + 1}. URL: ${link.href}
   Text: ${link.text}
   Title: ${link.title || 'N/A'}
   Aria: ${link.aria || 'N/A'}`;
      }).join('\n\n');
      
      // Extract domain from the source URL to provide context to the AI
      let domain = '';
      try {
        domain = new URL(sourceUrl).hostname.replace('www.', '');
      } catch (e) {
        // Fallback if URL parsing fails
        domain = sourceUrl.split('/')[2] || '';
      }
      
      // Prepare a detailed prompt for the AI to analyze the links
      // The prompt instructs the AI to identify links that point to specific job postings
      // rather than general career pages or category listings
      const prompt = `
        You are a job posting identification expert. Analyze the following list of links from the page "${pageTitle}" on ${domain} (${sourceUrl}).
        
        Your task is to identify which links point to actual job listings or job description pages, not general career pages, job category pages, or non-job content.
        
        LINKS TO ANALYZE:
        ${linksFormatted}
        
        For each link, consider:
        1. Does the URL path contain job-specific keywords or patterns (like job IDs, position titles, etc.)?
        2. Does the link text describe a specific job position (e.g., "Senior Software Engineer" rather than "View All Jobs")?
        3. Is this likely a direct link to a specific job posting, not a category/filter/search page? WE DO NOT WANT CATEGORY/FILTER/SEARCH pages.

        Return ONLY the URL values for links that you are confident lead directly to specific job postings. 
        Return your answer as a JSON array of strings containing only the full URLs. Example format: ["https://example.com/jobs/12345", "https://example.com/careers/senior-developer"]
        
        If none of the links appear to be direct job postings, return an empty array: []
      `;
      
      // Call the AI service to analyze the links
      try {
        const response = await this.aiService.generateText({
          prompt,
          model: "gpt-4o", // Using GPT-4o for better analysis capabilities
          temperature: 0.1, // Low temperature for more deterministic/consistent results
          maxTokens: 2000   // Allow for a reasonably long response
        });
        
        // Parse the AI's response, which should be a JSON array of URLs
        try {
          // Find a JSON array in the response using regex
          // This handles cases where the AI might include explanatory text before/after the JSON
          const match = response.match(/\[.*?\]/s);
          if (match) {
            const jsonResponse = JSON.parse(match[0]);
            
            // Validate that each URL is a string and starts with http:// or https://
            const validUrls = jsonResponse.filter((url: any) => 
              typeof url === 'string' && 
              (url.startsWith('http://') || url.startsWith('https://'))
            );
            
            return validUrls;
          }
          return [];
        } catch (err) {
          // Handle JSON parsing errors
          this.logger.error('Error parsing AI response for link analysis:', { error: err });
          throw new ParserError(
            'Failed to parse AI response for link analysis',
            ErrorCode.PARSER_LINK_ANALYSIS_FAILED,
            err instanceof Error ? err : undefined,
            { response } // Include the raw response for debugging
          );
        }
      } catch (error) {
        // Handle errors from the AI service call
        this.logger.error('Error in AI service call:', { error });
        throw new ParserError(
          'AI service failed during link analysis',
          ErrorCode.PARSER_AI_QUERY_FAILED,
          error instanceof Error ? error : undefined,
          { prompt } // Include the prompt for debugging
        );
      }
    } catch (error) {
      // If the error is already a ParserError, just rethrow it
      if (error instanceof ParserError) {
        throw error;
      }
      
      // Otherwise, wrap the error in a ParserError
      this.logger.error('Error in analyzeLinks:', { error });
      throw new ParserError(
        'Failed to analyze links',
        ErrorCode.PARSER_LINK_ANALYSIS_FAILED,
        error instanceof Error ? error : undefined,
        { sourceUrl: input.sourceUrl }
      );
    }
  }
  
  /**
   * Cleans HTML content to extract meaningful text.
   * Removes scripts, styles, and other non-content elements.
   * Attempts to identify and extract the main content area of the page.
   * 
   * @param html Raw HTML content to clean
   * @returns Cleaned text content suitable for analysis
   * @throws ParserError if cleaning fails
   */
  private cleanHtml(html: string): string {
    try {
      // Load the HTML into Cheerio (a jQuery-like library for server-side HTML parsing)
      const $ = load(html);
      
      // Remove elements that typically don't contain useful content
      // This improves the signal-to-noise ratio for the AI parser
      $('script, style, svg, img, iframe, noscript, head, link, meta').remove();
      
      // Remove CSS classes and inline styles which might affect text extraction
      $('*').removeAttr('class').removeAttr('style');
      
      // Define selectors that commonly contain the main content on websites
      // These are tried in order to find the most content-rich element
      const mainContentSelectors = ['main', 'article', '#content', '#main', '.content', '.main-content'];
      
      let mainContent = '';
      
      // Try each selector to find the one with the most content
      for (const selector of mainContentSelectors) {
        if ($(selector).length) {
          const text = $(selector).text().trim();
          // Keep the longest content found so far
          if (text.length > mainContent.length) {
            mainContent = text;
          }
        }
      }
      
      // If none of the main content selectors found substantial content,
      // fall back to using the entire body content
      if (mainContent.length < 100) {
        mainContent = $('body').text();
      }
      
      // Clean up excessive whitespace (multiple spaces, newlines, etc.)
      const cleaned = mainContent.replace(/\s+/g, ' ').trim();
      
      // If even the cleaned content is very short, try an alternative approach
      if (cleaned.length < 50) {
        this.logger.warn('cleanHtml produced very little content, falling back to partial HTML');
        
        // As a fallback, extract text specifically from elements likely to contain
        // valuable content (headings, paragraphs, list items, etc.)
        const visibleElements = $('h1, h2, h3, h4, h5, h6, p, li, div > *:not(script):not(style)').map((index, element) => {
          return $(element).text().trim();
        }).get().join(' ');
        
        return visibleElements.replace(/\s+/g, ' ').trim();
      }
      
      return cleaned;
    } catch (error) {
      // Log the error with Cheerio parsing
      this.logger.error('Error in cleanHtml:', { error });
      
      // If Cheerio fails, use a simple regex-based approach as a last resort
      try {
        // This regex approach:
        // 1. Removes script tags and their contents
        // 2. Removes style tags and their contents
        // 3. Removes all HTML tags
        // 4. Normalizes whitespace
        const strippedHtml = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        this.logger.info('Falling back to regex-based HTML cleaning');
        return strippedHtml;
      } catch (fallbackError) {
        // If even the regex approach fails, throw a ParserError
        throw new ParserError(
          'Failed to clean HTML content',
          ErrorCode.PARSER_CONTENT_EXTRACTION_FAILED,
          error instanceof Error ? error : undefined
        );
      }
    }
  }
  
  /**
   * Parse job listings from a webpage.
   * Uses AI to extract structured job information from page content.
   * 
   * @param input Object containing the URL, HTML content, title, description, and optional keywords
   * @returns Promise resolving to an array of JobPostingData objects
   * @throws ParserError if parsing fails
   */
  async parseJobsFromPage(input: ParsePageInput): Promise<JobPostingData[]> {
    try { 
      const { url, content, title, description, keywords } = input;
      
      // Clean the HTML to get useful text content for AI analysis
      const cleanedContent = this.cleanHtml(content);
      
      this.logger.info(`Parsing page: ${url}`);
      this.logger.debug(`Page title: ${title}`);
      this.logger.debug(`Content length: ${cleanedContent.length}`);
      
      // Skip pages with very little content - they're unlikely to contain useful job info
      if (cleanedContent.length < 100) {
        this.logger.info(`Content too short, skipping parsing`);
        return [];
      }
      
      // Define common keywords/patterns that indicate a page is job-related
      const jobIndicators = [
        /job/i, /career/i, /position/i, /employment/i, /work/i, /hiring/i,
        /apply/i, /application/i, /vacancy/i, /opening/i, /opportunity/i
      ];
      
      // Check if the page title or URL contains job-related terms
      // This helps the AI understand if this is likely a job page
      const isLikelyJobPage = 
        jobIndicators.some(pattern => pattern.test(title)) || 
        jobIndicators.some(pattern => pattern.test(url));
      
      // Extract the domain from the URL for context
      let domain = '';
      try {
        domain = new URL(url).hostname.replace('www.', '');
      } catch (e) {
        domain = url.split('/')[2] || '';
      }
      
      // Try to extract potential job-related links from the page
      // These could be used by the AI to find specific job URLs
      let jobLinks = '';
      try {
        // Load the HTML with Cheerio again for link extraction
        const $ = load(content);
        // Find links that might be related to job postings based on their href or text
        const links = $('a')
          .map(function(this: any) {
            const href = $(this).attr('href');
            const text = $(this).text().trim();
            if (href && text && (
              /job|career|position|vacancy|apply|posting/i.test(href) || 
              /job|career|position|vacancy|apply|posting/i.test(text)
            )) {
              return `- "${text}": ${href}`;
            }
            return null;
          })
          .get()
          .filter(Boolean)
          .slice(0, 20) // Limit to 20 most relevant links to avoid overwhelming the AI
          .join('\n');
        
        // If job-related links were found, include them in the prompt
        if (links.length > 0) {
          jobLinks = `\nPotential job-related links found on the page:\n${links}\n\nUse these links when possible as the 'url' field for each job.`;
        }
      } catch (e) {
        this.logger.warn('Error extracting links:', { error: e });
      }
      
      // Prepare a detailed prompt for the AI to extract job information
      // The prompt includes context about the page and instructions for extraction
      let prompt = `
        Extract job listings from the following webpage content. The page is from ${url} with title "${title}" on the domain "${domain}".
        
        ${isLikelyJobPage ? 'This appears to be a job-related page based on its URL or title.' : ''}
        ${jobLinks}
        
        For each job posting you can identify, extract the following information in a structured format:
        - title: The job title
        - organization: The company or organization name (if not explicitly stated, use "${domain}" as a fallback)
        - location: The job location (if available)
        - description: A brief description of the job
        - salary: Salary information (if available)
        - requirements: Job requirements (if available)
        - url: The direct URL to the specific job posting (very important - if a specific job link exists, use that exact URL; if you can't find a specific URL, use the current page URL "${url}")
        - employmentType: The type of employment (use one of these values: FULL_TIME, PART_TIME, CONTRACT, TEMPORARY, INTERNSHIP, REMOTE, HYBRID, or OTHER)
        
        If this appears to be a single job posting page (not a list of jobs), extract the information for that single job.
        
        If this page contains multiple job listings, extract information for each distinct job.
        
        Return the data as a JSON array of job objects. If no job listings are found, return an empty array.
        
        Webpage Content:
        ${cleanedContent.slice(0, 12000)} // Limit content to 12,000 chars to fit within token limits
      `;
      
      // If keywords were provided, instruct the AI to focus on relevant jobs
      if (keywords) {
        prompt += `\n\nFocus on jobs related to these keywords: ${keywords}`;
      }
      
      // Call the AI service to extract job data
      try {
        const response = await this.aiService.generateText({
          prompt,
          model: "gpt-4o", // Using GPT-4o for better extraction capabilities
          temperature: 0.2, // Slightly higher temperature than link analysis but still focused
          maxTokens: 4000   // Allow for longer responses since job data can be extensive
        });
        
        // Parse the AI's response, which should be a JSON array of job objects
        try {
          // First try to find the JSON array in the response
          // This handles cases where the AI might include explanatory text
          const jsonStart = response.indexOf('[');
          const jsonEnd = response.lastIndexOf(']');
          let jsonResponse = response;
          
          if (jsonStart > -1 && jsonEnd > -1) {
            jsonResponse = response.substring(jsonStart, jsonEnd + 1);
          }
          
          // Attempt to parse the JSON
          let responseObj;
          try {
            responseObj = JSON.parse(jsonResponse);
          } catch (e) {
            // If direct parsing fails, try to extract JSON using regex
            const jsonMatch = jsonResponse.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              responseObj = JSON.parse(jsonMatch[0]);
            } else {
              throw new Error("Could not parse JSON from response");
            }
          }
          
          // Handle different possible response formats:
          // - Direct array of jobs
          // - Object with a 'jobs' or 'jobListings' property containing the array
          const jobs: JobPostingData[] = Array.isArray(responseObj) 
            ? responseObj 
            : (responseObj?.jobs || responseObj?.jobListings || []);
          
          // Process each job to standardize URLs and add metadata
          return jobs.map(job => {
            // Handle the job URL field:
            // - Ensure it exists
            // - Make relative URLs absolute
            let jobUrl = job.url;
            
            if (!jobUrl || jobUrl === '' || jobUrl === url) {
              // No specific URL was provided, use the current page URL
              jobUrl = url;
            } else if (!/^https?:\/\//i.test(jobUrl)) {
              // The URL is relative, make it absolute using the current page as base
              try {
                const baseUrl = new URL(url);
                if (jobUrl.startsWith('/')) {
                  // Absolute path (starts with /)
                  jobUrl = `${baseUrl.protocol}//${baseUrl.host}${jobUrl}`;
                } else {
                  // Relative path (doesn't start with /)
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
            
            // Return the job with standardized URL, current timestamp, and organization
            return {
              ...job,
              url: jobUrl,
              dateScraped: new Date(), // Add a timestamp for when this job was found
              organization: job.organization || domain // Use domain as fallback for organization
            };
          });
        } catch (err) {
          // Handle JSON parsing errors
          this.logger.error('Error parsing AI response:', { error: err });
          throw new ParserError(
            'Failed to parse AI response for job extraction',
            ErrorCode.PARSER_JOB_EXTRACTION_FAILED,
            err instanceof Error ? err : undefined,
            { response } // Include the raw response for debugging
          );
        }
      } catch (error) {
        // If error is already a ParserError, just rethrow it
        if (error instanceof ParserError) {
          throw error;
        }
        
        // Otherwise, wrap it in a ParserError
        this.logger.error('Error in AI service call:', { error });
        throw new ParserError(
          'AI service failed during job extraction',
          ErrorCode.PARSER_AI_QUERY_FAILED,
          error instanceof Error ? error : undefined,
          { url }
        );
      }
    } catch (error) {
      // If error is already a ParserError, just rethrow it
      if (error instanceof ParserError) {
        throw error;
      }
      
      // Otherwise, wrap it in a ParserError
      this.logger.error('Error in parseJobsFromPage:', { error });
      throw new ParserError(
        'Failed to parse job postings from page',
        ErrorCode.PARSER_JOB_EXTRACTION_FAILED,
        error instanceof Error ? error : undefined,
        { url: input.url }
      );
    }
  }
  
  /**
   * Enriches a job posting with additional structured information.
   * This is a secondary processing step to extract more detailed attributes.
   * 
   * @param job The basic job posting data to enrich
   * @returns Promise resolving to the enriched job posting
   */
  async enrichJobData(job: JobPostingData): Promise<JobPostingData> {
    try {
      // Prepare a prompt for the AI focused on extracting more detailed information
      // about this specific job posting
      const prompt = `
        Analyze this job posting and extract additional structured information:
        
        Job Title: ${job.title}
        Organization: ${job.organization}
        Location: ${job.location || 'Not specified'}
        Description: ${job.description}
        
        Extract and return the following in JSON format:
        1. skills: An array of key skills required for this job
        2. experienceLevel: Junior, Mid-level, Senior, or Executive
        3. benefits: Any mentioned benefits
        4. organizationType: Type of organization (use one of these values: GOVERNMENT, NONPROFIT, PRIVATE, PUBLIC, ACADEMIC, STARTUP, or OTHER)
        5. keyResponsibilities: Main job responsibilities
        
        Return only the JSON object with these fields.
      `;
      
      // Call the AI service to analyze the job and extract additional information
      const response = await this.aiService.generateText({
        prompt,
        model: "gpt-4o", // Using GPT-4o for better extraction capabilities
        temperature: 0.2, // Low temperature for more consistent results
        maxTokens: 1000   // Response should be relatively short
      });
      
      // Parse the AI's response, which should be a JSON object
      try {
        const enrichment = JSON.parse(response);
        // Merge the original job data with the newly extracted information
        return {
          ...job,
          skills: enrichment.skills || [],
          experience: enrichment.experienceLevel,
          benefits: enrichment.benefits,
          organizationType: enrichment.organizationType,
          structuredData: {
            ...(job.structuredData || {}),
            keyResponsibilities: enrichment.keyResponsibilities
          }
        };
      } catch (err) {
        // If parsing fails, log the error but return the original job data
        // This ensures the enrichment process doesn't block the overall workflow
        this.logger.error('Error parsing enrichment response:', { error: err });
        return job;
      }
    } catch (error: any) {
      // For any other errors, log them and return the original job data
      this.logger.error('Error in enrichJobData:', { error });
      return job;
    }
  }
  
  /**
   * Classifies a page to determine if it's a job listing page, single job page, or something else.
   * This is the first step in the new crawling workflow.
   * 
   * @param input Object containing the URL, HTML content, title, and description
   * @returns Promise resolving to a PageClassificationResult with the page type and metadata
   * @throws ParserError if classification fails
   */
  async classifyPage(input: ParsePageInput): Promise<PageClassificationResult> {
    try {
      const { url, content, title, description } = input;
      
      // Clean the HTML to get useful text content for AI analysis
      const cleanedContent = this.cleanHtml(content);
      
      this.logger.info(`Classifying page: ${url}`);
      this.logger.debug(`Page title: ${title}`);
      
      // Skip pages with very little content - they're unlikely to contain useful info
      if (cleanedContent.length < 100) {
        this.logger.info(`Content too short, classifying as UNKNOWN`);
        return {
          pageType: PageType.UNKNOWN,
          confidence: 0.9,
          relevance: 0.1,
          metadata: {
            reason: 'Content too short for reliable classification'
          }
        };
      }
      
      // Extract domain for context
      let domain = '';
      try {
        domain = new URL(url).hostname.replace('www.', '');
      } catch (e) {
        domain = url.split('/')[2] || '';
      }
      
      // Prepare a prompt for the AI to classify the page
      const prompt = `
        Analyze this webpage and classify it into one of the following categories:
        
        1. JOB_LISTING: A page that lists multiple job postings (e.g., search results, careers page with multiple positions)
        2. SINGLE_JOB: A page that contains details about a single specific job posting
        3. UNKNOWN: Not a job-related page or unable to determine the page type
        
        Page URL: ${url}
        Page Title: ${title}
        Meta Description: ${description}
        Domain: ${domain}
        
        Please consider:
        - The presence of multiple job titles and descriptions vs. a single detailed job description
        - The presence of application instructions or an apply button
        - The presence of job-specific details like salary, requirements, responsibilities
        - The overall structure of the page (list-like vs. detailed article-like)
        
        Return a JSON object with the following fields:
        {
          "classification": "JOB_LISTING" or "SINGLE_JOB" or "UNKNOWN",
          "confidence": [0-1 score indicating confidence in this classification],
          "relevance": [0-1 score indicating overall relevance to job search],
          "estimatedJobCount": [if JOB_LISTING, approximate number of jobs on the page],
          "jobIndicators": [array of key terms that influenced your classification],
          "pageStructure": [brief description of the page structure],
          "reasoning": [your step-by-step reasoning for this classification]
        }
      `;
      
      // Call the AI service to classify the page
      try {
        const response = await this.aiService.generateText({
          prompt,
          model: "gpt-4o",
          temperature: 0.1,
          maxTokens: 1500
        });
        
        // Parse the AI's response
        let classification;
        try {
          // Find JSON in response
          const match = response.match(/\{[\s\S]*\}/);
          if (match) {
            classification = JSON.parse(match[0]);
          } else {
            throw new Error("No valid JSON found in response");
          }
          
          // Map the AI response to our PageClassificationResult type
          const result: PageClassificationResult = {
            pageType: classification.classification as PageType,
            confidence: classification.confidence || 0.5,
            relevance: classification.relevance || 0.5,
            metadata: {
              estimatedJobCount: classification.estimatedJobCount,
              jobIndicators: classification.jobIndicators || [],
              pageStructure: classification.pageStructure,
              reasoning: classification.reasoning
            }
          };
          
          this.logger.info(`Page classified as ${result.pageType} with confidence ${result.confidence}`);
          return result;
          
        } catch (err) {
          this.logger.error('Error parsing AI classification response:', { error: err });
          throw new ParserError(
            'Failed to parse AI response for page classification',
            ErrorCode.PARSER_CONTENT_EXTRACTION_FAILED,
            err instanceof Error ? err : undefined,
            { response }
          );
        }
      } catch (error) {
        this.logger.error('Error in AI service call for page classification:', { error });
        throw new ParserError(
          'AI service failed during page classification',
          ErrorCode.PARSER_AI_QUERY_FAILED,
          error instanceof Error ? error : undefined,
          { url }
        );
      }
    } catch (error) {
      if (error instanceof ParserError) {
        throw error;
      }
      
      this.logger.error('Error in classifyPage:', { error });
      throw new ParserError(
        'Failed to classify page',
        ErrorCode.PARSER_CONTENT_EXTRACTION_FAILED,
        error instanceof Error ? error : undefined,
        { url: input.url }
      );
    }
  }
  
  /**
   * Parses a job listing page (a page with multiple job listings).
   * This method extracts both job data and potential job links for further crawling.
   * 
   * @param input Object containing the URL, HTML content, title, and description
   * @returns Promise resolving to an object with jobs and links
   * @throws ParserError if parsing fails
   */
  async parseJobListingPage(input: ParsePageInput): Promise<{ jobs: JobPostingData[], links: string[] }> {
    try {
      const { url, content, title, description, keywords } = input;
      
      // First, extract all the jobs using our existing parseJobsFromPage method
      const jobs = await this.parseJobsFromPage(input);
      
      this.logger.info(`Found ${jobs.length} jobs on listing page: ${url}`);
      
      // Extract job-specific links that might lead to detailed job pages
      let jobLinks: string[] = [];
      
      try {
        // Load the HTML with Cheerio for link extraction
        const $ = load(content);
        
        // Common link patterns that indicate job detail pages
        const jobLinkPatterns = [
          /job/i, /career/i, /position/i, /opening/i, /vacancy/i, /apply/i, /posting/i
        ];
        
        // Find all links
        const links = $('a')
          .map(function(this: any) {
            const href = $(this).attr('href');
            const text = $(this).text().trim();
            const title = $(this).attr('title') || '';
            
            // Check if link is likely a job detail link
            if (href && (
              jobLinkPatterns.some(pattern => pattern.test(href)) ||
              jobLinkPatterns.some(pattern => pattern.test(text)) ||
              jobLinkPatterns.some(pattern => pattern.test(title))
            )) {
              // Resolve relative URLs
              try {
                return new URL(href, url).href;
              } catch (e) {
                // If URL parsing fails, just return the original href
                return href;
              }
            }
            return null;
          })
          .get()
          .filter(Boolean);
        
        // De-duplicate links
        jobLinks = [...new Set(links)];
        
        this.logger.info(`Found ${jobLinks.length} potential job detail links on: ${url}`);
        
      } catch (e) {
        this.logger.warn('Error extracting job links from listing page:', { error: e });
      }
      
      return { jobs, links: jobLinks };
      
    } catch (error) {
      if (error instanceof ParserError) {
        throw error;
      }
      
      this.logger.error('Error in parseJobListingPage:', { error });
      throw new ParserError(
        'Failed to parse job listing page',
        ErrorCode.PARSER_JOB_EXTRACTION_FAILED,
        error instanceof Error ? error : undefined,
        { url: input.url }
      );
    }
  }
  
  /**
   * Parses a single job page to extract detailed job information.
   * 
   * @param input Object containing the URL, HTML content, title, and description
   * @returns Promise resolving to a JobPostingData object or null if no job is found
   * @throws ParserError if parsing fails
   */
  async parseSingleJobPage(input: ParsePageInput): Promise<JobPostingData | null> {
    try {
      const { url, content, title, description } = input;
      
      // Clean the HTML to get useful text content for AI analysis
      const cleanedContent = this.cleanHtml(content);
      
      this.logger.info(`Parsing single job page: ${url}`);
      this.logger.debug(`Page title: ${title}`);
      
      // Skip pages with very little content
      if (cleanedContent.length < 100) {
        this.logger.info(`Content too short, skipping parsing`);
        return null;
      }
      
      // Extract domain for context (e.g., for organization name)
      let domain = '';
      try {
        domain = new URL(url).hostname.replace('www.', '');
      } catch (e) {
        domain = url.split('/')[2] || '';
      }
      
      // Prepare a detailed prompt for the AI to extract job information
      const prompt = `
        Extract job details from the following webpage. This appears to be a SINGLE JOB POSTING page.
        
        Page URL: ${url}
        Page Title: ${title}
        Meta Description: ${description}
        Domain: ${domain}
        
        Please extract ALL of the following details in a JSON format:
        - title: The job title (REQUIRED)
        - organization: The company or organization name (REQUIRED)
        - location: The job location (if specified)
        - description: A detailed description of the job (REQUIRED)
        - salary: Any salary or compensation information (if available)
        - requirements: Job requirements, qualifications, or prerequisites
        - employmentType: One of FULL_TIME, PART_TIME, CONTRACT, TEMPORARY, INTERNSHIP, REMOTE, HYBRID, or OTHER
        - skills: An array of key skills required for the position
        - benefits: Any benefits mentioned
        - applicationDeadline: Any application deadline information
        - organizationType: Type of organization (GOVERNMENT, NONPROFIT, PRIVATE, PUBLIC, ACADEMIC, STARTUP, or OTHER)
        - keyResponsibilities: Main job duties or responsibilities

        Be as thorough and accurate as possible. If you cannot find information for a particular field, omit it from the JSON.
        The REQUIRED fields must be included in your response.
        
        Return ONLY the JSON object with no additional text.
      `;
      
      // Call the AI service to extract job data
      try {
        const response = await this.aiService.generateText({
          prompt,
          model: "gpt-4o",
          temperature: 0.2,
          maxTokens: 3000
        });
        
        // Parse the AI's response, which should be a JSON object
        try {
          // Try to find the JSON object in the response
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          let parsedJob;
          
          if (jsonMatch) {
            parsedJob = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error("Could not parse JSON from response");
          }
          
          // Validate the required fields
          if (!parsedJob.title || !parsedJob.organization || !parsedJob.description) {
            this.logger.warn('AI failed to extract required job fields', { 
              title: !!parsedJob.title,
              organization: !!parsedJob.organization,
              description: !!parsedJob.description
            });
            
            // If required fields are missing, consider it not a valid job
            return null;
          }
          
          // Create the job posting with the extracted data
          const jobPosting: JobPostingData = {
            title: parsedJob.title,
            organization: parsedJob.organization || domain,
            description: parsedJob.description,
            url: url,
            dateScraped: new Date(),
            // Optional fields
            location: parsedJob.location,
            salary: parsedJob.salary,
            requirements: parsedJob.requirements,
            employmentType: parsedJob.employmentType,
            skills: parsedJob.skills || [],
            benefits: parsedJob.benefits,
            organizationType: parsedJob.organizationType,
            structuredData: {
              keyResponsibilities: parsedJob.keyResponsibilities,
              applicationDeadline: parsedJob.applicationDeadline
            }
          };
          
          this.logger.info(`Successfully extracted job: ${jobPosting.title} at ${jobPosting.organization}`);
          return jobPosting;
          
        } catch (err) {
          this.logger.error('Error parsing AI response for single job page:', { error: err });
          throw new ParserError(
            'Failed to parse AI response for job extraction',
            ErrorCode.PARSER_JOB_EXTRACTION_FAILED,
            err instanceof Error ? err : undefined,
            { response }
          );
        }
      } catch (error) {
        this.logger.error('Error in AI service call for single job page:', { error });
        throw new ParserError(
          'AI service failed during job extraction',
          ErrorCode.PARSER_AI_QUERY_FAILED,
          error instanceof Error ? error : undefined,
          { url }
        );
      }
    } catch (error) {
      if (error instanceof ParserError) {
        throw error;
      }
      
      this.logger.error('Error in parseSingleJobPage:', { error });
      throw new ParserError(
        'Failed to parse single job page',
        ErrorCode.PARSER_JOB_EXTRACTION_FAILED,
        error instanceof Error ? error : undefined,
        { url: input.url }
      );
    }
  }
  
  /**
   * Analyzes and prioritizes links based on their likelihood of being job-related.
   * This is used to determine which links to crawl next.
   * 
   * @param input Object containing the source URL, page title, and links to analyze
   * @returns Promise resolving to prioritized links and their scores
   * @throws ParserError if analysis fails
   */
  async prioritizeLinks(input: AnalyzeLinksInput): Promise<{
    prioritizedLinks: string[],
    scores: Record<string, number>
  }> {
    try {
      const { sourceUrl, pageTitle, links } = input;
      
      // Early exit if there are no links to analyze
      if (!links || links.length === 0) {
        return { prioritizedLinks: [], scores: {} };
      }
      
      // Format links into a structured text format for AI analysis
      const linksFormatted = links.map((link, index) => {
        return `${index + 1}. URL: ${link.href}
   Text: ${link.text}
   Title: ${link.title || 'N/A'}
   Aria: ${link.aria || 'N/A'}`;
      }).join('\n\n');
      
      // Extract domain from the source URL to provide context to the AI
      let domain = '';
      try {
        domain = new URL(sourceUrl).hostname.replace('www.', '');
      } catch (e) {
        domain = sourceUrl.split('/')[2] || '';
      }
      
      // Prepare a detailed prompt for the AI to prioritize the links
      const prompt = `
        You are a job posting discovery expert. Analyze the following list of links from a page titled "${pageTitle}" on ${domain} (${sourceUrl}).
        
        Your task is to evaluate each link's likelihood of leading to:
        1. A job listing page (with multiple job postings)
        2. A single job posting page (with details about one specific job)
        3. Another page that might contain job-related information
        
        LINKS TO ANALYZE:
        ${linksFormatted}
        
        For each link, consider:
        - Does the URL contain job-related terms? (job, career, position, vacancy, apply, etc.)
        - Does the link text describe job-related content?
        - Is it likely a specific job vs. a category or search page?
        - How relevant is this link likely to be for job searching?
        
        Return a JSON array with objects for each link containing:
        1. "url": The full URL of the link
        2. "score": A priority score from 0-10 (10 being highest priority for crawling)
        3. "estimatedType": Your best guess at the page type: "JOB_LISTING", "SINGLE_JOB", or "UNKNOWN"
        4. "reasons": A brief array of reasons for your scoring
        
        Example:
        [
          {
            "url": "https://example.com/careers/software-engineer",
            "score": 9.5,
            "estimatedType": "SINGLE_JOB",
            "reasons": ["URL contains specific job title", "Link text mentions position directly"]
          },
          {
            "url": "https://example.com/careers",
            "score": 7.0,
            "estimatedType": "JOB_LISTING",
            "reasons": ["Careers page likely contains job listings", "Generic careers path"]
          }
        ]
        
        Prioritize links that are most likely to lead directly to job content.
      `;
      
      // Call the AI service to prioritize links
      try {
        const response = await this.aiService.generateText({
          prompt,
          model: "gpt-4o",
          temperature: 0.2,
          maxTokens: 3000
        });
        
        // Parse the AI's response
        try {
          // Find JSON array in response
          const match = response.match(/\[[\s\S]*\]/);
          if (!match) {
            throw new Error("No valid JSON array found in response");
          }
          
          const prioritizedLinks = JSON.parse(match[0]);
          
          // Validate the response structure
          if (!Array.isArray(prioritizedLinks)) {
            throw new Error("Response is not an array");
          }
          
          // Sort links by score (descending)
          prioritizedLinks.sort((a, b) => b.score - a.score);
          
          // Extract URLs and create scores map
          const urls = prioritizedLinks.map(item => item.url);
          const scores: Record<string, number> = {};
          prioritizedLinks.forEach(item => {
            scores[item.url] = item.score;
          });
          
          this.logger.info(`Prioritized ${urls.length} links from ${sourceUrl}`);
          return { prioritizedLinks: urls, scores };
          
        } catch (err) {
          this.logger.error('Error parsing AI response for link prioritization:', { error: err });
          throw new ParserError(
            'Failed to parse AI response for link prioritization',
            ErrorCode.PARSER_LINK_ANALYSIS_FAILED,
            err instanceof Error ? err : undefined,
            { response }
          );
        }
      } catch (error) {
        this.logger.error('Error in AI service call for link prioritization:', { error });
        throw new ParserError(
          'AI service failed during link prioritization',
          ErrorCode.PARSER_AI_QUERY_FAILED,
          error instanceof Error ? error : undefined,
          { sourceUrl }
        );
      }
    } catch (error) {
      if (error instanceof ParserError) {
        throw error;
      }
      
      this.logger.error('Error in prioritizeLinks:', { error });
      throw new ParserError(
        'Failed to prioritize links',
        ErrorCode.PARSER_LINK_ANALYSIS_FAILED,
        error instanceof Error ? error : undefined,
        { sourceUrl: input.sourceUrl }
      );
    }
  }
}