// packages/crawler/vitest.config.ts
import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv'
import path from 'path'

// 1) Load the root .env.local file (relative to this config file)
dotenv.config({
  path: path.resolve(__dirname, '../../.env.local'),
})
export default defineConfig({
  test: {
    // Example: Provide extra setup or coverage config
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        '__tests__/**'
      ],
      all: true
    },
    globals: true,
    // If your tests are in a specific folder:
    include: ['__tests__/**/*.spec.ts', '__tests__/**/*.integration.test.ts']
  }
});
