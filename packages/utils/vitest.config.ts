import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['**/node_modules/**'],
    environment: 'node',
    coverage: {
      reporter: ['text', 'lcov'],
      exclude: ['**/node_modules/**', '**/tests/**'],
    },
  },
});