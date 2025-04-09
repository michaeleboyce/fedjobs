// File path: packages/crawler/src/core/crawler/UrlTracker.ts
import { URL } from 'url';

/**
 * Manages URL history to prevent revisiting the same pages
 */
export class UrlTracker {
  private urlHistory = new Map();
  private readonly HISTORY_EXPIRATION = 24 * 60 * 60 * 1000; // 24 hours
  
  /**
   * Check if URL was recently visited
   */
  isRecentlyVisited(url: string): boolean {
    const normalizedUrl = this.normalizeUrl(url);
    const visitTime = this.urlHistory.get(normalizedUrl);
    
    if (!visitTime) return false;
    
    const now = new Date();
    return now.getTime() - visitTime.getTime() < this.HISTORY_EXPIRATION;
  }
  
  /**
   * Record URL visit
   */
  recordVisit(url: string): void {
    const normalizedUrl = this.normalizeUrl(url);
    this.urlHistory.set(normalizedUrl, new Date());
  }
  
  /**
   * Clear the URL history
   * This is useful for force refreshing to ensure all URLs are processed
   */
  clearHistory(): void {
    this.urlHistory.clear();
  }
  
  /**
   * Normalize a URL for consistent comparison
   */
  private normalizeUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);
      // Remove trailing slashes and make lowercase
      return parsedUrl.origin.toLowerCase() + 
             parsedUrl.pathname.replace(/\/$/, '').toLowerCase() + 
             parsedUrl.search;
    } catch (e) {
      return url.toLowerCase();
    }
  }
}