// packages/crawler/vitest.config.ts
import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env files
dotenv.config({
  path: path.resolve(__dirname, '../../.env.local'),
});

// Load test-specific env vars if they exist
dotenv.config({
  path: path.resolve(__dirname, '../../.env.test'),
});

export default defineConfig({
  test: {
    // Global test configuration
    globals: true,
    
    // Default timeout but can be overridden by TEST_TIMEOUT env var
    testTimeout: parseInt(process.env.TEST_TIMEOUT || '30000', 10),
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        'src/test/**'
      ],
      all: true
    },
    
    // Environment variables to pass to tests
    env: {
      USE_MOCKS: process.env.USE_MOCKS || 'true',
      USE_REAL_CRAWLER: process.env.USE_REAL_CRAWLER || 'false',
      USE_REAL_PARSER: process.env.USE_REAL_PARSER || 'false',
      USE_REAL_DATABASE: process.env.USE_REAL_DATABASE || 'false',
      USE_REAL_AI: process.env.USE_REAL_AI || 'false',
      TEST_URL: process.env.TEST_URL || 'https://openai.com/careers/search/?l=6252b4ed-714d-469a-a970-7a13101bac9d',
      INTEGRATION_TEST_MODE: process.env.INTEGRATION_TEST_MODE || 'mock'
    }
  },
});