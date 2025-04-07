// packages/crawler/src/test/setup.ts
import { vi } from 'vitest';
import { AIService } from '@fedjobs/utils';
import { TestConfig } from './config';

/**
 * Set up the test environment based on configuration
 */
export async function setupTestEnvironment(config: TestConfig): Promise<void> {
  // Set test timeout
  vi.setConfig({ testTimeout: config.timeout });

  // Apply mocks if needed
  if (config.useMocks) {
    if (!config.useRealAI) {
      mockAIServices();
    }
    
    if (!config.useRealDatabase) {
      mockDatabaseServices();
    }
  } else {
    await setupRealDependencies(config);
  }
}

/**
 * Set up real dependencies for tests
 */
async function setupRealDependencies(config: TestConfig): Promise<void> {
  if (config.useRealDatabase) {
    // Verify database connection settings
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required for real database tests');
    }
    console.log('Using real database connection for tests');
  }
  
  if (config.useRealAI) {
    // Verify API keys
    if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
      throw new Error('Either ANTHROPIC_API_KEY or OPENAI_API_KEY is required for real AI tests');
    }
    console.log('Using real AI services for tests');
  }
  
  if (config.useRealCrawler) {
    // Verify Playwright dependencies
    try {
      // This would check if Playwright is available
      const { chromium } = await import('playwright');
      // Test browser launch capability
      const browser = await chromium.launch({ headless: true });
      await browser.close();
      console.log('Playwright is available for tests');
    } catch (error) {
      throw new Error('Playwright not properly installed. Run: npx playwright install chromium');
    }
  }
}

/**
 * Mock AI services
 */
function mockAIServices(): void {
  vi.mock('@fedjobs/utils', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@fedjobs/utils')>();
    
    // Override AIService class
    const MockAIService = vi.fn().mockImplementation(() => ({
      generateText: vi.fn().mockImplementation(async ({ prompt }) => {
        // Simple regex-based mock response generator
        if (prompt.includes('job listing')) {
          return JSON.stringify([
            {
              title: 'Software Engineer',
              organization: 'OpenAI',
              description: 'Join our team to build cutting-edge AI technology.',
              url: 'https://openai.com/careers/software-engineer',
              location: 'San Francisco, CA',
              employmentType: 'FULL_TIME'
            }
          ]);
        }
        
        // Default empty response
        return JSON.stringify([]);
      })
    }));
    
    return {
      ...actual,
      AIService: MockAIService
    };
  });
}

/**
 * Mock database services
 */
function mockDatabaseServices(): void {
  vi.mock('@fedjobs/database', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@fedjobs/database')>();
    
    // Mock repository classes
    const mockJobSourceRepo = {
      getById: vi.fn(),
      updateStatus: vi.fn(),
      getSourcesForFrequency: vi.fn(),
      update: vi.fn()
    };
    
    const mockJobPostingRepo = {
      insert: vi.fn(),
      update: vi.fn(),
      deactivateBySourceId: vi.fn(),
      getBySourceId: vi.fn(),
      getJobCountsBySourceIds: vi.fn(),
      findByUrlAndSourceId: vi.fn(),
      findByTitleAndOrganization: vi.fn()
    };
    
    // Set up mock implementations
    mockJobSourceRepo.getById.mockImplementation((id) => ({
      id,
      name: 'Mock Source',
      url: 'https://openai.com/careers',
      keywords: 'ai, machine learning',
      status: 'ACTIVE'
    }));
    
    // Return the mocked module
    return {
      ...actual,
      JobSourceRepository: vi.fn().mockImplementation(() => mockJobSourceRepo),
      JobPostingRepository: vi.fn().mockImplementation(() => mockJobPostingRepo)
    };
  });
}

/**
 * Clean up the test environment
 */
export async function cleanupTestEnvironment(config: TestConfig): Promise<void> {
  // Reset mocks
  vi.resetAllMocks();
  
  // Clean up real connections if used
  if (!config.useMocks && config.useRealDatabase) {
    // Close database connections
    console.log('Cleaning up real database connections');
  }
}