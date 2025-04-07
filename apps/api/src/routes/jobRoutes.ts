// apps/api/src/routes/jobRoutes.ts
import { Router } from 'express';
import { Services } from '../services';

/**
 * Create job source routes
 */
export function createJobRoutes(services: Services): Router {
  const router = Router();
  const { jobSourceController } = services;
  
  // Job source routes
  router.get('/job-sources', jobSourceController.getAllSources);
  router.get('/job-sources/:id', jobSourceController.getSourceById);
  router.post('/job-sources', jobSourceController.createSource);
  router.get('/job-sources/:id/jobs', jobSourceController.getJobsForSource);
  router.post('/job-sources/:id/refresh', jobSourceController.refreshSource);
  router.post('/job-sources/:id/cancel', jobSourceController.cancelRefresh);
  router.delete('/job-sources/:id', jobSourceController.deleteSource);
  
  // Scheduled refresh endpoint
  router.post('/job-sources/scheduled-refresh', (req, res, next) => {
    const { frequency = 'DAILY' } = req.body;
    
    // Start refresh process in the background
    services.jobSourceService.scheduleRefresh(frequency)
      .catch((error: Error) => console.error(`Error in scheduled refresh: ${error.message}`));
    
    res.json({ 
      message: `Scheduled job refresh started for frequency: ${frequency}`,
      status: 'STARTED'
    });
  });
  
  return router;
}