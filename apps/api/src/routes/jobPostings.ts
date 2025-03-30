import express, { Router, Request, Response, NextFunction } from 'express';
import { JobPostingRepository } from '@fedjobs/database/src/repositories/jobPostings';
import { UserJobFeedbackRepository } from '@fedjobs/database/src/repositories/userJobFeedback';

const router: Router = express.Router();
const jobPostingRepo = new JobPostingRepository();
const userJobFeedbackRepo = new UserJobFeedbackRepository();

// Search jobs
router.get('/search', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { 
      keywords, 
      location, 
      organization, 
      organizationType,
      employmentType,
      userId 
    } = req.query;
    
    const jobs = await jobPostingRepo.searchJobs({
      keywords: keywords as string,
      location: location as string,
      organization: organization as string,
      organizationType: organizationType as string,
      employmentType: employmentType as string,
      userId: userId as string
    });
    
    res.json(jobs);
  } catch (error) {
    next(error);
  }
});

// Get a specific job
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const job = await jobPostingRepo.getById(id);
    
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    
    res.json(job);
  } catch (error) {
    next(error);
  }
});

// Get similar jobs
router.get('/:id/similar', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const jobId = parseInt(req.params.id);
    const userId = req.query.userId as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
    
    const job = await jobPostingRepo.getById(jobId);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    
    // Get excluded job IDs (e.g., jobs the user is not interested in)
    let excludeIds: number[] = [];
    if (userId) {
      const userFeedback = await userJobFeedbackRepo.getFeedbackByUserId(userId);
      const notInterestedJobs = userFeedback
        .filter(feedback => feedback.feedbackType === 'NOT_INTERESTED')
        .map(feedback => feedback.jobId);
      
      excludeIds = [...notInterestedJobs];
    }
    
    // Find similar jobs
    const similarJobs = await jobPostingRepo.findSimilarJobs(jobId, {
      limit,
      excludeIds,
      excludeFeedback: 'NOT_INTERESTED'
    });
    
    res.json(similarJobs);
  } catch (error) {
    next(error);
  }
});

// Get recommended jobs for a user
router.get('/recommended/:userId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.params.userId;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    
    // Get excluded job IDs (e.g., jobs the user is not interested in)
    const userFeedback = await userJobFeedbackRepo.getFeedbackByUserId(userId);
    const notInterestedJobs = userFeedback
      .filter(feedback => feedback.feedbackType === 'NOT_INTERESTED')
      .map(feedback => feedback.jobId);
    
    // Get recommended jobs
    const recommendedJobs = await jobPostingRepo.getRecommendedJobs(userId, {
      limit,
      excludeIds: notInterestedJobs
    });
    
    res.json(recommendedJobs);
  } catch (error) {
    next(error);
  }
});

// Provide feedback on a job
router.post('/:id/feedback', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const jobId = parseInt(req.params.id);
    const { userId, feedbackType, reasons } = req.body;
    
    if (!userId || !feedbackType) {
      res.status(400).json({ error: 'userId and feedbackType are required' });
      return;
    }
    
    const job = await jobPostingRepo.getById(jobId);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    
    // Record feedback
    const feedback = await userJobFeedbackRepo.updateOrCreate(userId, jobId, {
      feedbackType: feedbackType as any,
      reasons: reasons || null,
      viewed: true
    });
    
    res.json(feedback);
  } catch (error) {
    next(error);
  }
});

// Get user's job feedback
router.get('/feedback/:userId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.params.userId;
    const feedbackType = req.query.type as string;
    
    const feedback = await userJobFeedbackRepo.getFeedbackWithJobDetails(userId, feedbackType);
    
    res.json(feedback);
  } catch (error) {
    next(error);
  }
});

export default router;
