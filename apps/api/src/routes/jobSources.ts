// File path: apps/api/src/routes/jobSources.ts
import express, { Router, Request, Response, NextFunction } from 'express';
import { JobSourceRepository } from '@fedjobs/database';
import { JobPostingRepository } from '@fedjobs/database';
import { ScraperService } from '@fedjobs/crawler';
import { userWsClients } from '../index';

const router: Router = express.Router();
const jobSourceRepo = new JobSourceRepository();
const jobPostingRepo = new JobPostingRepository();
const jobScraperService = new ScraperService();

// Helper function to send WebSocket updates to a specific user
function sendWebSocketUpdate(userId: string, eventType: string, data: any) {
  const clients = userWsClients.get(userId);
  if (!clients || clients.size === 0) {
    return; // No connected clients for this user
  }
  
  const message = JSON.stringify({
    type: eventType,
    timestamp: new Date().toISOString(),
    data
  });
  
  // Send to all connected clients for this user
  clients.forEach(client => {
    if (client.readyState === 1) { // 1 = WebSocket.OPEN
      client.send(message);
    }
  });
}

// Get all job sources for a user
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }
    
    const sources = await jobSourceRepo.getByUserId(userId);
    
    // Include job counts if requested
    if (req.query.includeCounts === 'true') {
      const sourceIds = sources.map((source: { id: number }) => source.id);
      const jobCounts = await jobPostingRepo.getJobCountsBySourceIds(sourceIds);
      
      // Add job counts to the sources
      const sourcesWithCounts = sources.map((source: { id: number }) => ({
        ...source,
        jobCount: jobCounts[source.id] || 0
      }));
      
      res.json(sourcesWithCounts);
    } else {
      res.json(sources);
    }
  } catch (error) {
    next(error);
  }
});

// Get a specific job source
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const source = await jobSourceRepo.getById(id);
    
    if (!source) {
      res.status(404).json({ error: 'Job source not found' });
      return;
    }
    
    res.json(source);
  } catch (error) {
    next(error);
  }
});

// Create a new job source
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    console.log('[JobSourcesAPI] POST / - Creating new job source', req.body);
    
    const { userId, url, name, keywords, refreshFrequency } = req.body;
    
    if (!userId || !url || !name) {
      console.log('[JobSourcesAPI] Missing required fields', { userId, url, name });
      res.status(400).json({ error: 'userId, url, and name are required' });
      return;
    }
    
    console.log('[JobSourcesAPI] Creating new job source in database');
    // Create the new job source
    const newSource = await jobSourceRepo.insert({
      userId,
      url,
      name,
      keywords: keywords || '',
      refreshFrequency: refreshFrequency || 'DAILY',
      status: 'PENDING'
    });
    
    console.log('[JobSourcesAPI] Job source created successfully', newSource);
    
    // Send initial status via WebSocket
    sendWebSocketUpdate(userId, 'job_source_created', { 
      sourceId: newSource.id,
      status: 'PENDING',
      message: 'Job source created, checking cache and starting initial crawl...'
    });
    
    // Return the new source to the client immediately
    console.log('[JobSourcesAPI] Sending response to client');
    res.status(201).json(newSource);
    
    // Start the job crawl with progress updates in the background
    // The refreshJobSource method will automatically check if there's a cached version available
    jobScraperService.refreshJobSource(newSource.id, {
      onJobFound: async (job) => {
        // Send real-time job updates
        sendWebSocketUpdate(userId, 'job_found', {
          sourceId: newSource.id,
          jobTitle: job.title,
          organization: job.organization,
          url: job.url
        });
      },
      onComplete: async (jobs) => {
        // Send completion update
        sendWebSocketUpdate(userId, 'crawl_complete', {
          sourceId: newSource.id,
          jobCount: jobs.length,
          status: 'ACTIVE',
          usedCache: false, // Initial crawl is never from cache
          message: 'Completed fresh crawl of job source'
        });
      },
      onError: async (error) => {
        // Send error update
        sendWebSocketUpdate(userId, 'crawl_error', {
          sourceId: newSource.id,
          error: error.message,
          status: 'ERROR'
        });
      }
    },
    false // Don't force refresh for new sources
    ).catch(error => {
      console.error(`Error in initial scrape for source ${newSource.id}:`, error);
      
      // Send error update via WebSocket
      sendWebSocketUpdate(userId, 'crawl_error', {
        sourceId: newSource.id,
        error: error.message || 'Unknown error occurred during crawl',
        status: 'ERROR'
      });
    });
  } catch (error) {
    next(error);
  }
});

// Update a job source
router.put('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { name, keywords, refreshFrequency, status } = req.body;
    
    const source = await jobSourceRepo.getById(id);
    if (!source) {
      res.status(404).json({ error: 'Job source not found' });
      return;
    }
    
    const updatedSource = await jobSourceRepo.update(id, {
      name: name !== undefined ? name : source.name,
      keywords: keywords !== undefined ? keywords : source.keywords,
      refreshFrequency: refreshFrequency !== undefined ? refreshFrequency : source.refreshFrequency,
      status: status !== undefined ? status as any : source.status
    });
    
    res.json(updatedSource[0]);
  } catch (error) {
    next(error);
  }
});

