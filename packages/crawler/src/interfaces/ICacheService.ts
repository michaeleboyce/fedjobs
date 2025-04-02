import { GlobalSourceCacheRecord } from '@fedjobs/database';

export interface ICacheService {
  checkCache(url: string): Promise<GlobalSourceCacheRecord | undefined>;
  createCacheEntry(url: string, jobCount?: number, expiryDays?: number): Promise<GlobalSourceCacheRecord>;
  updateCacheEntry(cacheId: number, jobCount: number, expiryDays?: number): Promise<GlobalSourceCacheRecord | undefined>;
  copyJobsFromCache(sourceId: number, cacheId: number): Promise<number>;
  linkSourceToCache(sourceId: number, cacheId: number, usedCache?: boolean): Promise<void>;
}