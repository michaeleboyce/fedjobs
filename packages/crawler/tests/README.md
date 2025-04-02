# Crawler Testing Suite

This directory contains comprehensive tests for the crawler package.

## Test Structure

- **Unit Tests**: Test individual components in isolation with mocked dependencies
- **Integration Tests**: Test integration between components with real dependencies
- **Performance Tests**: Test performance characteristics of the crawler

## Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run performance tests (only in CI environment)
PERF_TEST=true npm run test:performance

# Generate test coverage report
npm run test:coverage
```

## Test Directories

- `/tests/unit/`: Unit tests for individual components
- `/tests/integration/`: Integration tests 
- `/tests/performance/`: Performance tests
- `/tests/helpers/`: Helper functions and mock implementations for testing

## Testing Principles

1. **Isolation**: Unit tests should isolate the component being tested by mocking dependencies
2. **Coverage**: Tests should aim for high code coverage
3. **Edge Cases**: Tests should cover edge cases and error handling
4. **Performance**: Performance tests should verify the system performs efficiently

## Helper Modules

- `db.ts`: Database test setup and helpers
- `mockPlaywright.ts`: Mock implementations for Playwright browser automation
- `mockHTTP.ts`: Mock HTTP responses

## Adding New Tests

When adding new tests, follow these guidelines:

1. Place tests in the appropriate directory based on test type
2. Use clear, descriptive test names
3. Follow the AAA pattern (Arrange, Act, Assert)
4. Mock external dependencies appropriately
5. Clean up after tests to avoid side effects

## Test Environment

Tests use Vitest as the test runner. The environment is configured in `vitest.config.ts`.

Global setup and teardown logic is in `tests/setup.ts`.