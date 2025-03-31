import { load } from 'cheerio';
import { AnalyzeLinksInput, JobPostingData, ParsePageInput } from '../types';
import { AIService } from '@fedjobs/utils';

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
      
      // Prepare prompt for AI
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
      
      // Call AI service to analyze links
      const response = await this.aiService.generateText({
        prompt,
        model: "gpt-4o",
        temperature: 0.1,
        maxTokens: 2000
      });
      
      // Parse AI response as JSON array
      try {
        // Find JSON array in the response
        const match = response.match(/\[.*?\]/s);
        if (match) {
          const jsonResponse = JSON.parse(match[0]);
          
          // Validate each URL
          const validUrls = jsonResponse.filter((url: any) => 
            typeof url === 'string' && 
            (url.startsWith('http://') || url.startsWith('https://'))
          );
          
          return validUrls;
        }
        return [];
      } catch (err) {
        console.error('[JobParser] Error parsing AI response for link analysis:', err);
        return [];
      }
    } catch (error) {
      console.error('[JobParser] Error in analyzeLinks:', error);
      return [];
    }
  }
  
  /**
   * Clean HTML content to extract meaningful text
   */
  private cleanHtml(html: string): string {
    try {
      // Load HTML into cheerio
      const $ = load(html);
      
      // Remove scripts, styles, and other non-content elements
      $('script, style, svg, img, iframe, noscript, head, link, meta').remove();
      
      // Remove CSS classes and inline styles that might affect extraction
      $('*').removeAttr('class').removeAttr('style');
      
      // Extract main content selectors that typically contain the actual page content
      const mainContentSelectors = ['main', 'article', '#content', '#main', '.content', '.main-content'];
      
      let mainContent = '';
      
      // Try to find main content using common selectors
      for (const selector of mainContentSelectors) {
        if ($(selector).length) {
          const text = $(selector).text().trim();
          if (text.length > mainContent.length) {
            mainContent = text;
          }
        }
      }
      
      // If none of the selectors found substantial content, fall back to body
      if (mainContent.length < 100) {
        mainContent = $('body').text();
      }
      
      // Clean up whitespace
      const cleaned = mainContent.replace(/\s+/g, ' ').trim();
      
      // Check if we have actual content
      if (cleaned.length < 50) {
        console.log('[JobParser] Warning: cleanHtml produced very little content, falling back to partial HTML');
        
        // As a fallback, get visible text from paragraphs, lists, headings, etc.
        const visibleElements = $('h1, h2, h3, h4, h5, h6, p, li, div > *:not(script):not(style)').map((index, element) => {
          return $(element).text().trim();
        }).get().join(' ');
        
        return visibleElements.replace(/\s+/g, ' ').trim();
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
      
      // Try to extract job links from the page
      let jobLinks = '';
      try {
        // Extract links that might be job listings
        const $ = load(content);
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
          .slice(0, 20) // Limit to 20 most relevant links
          .join('\n');
        
        if (links.length > 0) {
          jobLinks = `\nPotential job-related links found on the page:\n${links}\n\nUse these links when possible as the 'url' field for each job.`;
        }
      } catch (e) {
        console.log('[JobParser] Error extracting links:', e);
      }
      
      // Prepare prompt for the AI
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
        ${cleanedContent.slice(0, 12000)}
      `;
      
      if (keywords) {
        prompt += `\n\nFocus on jobs related to these keywords: ${keywords}`;
      }
      
      // Call AI service to extract job data
      const response = await this.aiService.generateText({
        prompt,
        model: "gpt-4o",
        temperature: 0.2,
        maxTokens: 4000
      });
      
      // Try to parse the response as JSON
      try {
        // Check for brackets to ensure it's JSON
        const jsonStart = response.indexOf('[');
        const jsonEnd = response.lastIndexOf(']');
        let jsonResponse = response;
        
        if (jsonStart > -1 && jsonEnd > -1) {
          jsonResponse = response.substring(jsonStart, jsonEnd + 1);
        }
        
        // Try to parse the response as JSON
        let responseObj;
        try {
          responseObj = JSON.parse(jsonResponse);
        } catch (e) {
          // If direct parsing fails, try to extract JSON from text
          const jsonMatch = jsonResponse.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            responseObj = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error("Could not parse JSON from response");
          }
        }
        
        const jobs: JobPostingData[] = Array.isArray(responseObj) 
          ? responseObj 
          : (responseObj?.jobs || responseObj?.jobListings || []);
        
        // Process each job to ensure it has proper URLs and metadata
        return jobs.map(job => {
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
          
          return {
            ...job,
            url: jobUrl,
            dateScraped: new Date(),
            organization: job.organization || domain
          };
        });
      } catch (err) {
        console.error('[JobParser] Error parsing AI response:', err);
        return [];
      }
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
      // Prepare prompt for the AI
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
      
      // Call AI service to enrich job data
      const response = await this.aiService.generateText({
        prompt,
        model: "gpt-4o",
        temperature: 0.2,
        maxTokens: 1000
      });
      
      // Parse AI response
      try {
        const enrichment = JSON.parse(response);
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
        console.error('[JobParser] Error parsing enrichment response:', err);
        return job;
      }
    } catch (error: any) {
      console.error('[JobParser] Error in enrichJobData:', error);
      return job;
    }
  }
}