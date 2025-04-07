// apps/api/src/controllers/jobController.ts
import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { JobSourceService } from '../services/jobs/jobSourceService';
import { JobPostingService } from '../services/jobs/jobPostingService';
import { WebSocketManager } from '../services/realtime/webSocketManager';

/**
 * Job source creation schema
 */
const createJobSourceSchema = z.object({
  userId: z.string(),
  url: z.string().url(),
  name: z.string().min(1),
  keywords: z.string().optional(),
  refreshFrequency: z.enum(['DAILY', 'WEEKLY', 'MANUAL']).optional(),
});

/**
 * Job source controller class
 */
export class JobSourceController {
  /**
   * Create a new job source controller
   */
  constructor(
    private jobSourceService: JobSourceService,
    private jobPostingService: JobPostingService,
    private wsManager: WebSocketManager
  ) {}

  /**
   * Get all job sources for a user
   */
  public getAllSources = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.query.userId as string;
    
    if (!userId) {
      throw new BadRequestError('userId is required');
    }
    
    const includeCounts = req.query.includeCounts === 'true';
    const sources = await this.jobSourceService.getByUserId(userId, includeCounts);
    
    res.json(sources);
  });

  /**
   * Get a specific job source
   */
  public getSourceById = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    
    const source = await this.jobSourceService.getById(id);
    if (!source) {
      throw new NotFoundError('Job source not found');
    }
    
    res.json(source);
  });

  /**
   * Create a new job source
   */
  public createSource = asyncHandler(async (req: Request, res: Response) => {
    const validationResult = createJobSourceSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new BadRequestError('Invalid request body', validationResult.error.format());
    }
    
    const { userId, url, name, keywords, refreshFrequency } = validationResult.data;
    
    // Create the source
    const newSource = await this.jobSourceService.createSource({
      userId,
      url, 
      name,
      keywords: keywords || '',
      refreshFrequency: refreshFrequency || 'DAILY',
      status: 'PENDING'
    });
    
    // Send WebSocket notification
    this.wsManager.sendToUser(userId, {
      type: 'job_source_created',
      timestamp: new Date().toISOString(),
      data: { 
        sourceId: newSource.id,
        status: 'PENDING',
        message: 'Job source created, checking cache and starting initial crawl...'
      }
    });
    
    // Return the new source
    res.status(201).json(newSource);
    
    // Start crawl in the background without affecting response
    this.jobSourceService.refreshSource(newSource.id, userId, false)
      .catch(error => {
        console.error(`Error refreshing source ${newSource.id}:`, error);
        
        // Send error notification
        this.wsManager.sendToUser(userId, {
          type: 'crawl_error',
          timestamp: new Date().toISOString(),
          data: {
            sourceId: newSource.id,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            status: 'ERROR'
          }
        });
      });
  });

  /**
   * Get jobs for a specific source
   */
  public getJobsForSource = asyncHandler(async (req: Request, res: Response) => {
    const sourceId = parseInt(req.params.id);
    
    // Verify source exists
    const source = await this.jobSourceService.getById(sourceId);
    if (!source) {
      throw new NotFoundError('Job source not found');
    }
    
    // Get jobs
    const jobs = await this.jobPostingService.getBySourceId(sourceId);
    res.json(jobs);
  });

  /**
   * Refresh a job source
   */
  public refreshSource = asyncHandler(async (req: Request, res: Response) => {
    const sourceId = parseInt(req.params.id);
    
    // Verify source exists
    const source = await this.jobSourceService.getById(sourceId);
    if (!source) {
      throw new NotFoundError('Job source not found');
    }
    
    // Parse forced refresh flag
    const forceRefresh = req.query.forceRefresh === 'true' || req.body.forceRefresh === true;
    
    // Update status
    await this.jobSourceService.updateStatus(sourceId, 'PENDING');
    
    // Send initial notification
    this.wsManager.sendToUser(source.userId, {
      type: 'job_source_refresh_started',
      timestamp: new Date().toISOString(),
      data: {
        sourceId,
        status: 'PENDING',
        message: forceRefresh 
          ? 'Starting forced refresh of job source'
          : 'Job source refresh started, checking cache first'
      }
    });
    
    // Respond immediately
    res.json({ 
      message: 'Job source refresh started',
      sourceId,
      status: 'PENDING',
      forceRefresh
    });
    
    // Start refresh in background
    this.jobSourceService.refreshSource(sourceId, source.userId, forceRefresh)
      .catch(error => {
        console.error(`Error refreshing source ${sourceId}:`, error);
        
        // Send error notification
        this.wsManager.sendToUser(source.userId, {
          type: 'crawl_error',
          timestamp: new Date().toISOString(),
          data: {
            sourceId,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            status: 'ERROR'
          }
        });
      });
  });

  /**
   * Cancel a job source refresh
   */
  public cancelRefresh = asyncHandler(async (req: Request, res: Response) => {
    const sourceId = parseInt(req.params.id);
    
    // Verify source exists
    const source = await this.jobSourceService.getById(sourceId);
    if (!source) {
      throw new NotFoundError('Job source not found');
    }
    
    // Cancel refresh
    const cancelled = await this.jobSourceService.cancelRefresh(sourceId);
    
    // Update status
    await this.jobSourceService.updateStatus(sourceId, 'ACTIVE');
    
    // Send WebSocket notification
    this.wsManager.sendToUser(source.userId, {
      type: 'crawl_cancelled',
      timestamp: new Date().toISOString(),
      data: {
        sourceId,
        message: 'Crawl cancelled by user',
        status: 'ACTIVE',
        crawlerStopped: cancelled
      }
    });
    
    // Respond with status
    res.json({ 
      message: `Job source refresh cancelled${cancelled ? '' : ' (no active crawler found)'}`,
      sourceId,
      status: 'ACTIVE',
      crawlerStopped: cancelled
    });
  });

  /**
   * Delete a job source
   */
  public deleteSource = asyncHandler(async (req: Request, res: Response) => {
    const sourceId = parseInt(req.params.id);
    
    // Verify source exists
    const source = await this.jobSourceService.getById(sourceId);
    if (!source) {
      throw new NotFoundError('Job source not found');
    }
    
    // Try to cancel any ongoing refreshes
    await this.jobSourceService.cancelRefresh(sourceId);
    
    // Delete the source
    await this.jobSourceService.deleteSource(sourceId);
    
    // Respond with no content
    res.status(204).send();
  });
}