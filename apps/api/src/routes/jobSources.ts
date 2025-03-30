import express, { Router, Request, Response, NextFunction } from 'express';
import { RequestHandler } from '../types/route-handlers';
import { JobSourceRepository } from '@fedjobs/database/src/repositories/jobSources';
import { JobPostingRepository } from '@fedjobs/database/src/repositories/jobPostings';
import { JobScraperService } from '@fedjobs/utils/src/Services/JobScraperService';

const router: Router = express.Router();
const jobSourceRepo = new JobSourceRepository();
const jobPostingRepo = new JobPostingRepository();
const jobScraperService = new JobScraperService();

// Get all job sources for a user
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }
    
    const sources = await jobSourceRepo.getByUserId(userId);
    res.json(sources);
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
    const { userId, url, name, keywords, refreshFrequency } = req.body;
    
    if (!userId || !url || !name) {
      res.status(400).json({ error: 'userId, url, and name are required' });
      return;
    }
    
    const newSource = await jobSourceRepo.insert({
      userId,
      url,
      name,
      keywords: keywords || '',
      refreshFrequency: refreshFrequency || 'DAILY',
      status: 'PENDING'
    });
    
    // Trigger initial scrape as a background process
    jobScraperService.refreshJobSource(newSource.id)
      .catch(error => console.error(`Error in initial scrape for source ${newSource.id}:`, error));
    
    res.status(201).json(newSource);
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
    
    // Respond with acknowledgement that the refresh has started
    res.json({ 
      message: 'Job source refresh started',
      sourceId: id,
      status: 'PENDING'
    });
    
    // Start the refresh in the background
    jobScraperService.refreshJobSource(id)
      .catch(error => console.error(`Error refreshing source ${id}:`, error));
    
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
