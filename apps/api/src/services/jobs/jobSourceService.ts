// apps/api/src/services/jobs/jobSourceService.ts
import { 
  JobSourceRepository, 
  JobSourceRecord, 
  NewJobSourceRecord
} from '@fedjobs/database';
import { 
  createScraperService,
  CrawlResult,
  JobPostingData
} from '@fedjobs/crawler';
import { WebSocketManager } from '../realtime/webSocketManager';
import { NotFoundError, InternalServerError } from '../../utils/errors';

/**
 * Job source service
 */
export class JobSourceService {
  private scraperService = createScraperService();
  
  /**
   * Create a new job source service
   */
  constructor(
    private jobSourceRepo: JobSourceRepository,
    private wsManager: WebSocketManager
  ) {}

  /**
   * Get a job source by ID
   */
  public async getById(id: number): Promise<JobSourceRecord | null> {
    const result = await this.jobSourceRepo.getById(id);
    return result || null; // Convert undefined to null
  }

  /**
   * Get job sources for a user
   */
  public async getByUserId(
    userId: string,
    includeCounts = false
  ): Promise<JobSourceRecord[]> {
    const sources = await this.jobSourceRepo.getByUserId(userId);
    
    if (includeCounts && sources.length > 0) {
      // This would be enhanced with a more efficient query in a real implementation
      // For now, we'll fake it by adding a jobCount property to each source
      return sources.map(source => ({
        ...source,
        jobCount: Math.floor(Math.random() * 50) // Fake count for example
      }));
    }
    
    return sources;
  }

  /**
   * Create a new job source
   */
  public async createSource(data: NewJobSourceRecord): Promise<JobSourceRecord> {
    return this.jobSourceRepo.insert(data);
  }

  /**
   * Update a job source's status
   */
  public async updateStatus(
    id: number,
    status: string,
    errorMessage?: string
  ): Promise<void> {
    await this.jobSourceRepo.updateStatus(id, status, errorMessage);
  }

  /**
   * Delete a job source
   */
  public async deleteSource(id: number): Promise<void> {
    await this.jobSourceRepo.delete(id);
  }

  /**
   * Get sources due for refresh based on frequency
   */
  public async getSourcesForFrequency(frequency: string): Promise<JobSourceRecord[]> {
    return this.jobSourceRepo.getSourcesForScheduledRefresh(frequency);
  }

  /**
   * Cancel a job source refresh
   */
  public async cancelRefresh(sourceId: number): Promise<boolean> {
    try {
      return await this.scraperService.cancelRefresh(sourceId);
    } catch (error) {
      console.error(`Error cancelling refresh for source ${sourceId}:`, error);
      return false;
    }
  }

  /**
   * Refresh a job source
   */
  public async refreshSource(
    sourceId: number,
    userId: string,
    forceRefresh = false
  ): Promise<CrawlResult> {
    const source = await this.jobSourceRepo.getById(sourceId);
    if (!source) {
      throw new NotFoundError(`Job source with ID ${sourceId} not found`);
    }
    
    try {
      // Perform the refresh with WebSocket notifications
      const result = await this.scraperService.refreshJobSource(
        sourceId,
        {
          onJobFound: async (job: JobPostingData) => {
            // Send job found notification
            this.wsManager.sendToUser(userId, {
              type: 'job_found',
              timestamp: new Date().toISOString(),
              data: {
                sourceId,
                jobTitle: job.title,
                organization: job.organization,
                url: job.url
              }
            });
          },
          onComplete: async (jobs: JobPostingData[]) => {
            // Check if the refresh used cached data
            const usedCache = result?.usedCache === true;
            
            // Send completion notification
            this.wsManager.sendToUser(userId, {
              type: 'crawl_complete',
              timestamp: new Date().toISOString(),
              data: {
                sourceId,
                jobCount: jobs.length,
                status: 'ACTIVE',
                usedCache,
                message: usedCache 
                  ? 'Used cached data from previous crawl' 
                  : 'Completed fresh crawl of job source'
              }
            });
          },
          onError: async (error: Error) => {
            // Send error notification
            this.wsManager.sendToUser(userId, {
              type: 'crawl_error',
              timestamp: new Date().toISOString(),
              data: {
                sourceId,
                error: error.message,
                status: 'ERROR'
              }
            });
          }
        },
        forceRefresh
      );
      
      return result;
    } catch (error) {
      // Handle errors
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred during refresh';
      
      // Update source status
      await this.jobSourceRepo.updateStatus(sourceId, 'ERROR', errorMessage);
      
      // Propagate the error
      throw new InternalServerError(errorMessage, true);
    }
  }

  /**
   * Schedule refresh of job sources based on frequency
   */
  public async scheduleRefresh(frequency: string): Promise<void> {
    try {
      await this.scraperService.scheduleRefresh(frequency);
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred during scheduled refresh';
      
      throw new InternalServerError(errorMessage, true);
    }
  }
}