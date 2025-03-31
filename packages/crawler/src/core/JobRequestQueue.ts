import { RequestQueue } from 'crawlee';
import { Logger } from '../utils/Logger';

const logger = new Logger('JobRequestQueue');

/**
 * Manages request queuing and URL history for crawler
 */
export class JobRequestQueue {
  private urlHistory: Map<string, Date> = new Map();
  private readonly HISTORY_EXPIRATION = 24 * 60 * 60 * 1000; // 24 hours
  private requestQueue: RequestQueue | null = null;
  
  /**
   * Get the RequestQueue instance, creating it if needed
   */
  async getQueue(): Promise<RequestQueue> {
    if (!this.requestQueue) {
      this.requestQueue = await RequestQueue.open('job-requests');
      logger.info('Created new RequestQueue');
    }
    return this.requestQueue;
  }
  
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
  
  /**
   * Clear expired entries from URL history
   */
  clearExpiredEntries(): number {
    const now = new Date().getTime();
    let expiredCount = 0;
    
    for (const [url, visitTime] of this.urlHistory.entries()) {
      if (now - visitTime.getTime() > this.HISTORY_EXPIRATION) {
        this.urlHistory.delete(url);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      logger.info(`Cleared ${expiredCount} expired URL history entries`);
    }
    
    return expiredCount;
  }
}