// File path: packages/utils/src/Services/UrlNormalizationService.ts

/**
 * Service for normalizing URLs to identify matching sources
 */
export class UrlNormalizationService {
  /**
   * Normalize a URL for comparison purposes
   * - Convert to lowercase
   * - Remove protocol (http/https)
   * - Remove "www." prefix
   * - Remove trailing slashes and default pages (index.html)
   * - Sort query parameters alphabetically
   * - Remove tracking parameters
   * - Remove fragments (#) unless they are essential for navigation
   */
  normalizeUrl(url: string): string {
    try {
      // Handle empty URLs
      if (!url || url.trim() === '') {
        return '';
      }
      
      // Ensure URL has a protocol for parsing
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      
      // Parse the URL
      const parsedUrl = new URL(url);
      
      // Extract domain (remove "www." prefix)
      let domain = parsedUrl.hostname.replace(/^www\./i, '');
      
      // Extract path (remove trailing slash and default pages)
      let path = parsedUrl.pathname;
      path = path.replace(/\/(index\.(html?|php|aspx?|jsp))?\/?$/i, '/');
      path = path === '/' ? '' : path;
      
      // Common tracking parameters to remove
      const trackingParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'fbclid', 'gclid', 'msclkid', 'ref', 'source', 'campaign',
        '_ga', '_gl', '_hsenc', '_hsmi', '__hssc', '__hstc', '__hsfp'
      ];
      
      // Process query parameters (sort and remove tracking)
      let queryParams = '';
      if (parsedUrl.search) {
        const searchParams = new URLSearchParams(parsedUrl.search);
        // Remove tracking parameters
        trackingParams.forEach(param => searchParams.delete(param));
        
        // Get remaining parameters and sort them
        const paramKeys = Array.from(searchParams.keys()).sort();
        if (paramKeys.length > 0) {
          const sortedParams = new URLSearchParams();
          paramKeys.forEach(key => {
            const values = searchParams.getAll(key);
            values.sort(); // Sort values
            values.forEach(value => sortedParams.append(key, value));
          });
          queryParams = sortedParams.toString();
          if (queryParams) {
            queryParams = '?' + queryParams;
          }
        }
      }
      
      // Skip fragment (#) for normalization unless it's essential
      // (This is a simplification - in a real implementation we might need
      // to keep fragments for some sites where they are essential)
      
      // Combine components to create normalized URL
      return `${domain}${path}${queryParams}`.toLowerCase();
    } catch (error) {
      console.error('Error normalizing URL:', error);
      // Return the original URL lowercased if parsing fails
      return url.toLowerCase();
    }
  }
  
  /**
   * Extract domain from a URL
   */
  extractDomain(url: string): string {
    try {
      // Ensure URL has a protocol for parsing
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      
      const parsedUrl = new URL(url);
      return parsedUrl.hostname.replace(/^www\./i, '');
    } catch (error) {
      console.error('Error extracting domain:', error);
      // Try a simple regex approach if URL parsing fails
      const match = url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i);
      return match ? match[1].toLowerCase() : url.toLowerCase();
    }
  }
}