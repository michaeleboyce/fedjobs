# @fedjobs/crawler

This package contains the web crawler implementation for scraping job data from various sources.

## Features

- Modular crawler architecture with support for multiple sources
- Caching mechanism to avoid duplicate scraping
- Job post detection and validation
- HTML parsing and content extraction
- Integration with AI services for enhanced content analysis

## Development

### Prerequisites

- Node.js 18+
- Package manager (npm/yarn/pnpm)

### Setup

```bash
# Install dependencies (from the monorepo root)
pnpm install
```

### Building

```bash
# Build the package
pnpm run build

# Watch mode for development
pnpm run dev
```

## Testing

The package includes comprehensive tests using Vitest. Tests are separated into unit tests and integration tests.

### Unit Tests

These tests focus on individual components and use mocks for dependencies:

```bash
# Run unit tests
pnpm test

# Run unit tests in watch mode
pnpm test:watch

# Run unit tests with verbose output
pnpm test:verbose
```

### Integration Tests

These tests validate the crawler with real or mock external services:

```bash
# Run integration tests with mocks
pnpm test:integration

# Run integration tests with real connections
pnpm test:integration:real

# Run specific OpenAI integration tests
pnpm test:integration:openai
```

### Running All Tests

To run both unit and integration tests:

```bash
# Run all tests (unit and integration)
pnpm test:all
```

### Code Coverage

Code coverage reports are generated using the v8 provider integrated with Vitest. To run unit tests with coverage reporting:

```bash
# Run unit tests with coverage
pnpm test:coverage

# Run unit tests with coverage in watch mode
pnpm test:coverage:watch
```

After running the coverage tests, reports are available in the following formats:

- **Text:** Command line summary of coverage
- **HTML:** Interactive report at `./coverage/index.html`
- **JSON:** Raw data at `./coverage/coverage-final.json`

To view the HTML coverage report:

```bash
# Open coverage report in browser
pnpm open:coverage
```

## Architecture

The crawler is built using a modular architecture with the following components:

1. **WebCrawler:** Core crawling implementation using Playwright
2. **JobParserService:** Extracts job data from HTML content
3. **JobProcessor:** Processes and validates extracted job data
4. **ScraperService:** Orchestrates the crawling process

## Configuration

The crawler can be configured with different settings to control crawl behavior:

- Max pages per domain
- Max depth
- Crawl strategies
- Concurrency
- Navigation timeouts 