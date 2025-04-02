// tests/setup.ts
import { vi } from 'vitest';

// Mock external modules used in tests
vi.mock('crawlee', () => {
  // Create a mock PlaywrightCrawler with mockable methods
  const mockPlaywrightCrawler = vi.fn().mockImplementation(() => ({
    run: vi.fn().mockResolvedValue([]),
    stop: vi.fn().mockResolvedValue(undefined)
  }));

  return {
    PlaywrightCrawler: mockPlaywrightCrawler,
    LogLevel: {
      DEBUG: 'DEBUG',
      INFO: 'INFO',
      WARNING: 'WARNING', 
      ERROR: 'ERROR',
      OFF: 'OFF'
    },
    log: {
      setLevel: vi.fn()
    }
  };
});

// Mock database
vi.mock('@fedjobs/database', () => {
  return {
    GlobalSourceCacheRepository: vi.fn().mockImplementation(() => ({
      getByNormalizedUrl: vi.fn().mockResolvedValue(null),
      getById: vi.fn().mockResolvedValue(null),
      insert: vi.fn().mockImplementation(data => Promise.resolve({ ...data, id: 100 })),
      markRefreshed: vi.fn().mockResolvedValue([{ id: 100 }]),
      incrementUserCount: vi.fn().mockResolvedValue(undefined)
    })),
    JobSourceRepository: vi.fn().mockImplementation(() => ({
      getByGlobalCacheId: vi.fn().mockResolvedValue([
        { id: 1, url: 'https://example.com', lastScraped: new Date().toISOString() }
      ]),
      update: vi.fn().mockResolvedValue([{ id: 1 }]),
      getById: vi.fn().mockResolvedValue({ id: 1, name: 'Test', url: 'https://example.com' }),
      updateStatus: vi.fn().mockResolvedValue([{ id: 1 }])
    })),
    JobPostingRepository: vi.fn().mockImplementation(() => ({
      getBySourceId: vi.fn().mockResolvedValue([]),
      bulkInsert: vi.fn().mockImplementation(jobs => Promise.resolve(jobs.map((j: any, i: number) => ({ ...j, id: 200 + i })))),
      findByUrlAndSourceId: vi.fn().mockResolvedValue(null),
      findByTitleAndOrganization: vi.fn().mockResolvedValue(null),
      deactivateBySourceId: vi.fn().mockResolvedValue(undefined),
      insert: vi.fn().mockResolvedValue({ id: 123 }),
      update: vi.fn().mockResolvedValue([{ id: 123 }])
    })),
    // Mock the database connection
    neon: vi.fn().mockReturnValue({
      connect: vi.fn().mockResolvedValue({})
    }),
    db: {},
    drizzle: vi.fn().mockReturnValue({}),
    eq: vi.fn(),
    sql: { raw: vi.fn() },
    // Enums
    employmentType: {
      enumValues: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP', 'REMOTE', 'HYBRID', 'OTHER']
    },
    organizationType: {
      enumValues: ['GOVERNMENT', 'NONPROFIT', 'PRIVATE', 'PUBLIC', 'ACADEMIC', 'STARTUP', 'OTHER']
    }
  };
});

// Mock AI services
vi.mock('@fedjobs/utils', () => {
  return {
    UrlNormalizationService: vi.fn().mockImplementation(() => ({
      normalizeUrl: vi.fn(url => url.toLowerCase()),
      extractDomain: vi.fn(url => {
        try {
          return new URL(url).hostname;
        } catch (e) {
          return url.split('/')[2] || '';
        }
      })
    })),
    AIService: vi.fn().mockImplementation(() => ({
      generateText: vi.fn().mockResolvedValue('{"result": "success"}'),
      createStreamingResponse: vi.fn()
    })),
    Logger: vi.fn().mockImplementation((name) => ({
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      name
    }))
  };
});

// Mock node modules
vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue(''),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
  access: vi.fn().mockResolvedValue(undefined),
}));

// Set global timeout (increase for integration tests if needed)
vi.setConfig({
  testTimeout: 30000
});

// Override environment variables
process.env.GEMINI_API_KEY = 'test-key';
process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/testdb';

// Global console handling
global.console = {
  ...console,
  // Optionally silence console.log during tests
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};