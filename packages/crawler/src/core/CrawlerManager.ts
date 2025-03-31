// File path: packages/crawler/src/core/CrawlerManager.ts
import { PlaywrightCrawler } from 'crawlee';
import { Logger } from '../utils/Logger';

const logger = new Logger('CrawlerManager');

/**
 * Singleton manager for active crawlers
 */
export class CrawlerManager {
  private static instance: CrawlerManager;
  private activeCrawlers: Map<number, PlaywrightCrawler> = new Map();
  
  private constructor() {
    // Private constructor to enforce singleton pattern
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): CrawlerManager {
    if (!CrawlerManager.instance) {
      CrawlerManager.instance = new CrawlerManager();
    }
    return CrawlerManager.instance;
  }
  
  /**
   * Register a crawler for a source
   */
  public registerCrawler(sourceId: number, crawler: PlaywrightCrawler): void {
    logger.info(`Registering crawler for source ${sourceId}`);
    this.activeCrawlers.set(sourceId, crawler);
  }
  
  /**
   * Unregister a crawler for a source
   */
  public unregisterCrawler(sourceId: number): void {
    logger.info(`Unregistering crawler for source ${sourceId}`);
    this.activeCrawlers.delete(sourceId);
  }
  
  /**
   * Get an active crawler by source ID
   */
  public getCrawler(sourceId: number): PlaywrightCrawler | undefined {
    return this.activeCrawlers.get(sourceId);
  }
  
  /**
   * Check if a source has an active crawler
   */
  public hasCrawler(sourceId: number): boolean {
    return this.activeCrawlers.has(sourceId);
  }
  
  /**
   * Stop a crawler by source ID
   */
  public async stopCrawler(sourceId: number): Promise<boolean> {
    const crawler = this.activeCrawlers.get(sourceId);
    if (!crawler) {
      logger.info(`No active crawler found for source ${sourceId}`);
      return false;
    }
    
    try {
      logger.info(`Stopping crawler for source ${sourceId}`);
      await crawler.stop();
      this.activeCrawlers.delete(sourceId);
      logger.info(`Successfully stopped crawler for source ${sourceId}`);
      return true;
    } catch (error) {
      logger.error(`Error stopping crawler for source ${sourceId}`, { error });
      return false;
    }
  }
  
  /**
   * Stop a crawler if it exists
   */
  public async stopCrawlerIfExists(sourceId: number): Promise<boolean> {
    if (this.hasCrawler(sourceId)) {
      return this.stopCrawler(sourceId);
    }
    return false;
  }
  
  /**
   * Get the count of active crawlers
   */
  public getActiveCount(): number {
    return this.activeCrawlers.size;
  }
  
  /**
   * Get all active source IDs
   */
  public getActiveSources(): number[] {
    return Array.from(this.activeCrawlers.keys());
  }
}