// Delete a job source
router.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    
    const source = await jobSourceRepo.getById(id);
    if (!source) {
      res.status(404).json({ error: 'Job source not found' });
      return;
    }
    
    await jobSourceRepo.delete(id);
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Cancel a job source refresh
router.post('/:id/cancel', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    
    // Get the source to check if it exists
    const sourceDetails = await jobSourceRepo.getById(id);
    if (!sourceDetails) {
      res.status(404).json({ error: 'Job source not found' });
      return;
    }
    
    console.log(`[JobSourcesAPI] Cancelling refresh for source ${id}`);
    
    // Use the JobScraperService to actually cancel the crawler
    const cancelled = await jobScraperService.cancelRefresh(id);
    
    console.log(`[JobSourcesAPI] Cancellation result: ${cancelled ? 'Crawler stopped' : 'No active crawler found'}`);
    
    // Respond with acknowledgement
    res.json({ 
      message: `Job source refresh cancelled${cancelled ? '' : ' (no active crawler found)'}`,
      sourceId: id,
      status: 'ACTIVE',
      crawlerStopped: cancelled
    });
    
    // Send WebSocket notification about cancellation
    sendWebSocketUpdate(sourceDetails.userId, 'crawl_cancelled', {
      sourceId: id,
      message: 'Crawl cancelled by user',
      status: 'ACTIVE',
      crawlerStopped: cancelled
    });
    
  } catch (error) {
    next(error);
  }
});

// Refresh a job source
router.post('/:id/refresh', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    
    const source = await jobSourceRepo.getById(id);
    if (!source) {
      res.status(404).json({ error: 'Job source not found' });
      return;
    }
    
    // Update status to pending
    await jobSourceRepo.updateStatus(id, 'PENDING');
    
    // Get user ID for this source
    const sourceDetails = await jobSourceRepo.getById(id);
    if (!sourceDetails) {
      res.status(404).json({ error: 'Job source not found' });
      return;
    }
    
    // Force refresh flag - if true, bypass cache and force a fresh crawl
    const forceRefresh = req.query.forceRefresh === 'true' || req.body.forceRefresh === true;
    console.log(`Job source refresh for ID ${id}, forceRefresh: ${forceRefresh}`);
    console.log(`Query params:`, req.query);
    console.log(`Body:`, req.body);
    
    // Respond with acknowledgement that the refresh has started
    res.json({ 
      message: 'Job source refresh started',
      sourceId: id,
      status: 'PENDING',
      forceRefresh
    });
    
    // Send initial WebSocket update
    sendWebSocketUpdate(sourceDetails.userId, 'job_source_refresh_started', {
      sourceId: id,
      status: 'PENDING',
      message: forceRefresh 
        ? 'Starting forced refresh of job source'
        : 'Job source refresh started, checking cache first'
    });
    
    // Start the refresh in the background with WebSocket updates
    console.log(`Starting refresh with forceRefresh=${forceRefresh}`);
    let crawlResult: any = null;
    crawlResult = await jobScraperService.refreshJobSource(
      id, 
      {
        onJobFound: async (job) => {
          // Send real-time job updates
          sendWebSocketUpdate(sourceDetails.userId, 'job_found', {
            sourceId: id,
            jobTitle: job.title,
            organization: job.organization,
            url: job.url
          });
        },
      onComplete: async (jobs) => {
        // Check if the refresh used cached data
        const usedCache = crawlResult?.usedCache === true;
        
        // Send completion update
        sendWebSocketUpdate(sourceDetails.userId, 'crawl_complete', {
          sourceId: id,
          jobCount: jobs.length,
          status: 'ACTIVE',
          usedCache,
          message: usedCache 
            ? 'Used cached data from previous crawl' 
            : 'Completed fresh crawl of job source'
        });
      },
      onError: async (error) => {
        // Send error update
        sendWebSocketUpdate(sourceDetails.userId, 'crawl_error', {
          sourceId: id,
          error: error.message,
          status: 'ERROR'
        });
      }
    }, 
    forceRefresh
    ).catch(error => {
      console.error(`Error refreshing source ${id}:`, error);
      
      // Send error update via WebSocket
      sendWebSocketUpdate(sourceDetails.userId, 'crawl_error', {
        sourceId: id,
        error: error.message || 'Unknown error occurred during refresh',
        status: 'ERROR'
      });
    });
    
  } catch (error) {
    next(error);
  }
});

// Get jobs from a specific source
router.get('/:id/jobs', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sourceId = parseInt(req.params.id);
    
    const source = await jobSourceRepo.getById(sourceId);
    if (!source) {
      res.status(404).json({ error: 'Job source not found' });
      return;
    }
    
    const jobs = await jobPostingRepo.getBySourceId(sourceId);
    
    res.json(jobs);
  } catch (error) {
    next(error);
  }
});

export default router;
