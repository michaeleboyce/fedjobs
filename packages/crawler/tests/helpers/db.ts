// tests/helpers/db.ts
import { db, JobSourceRepository, JobPostingRepository } from '@fedjobs/database';

/**
 * Sets up a test database for integration testing
 */
export async function setupTestDb() {
  // This would normally initialize a test database
  console.log('Setting up test database');
  
  // For now, we'll rely on the existing database connections
  // In a real implementation, this would:
  // 1. Create a test database or schema
  // 2. Run migrations to set up the schema
  // 3. Seed with test data if needed
  
  // Wait a moment to ensure DB connection is established
  await new Promise(resolve => setTimeout(resolve, 100));
}

/**
 * Tears down the test database after tests complete
 */
export async function teardownTestDb() {
  // This would normally clean up the test database
  console.log('Tearing down test database');
  
  // For now, we're just a placeholder
  // In a real implementation, this would:
  // 1. Drop the test database or schema
  // 2. Close connections
  
  // Wait a moment to ensure connections are closed
  await new Promise(resolve => setTimeout(resolve, 100));
}

/**
 * Creates a test job source for testing
 * @returns The ID of the created job source
 */
export async function createTestJobSource() {
  const jobSourceRepo = new JobSourceRepository();
  
  const testSource = await jobSourceRepo.insert({
    userId: 'test-user',
    url: 'https://example.com/jobs',
    name: 'Test Job Source',
    keywords: 'software,engineering',
    status: 'ACTIVE',
    refreshFrequency: 'DAILY'
  });
  
  return testSource.id;
}

/**
 * Gets jobs stored for a specific source
 * @param sourceId The source ID to get jobs for
 * @returns Array of job posting records
 */
export async function getStoredJobs(sourceId: number) {
  const jobPostingRepo = new JobPostingRepository();
  return jobPostingRepo.getBySourceId(sourceId);
}