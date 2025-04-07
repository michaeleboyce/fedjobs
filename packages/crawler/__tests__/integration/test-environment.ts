// packages/crawler/__tests__/integration/test-environment.ts
import { vi } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';

/**
 * Configuration for the integration tests
 */
export interface TestConfig {
  // Use mocks or real implementations
  useMocks: boolean;
  // Use real crawler (but possibly mocked repositories)
  useRealCrawler: boolean;
  // Use real parser (but possibly mocked repositories)
  useRealParser: boolean;
  // Use real database connection
  useRealDatabase: boolean;
  // Use real AI service
  useRealAI: boolean;
  // Timeout for tests in ms
  timeout: number;
}

/**
 * Get test configuration from environment variables or command line args
 */
export function getTestConfig(): TestConfig {
  // Load environment variables from .env.test file if it exists
  dotenv.config({ 
    path: path.resolve(__dirname, '../../../../.env.test') 
  });

  // Read config from environment or use defaults
  const useMocks = process.env.USE_MOCKS !== 'false';
  const useRealCrawler = process.env.USE_REAL_CRAWLER === 'true';
  const useRealParser = process.env.USE_REAL_PARSER === 'true';
  const useRealDatabase = process.env.USE_REAL_DATABASE === 'true';
  const useRealAI = process.env.USE_REAL_AI === 'true';
  const timeout = parseInt(process.env.TEST_TIMEOUT || '30000', 10);

  return {
    useMocks,
    useRealCrawler,
    useRealParser,
    useRealDatabase,
    useRealAI,
    timeout
  };
}

/**
 * Set up the test environment
 */
export async function createTestEnvironment(config: TestConfig): Promise<void> {
  // Set longer timeout for tests if needed
  vi.setConfig({ testTimeout: config.timeout });

  if (!config.useMocks) {
    // If using real implementations, setup necessary connections
    if (config.useRealDatabase) {
      // Set up a test database connection
      // This would initialize a connection to a test database
      console.log('Setting up real database connection for tests');
      // Initialize the database (could be in-memory for tests)
    }
    
    if (config.useRealAI) {
      // Verify AI service API keys are available
      if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
        throw new Error('AI service API keys not found in environment for tests');
      }
    }
    
    if (config.useRealCrawler) {
      // Verify Playwright is installed
      try {
        // This would check if Playwright is available
        console.log('Checking Playwright availability for tests');
      } catch (error) {
        throw new Error('Playwright not found. Run: npx playwright install chromium');
      }
    }
  } else {
    // Using mocks, ensure the necessary mocks are in place
    console.log('Setting up mocked environment for tests');
    
    // Apply global mocks if needed
    if (!config.useRealAI) {
      // Mock the AI services globally
      vi.mock('@fedjobs/utils', async (importOriginal) => {
        const actual = await importOriginal<typeof import('@fedjobs/utils')>();
        return {
          ...actual,
          AIService: vi.fn().mockImplementation(() => ({
            generateText: vi.fn().mockResolvedValue(
              JSON.stringify({ results: [] })
            )
          }))
        };
      });
    }
    
    if (!config.useRealDatabase) {
      // Mock database repositories globally
      vi.mock('@fedjobs/database', async (importOriginal) => {
        const actual = await importOriginal<typeof import('@fedjobs/database')>();
        return {
          ...actual,
          // Mock repository classes as needed
        };
      });
    }
  }
}

/**
 * Clean up the test environment
 */
export async function cleanupTestEnvironment(): Promise<void> {
  // Clean up any resources created during tests
  
  // If using a real database, disconnect or clean up data
  try {
    // Disconnect from test database or clean up test data
    console.log('Cleaning up test environment');
  } catch (error) {
    console.error('Error during test environment cleanup:', error);
  }
  
  // Reset any global mocks
  vi.resetAllMocks();
}