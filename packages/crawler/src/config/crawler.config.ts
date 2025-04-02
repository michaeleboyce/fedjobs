export interface CrawlerConfig {
    maxConcurrency: number;
    navigationTimeoutSecs: number;
    historyExpirationMs: number;
    maxRetries: number;
    logLevel: string;
  }
  
  export const defaultCrawlerConfig: CrawlerConfig = {
    maxConcurrency: 2,
    navigationTimeoutSecs: 90,
    historyExpirationMs: 24 * 60 * 60 * 1000, // 24 hours
    maxRetries: 3,
    logLevel: 'info',
  };