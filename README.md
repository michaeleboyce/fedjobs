# FedJobs Monorepo

This is a monorepo for the FedJobs application, containing all packages and services.

Railway Project: https://railway.app/project/f8e88963-3c84-4bc3-99e9-3aff0a58ff0f

## Structure

This repository is structured as a monorepo using [Turborepo](https://turbo.build/repo) for managing multiple packages.

### Packages

- **@fedjobs/crawler**: Web crawler for scraping job listings
- **@fedjobs/database**: Database access layer
- **@fedjobs/types**: Shared TypeScript types
- **@fedjobs/utils**: Shared utilities

### Apps

- **web**: Web application (Next.js)

## Development

### Prerequisites

- Node.js 18+
- pnpm
- Docker (for local database)

### Setup

```bash
# Install dependencies
pnpm install
```

### Building

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @fedjobs/crawler build
```

## Testing

Tests are implemented using Vitest. You can run tests for all packages or for specific packages:

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter @fedjobs/crawler test
```

### Code Coverage

Code coverage reporting is set up for the crawler package. You can run tests with coverage:

```bash
# Run tests with coverage
pnpm --filter @fedjobs/crawler test:coverage

# Open coverage report in browser
pnpm --filter @fedjobs/crawler open:coverage
```

Coverage reports are also automatically generated in CI workflows and uploaded to Codecov.

## CI/CD

The repository uses GitHub Actions for CI/CD:

- **crawler-tests.yml**: Runs tests for the crawler package with coverage reporting
- **refresh-job-sources.yml**: Scheduled job to refresh job sources
- **fly-deploy.yml**: Deploys the web application
