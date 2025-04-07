// File path: packages/crawler/src/github-actions/refresh-popular-job-sources.ts
// packages/crawler/src/github-actions/refresh-popular-job-sources.ts
import { config } from 'dotenv';
import { ScraperService } from '../services/scraper.service';
import { JobSourceRepository, JobPostingRepository } from '@fedjobs/database';
import { CacheService } from '../services/cache.service';
import { JobPostingProcessor } from '../domain/job-posting.processor';
import { JobSourceService } from '../services/job-source.service';
import { JobPostingValidator } from '../domain/job-posting.validator';
import { DuplicateDetector } from '../domain/duplicate.detector';

// Load environment variables
config();

/**
 * Gets popular job sources based on usage metrics
 */
async function getPopularJobSources() {
  const jobSourceRepo = new JobSourceRepository();
  
  // Get sources due for refresh based on their refresh frequency
  // This returns sources that haven't been refreshed recently and are due for a refresh
  const dailySources = await jobSourceRepo.getSourcesForScheduledRefresh('DAILY');
  const weeklySources = await jobSourceRepo.getSourcesForScheduledRefresh('WEEKLY');
  
  // Combine and prioritize sources
  return [...dailySources, ...weeklySources];
}

/**
 * Main function to refresh popular job sources
 */
async function refreshPopularJobSources() {
  console.log('[GitHubAction] Starting job source refresh');
  
  try {
    // Get list of sources to refresh
    const popularSources = await getPopularJobSources();
    console.log(`[GitHubAction] Found ${popularSources.length} sources to refresh`);
    
    if (popularSources.length === 0) {
      console.log('[GitHubAction] No sources to refresh at this time');
      return;
    }
    
    // Create service to handle refreshes
    const jobSourceRepo = new JobSourceRepository();
    const jobPostingRepo = new JobPostingRepository();
    const jobSourceService = new JobSourceService(jobSourceRepo, jobPostingRepo);
    const cacheService = new CacheService();
    const validator = new JobPostingValidator();
    const duplicateDetector = new DuplicateDetector(jobPostingRepo);
    const jobPostingProcessor = new JobPostingProcessor(
      jobPostingRepo,
      validator,
      duplicateDetector
    );
    const jobScraperService = new ScraperService(
      jobSourceService,
      cacheService,
      jobPostingProcessor
    );
    
    // Process sources with basic rate limiting
    let refreshedCount = 0;
    let errorCount = 0;
    
    for (const source of popularSources) {
      try {
        console.log(`[GitHubAction] Refreshing source ${source.id}: ${source.name} (${source.url})`);
        
        const result = await jobScraperService.refreshJobSource(source.id);
        
        if (result.error) {
          console.error(`[GitHubAction] Error refreshing source ${source.id}:`, result.error);
          errorCount++;
        } else {
          console.log(`[GitHubAction] Successfully refreshed source ${source.id}, found ${result.jobsFound} jobs`);
          refreshedCount++;
        }
        
        // Add a small delay between sources to avoid hammering resources
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`[GitHubAction] Exception refreshing source ${source.id}:`, error);
        errorCount++;
      }
    }
    
    console.log(`[GitHubAction] Job source refresh complete`);
    console.log(`[GitHubAction] Summary: ${refreshedCount} sources refreshed successfully, ${errorCount} errors`);
  } catch (error) {
    console.error('[GitHubAction] Unhandled error in source refresh:', error);
    process.exit(1);
  }
}

// Run the script
refreshPopularJobSources()
  .then(() => {
    console.log('[GitHubAction] Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('[GitHubAction] Script failed with error:', error);
    process.exit(1);
  });