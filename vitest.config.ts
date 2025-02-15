import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // ... other config
    onConsoleLog(log) {
      if (log.includes('The `punycode` module is deprecated')) {
        return false;
      }
    },
  },
}); 