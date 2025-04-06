// File path: packages/crawler/src/core/crawler/CrawlerManager.ts
import { PlaywrightCrawler } from 'crawlee';

/**
 * Manages active crawlers
 */
export class CrawlerManager {
  private activeCrawlers = new Map<number, PlaywrightCrawler>();
  
  /**
   * Register a crawler for a source
   */
  registerCrawler(sourceId: number, crawler: PlaywrightCrawler): void {
    console.log(`[CrawlerManager] Registering crawler for source ${sourceId}`);
    this.activeCrawlers.set(sourceId, crawler);
  }
  
  /**
   * Unregister a crawler for a source
   */
  unregisterCrawler(sourceId: number): void {
    console.log(`[CrawlerManager] Unregistering crawler for source ${sourceId}`);
    this.activeCrawlers.delete(sourceId);
  }
  
  /**
   * Cancel an active crawler for a source
   */
  async cancelCrawler(sourceId: number): Promise<boolean> {
    const crawler = this.activeCrawlers.get(sourceId);
    if (!crawler) {
      console.log(`[CrawlerManager] No active crawler found for source ${sourceId}`);
      return false;
    }
    
    try {
      console.log(`[CrawlerManager] Cancelling crawler for source ${sourceId}`);
      await crawler.stop();
      this.activeCrawlers.delete(sourceId);
      console.log(`[CrawlerManager] Successfully cancelled crawler for source ${sourceId}`);
      return true;
    } catch (error) {
      console.error(`[CrawlerManager] Error cancelling crawler for source ${sourceId}:`, error);
      return false;
    }
  }
}