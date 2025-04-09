https://jobs.ashbyhq.com/openai/
https://job-boards.greenhouse.io/scaleai?offices%5B%5D=4001481005
https://jobs.eu.lever.co/refugeerights
https://job-boards.greenhouse.io/anthropic/jobs/4136347008
https://jobs.ashbyhq.com/cohere

# Job Board Integration

This module provides specialized support for crawling and parsing job board websites. It recognizes links to popular job board platforms (like Ashby, Greenhouse, and Lever) and uses specialized parsers to extract job data more accurately.

## Features

- Automatic detection of known job board URLs
- Specialized parsers for popular job board platforms
- Ability to add custom parsers for additional job boards
- Prioritization of job board links during crawling
- Automatic discovery of additional job board pages

## Supported Job Boards

Currently, the following job boards are supported out of the box:

- **Ashby** (`jobs.ashbyhq.com`)
- **Greenhouse** (`job-boards.greenhouse.io`, `boards.greenhouse.io`)
- **Lever** (`jobs.lever.co`, `jobs.eu.lever.co`)

## Usage

### Basic Usage

```typescript
import { createJobBoardCrawler } from '@fedjobs/crawler';

// Create a crawler instance with job board support
const crawler = createJobBoardCrawler();

// Crawl a website that links to job boards
await crawler.refreshJobSource(
  sourceId,
  {
    onJobFound: async (job) => {
      console.log(`Found job: ${job.title} at ${job.organization}`);
    },
    onComplete: async (jobs) => {
      console.log(`Found ${jobs.length} jobs in total`);
    }
  }
);
```

### Adding a Custom Job Board Parser

You can extend the system by creating parsers for additional job boards:

```typescript
import { 
  BaseJobBoardParser, 
  JobBoardParserOptions, 
  JobBoardParseResult,
  createJobBoardCrawler
} from '@fedjobs/crawler';

// Create a custom parser
class MyCustomJobBoardParser extends BaseJobBoardParser {
  constructor() {
    super('MyJobBoard');
  }
  
  canParse(url: string): boolean {
    return url.includes('myjobboard.com');
  }
  
  async parse(options: JobBoardParserOptions): Promise<JobBoardParseResult> {
    // Implement parsing logic for your job board
    // ...
  }
}

// Create a crawler with the custom parser
const crawler = createJobBoardCrawler({
  customParsers: [new MyCustomJobBoardParser()]
});
```

See the `custom-parser-template.ts` file for a more detailed example.

## How It Works

1. **Link Discovery**: The crawler identifies links to known job boards using domain patterns.

2. **Specialized Parsing**: When a job board page is encountered, the appropriate parser is used to extract job data.

3. **Additional URL Discovery**: After parsing a job board page, the system can discover additional related pages to crawl (e.g., finding the company's main job listings page from a specific job posting).

4. **Fallback Mechanism**: If specialized parsing fails, the system falls back to generic parsing methods.

## Architecture

- **`constants.ts`**: Defines known job board domains and patterns
- **`base-job-board-parser.ts`**: Base class for all job board parsers
- **`job-board-service.ts`**: Main service for coordinating parsing
- **`parsers/`**: Directory containing specialized parsers for each job board
- **`job-board-crawler-factory.ts`**: Factory function to create a crawler with job board support

## Adding Support for New Job Boards

To add support for a new job board:

1. Create a new parser class that extends `BaseJobBoardParser`
2. Implement the `canParse()` and `parse()` methods
3. Register your parser with the `JobBoardService`

## Advanced Configuration

The `createJobBoardCrawler` factory function accepts options to customize behavior:

```typescript
const crawler = createJobBoardCrawler({
  // Add custom parsers
  customParsers: [myParser1, myParser2],
  
  // Disable default parsers if you only want to use custom ones
  includeDefaultParsers: false,
  
  // Set logging level
  logLevel: Logger.LogLevel.DEBUG
});
```