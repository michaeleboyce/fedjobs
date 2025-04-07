// packages/crawler/src/test/config.ts
import dotenv from 'dotenv';
import path from 'path';

/**
 * Configuration for integration tests
 */
export interface TestConfig {
  /** Use mock implementations instead of real ones */
  useMocks: boolean;
  /** Use real WebCrawler instead of mock */
  useRealCrawler: boolean;
  /** Use real JobParserService instead of mock */
  useRealParser: boolean;
  /** Use real database connections instead of mocks */
  useRealDatabase: boolean;
  /** Use real AI services instead of mocks */
  useRealAI: boolean;
  /** Default test timeout in milliseconds */
  timeout: number;
  /** Default test URL for crawling */
  defaultTestUrl: string;
}

/**
 * Get test configuration from environment variables
 */
export function getTestConfig(): TestConfig {
  // Load environment variables from .env.test if it exists
  dotenv.config({ 
    path: path.resolve(process.cwd(), '.env.test')
  });

  // Read config from environment or use defaults
  return {
    useMocks: process.env.USE_MOCKS !== 'false',
    useRealCrawler: process.env.USE_REAL_CRAWLER === 'true',
    useRealParser: process.env.USE_REAL_PARSER === 'true',
    useRealDatabase: process.env.USE_REAL_DATABASE === 'true',
    useRealAI: process.env.USE_REAL_AI === 'true',
    timeout: parseInt(process.env.TEST_TIMEOUT || '30000', 10),
    defaultTestUrl: process.env.TEST_URL || 'https://openai.com/careers/search/?l=6252b4ed-714d-469a-a970-7a13101bac9d'
  };
}

/**
 * Default test configuration
 */
export const DEFAULT_CONFIG: TestConfig = {
  useMocks: true,
  useRealCrawler: false,
  useRealParser: false,
  useRealDatabase: false,
  useRealAI: false,
  timeout: 30000,
  defaultTestUrl: 'https://openai.com/careers/search/?l=6252b4ed-714d-469a-a970-7a13101bac9d'
};