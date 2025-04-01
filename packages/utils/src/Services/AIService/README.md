# AIService

A unified service for working with multiple AI providers (OpenAI and Anthropic) with a consistent interface.

## Features

- Text generation
- Streaming responses
- Structured output generation (JSON)
- Provider-specific optimizations
- Job posting parsing utilities
- Database integration examples

## Usage Examples

### Basic Text Generation

```typescript
import { aiService } from '@fedjobs/utils';

// Generate text with OpenAI
const openAIResponse = await aiService.generateText({
  model: 'gpt-4o',
  prompt: 'Explain quantum computing in simple terms',
  temperature: 0.7
});

// Generate text with Anthropic
const anthropicResponse = await aiService.generateText({
  model: 'claude-3-7-sonnet-20250219',
  prompt: 'Explain quantum computing in simple terms',
  temperature: 0.7
});
```

### Streaming Responses

```typescript
import { aiService } from '@fedjobs/utils';

// Create a streaming response
const streamingResponse = await aiService.createStreamingResponse({
  model: 'gpt-4o',
  prompt: 'Write a short story about a robot learning to paint',
  temperature: 0.8
});

// Process the stream
const reader = streamingResponse.stream.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  // Process each chunk of text
  const text = new TextDecoder().decode(value);
  console.log(text);
}

// Or get the complete response at the end
const fullText = streamingResponse.getFullCompletion();
```

### Structured Output (JSON)

```typescript
import { aiService } from '@fedjobs/utils';

// Define a schema for structured output
interface JobInfo {
  title: string;
  requirements: string[];
  employmentType: string;
  salaryRange: {
    min: number;
    max: number;
    currency: string;
  };
}

// Schema for the job information
const jobInfoSchema = {
  title: { type: 'string', description: 'Job title' },
  requirements: { 
    type: 'array', 
    items: { type: 'string' },
    description: 'List of job requirements'
  },
  employmentType: { 
    type: 'string', 
    enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'],
    description: 'Type of employment'
  },
  salaryRange: {
    type: 'object',
    properties: {
      min: { type: 'number' },
      max: { type: 'number' },
      currency: { type: 'string' }
    },
    required: ['min', 'max', 'currency'],
    description: 'Salary range information'
  }
};

// Get structured output from OpenAI
const openAIJobInfo = await aiService.generateStructuredOutput<JobInfo>({
  model: 'gpt-4o',
  prompt: 'Extract job information from this posting: "Senior Software Engineer needed at TechCorp. Must have 5+ years experience with React and Node.js. Full-time position with salary $120,000-$150,000 USD."',
  schema: jobInfoSchema
});

console.log(openAIJobInfo.data.title); // "Senior Software Engineer"
console.log(openAIJobInfo.data.salaryRange.min); // 120000

// Get structured output from Anthropic
const claudeJobInfo = await aiService.generateStructuredOutput<JobInfo>({
  model: 'claude-3-7-sonnet-20250219',
  prompt: 'Extract job information from this posting: "Senior Software Engineer needed at TechCorp. Must have 5+ years experience with React and Node.js. Full-time position with salary $120,000-$150,000 USD."',
  schema: jobInfoSchema,
  toolName: 'extract_job_info',
  toolDescription: 'Extract structured job information from a job posting text'
});

console.log(claudeJobInfo.data.title); // "Senior Software Engineer"
console.log(claudeJobInfo.data.salaryRange.min); // 120000
```

## Available Models

You can get a list of all available models with:

```typescript
const models = aiService.getAvailableModels();
console.log(models.openai); // OpenAI models
console.log(models.anthropic); // Anthropic models

// Filter models that support structured output
const structuredOutputModels = Object.values(models)
  .flat()
  .filter(model => model.supportsStructuredOutput);
```

## Implementation Details

- The service automatically determines which provider to use based on the model name
- For OpenAI, structured output is implemented using the `response_format` parameter
- For Anthropic, structured output is implemented using tool definitions
- The service validates that models support structured output before making API calls

## Job Posting Parsing

The AIService now includes utilities for parsing job posting text into structured data that aligns with the database schema.

### Basic Job Parsing

```typescript
import { parseJobPosting } from '@fedjobs/utils';

async function parseJob() {
  const jobText = `
    Senior Software Engineer
    TechInnovate Inc.
    
    Location: New York, NY
    Salary: $120,000 - $150,000
    
    We are seeking a Senior Software Engineer to join our team...
  `;
  
  const parsedJob = await parseJobPosting(jobText, {
    url: 'https://example.com/job/123'
  });
  
  console.log(parsedJob);
  // {
  //   title: 'Senior Software Engineer',
  //   organization: 'TechInnovate Inc.',
  //   location: 'New York, NY',
  //   salary: '$120,000 - $150,000',
  //   description: '...',
  //   ...
  // }
}
```

### Extracting Multiple Job Listings

```typescript
import { extractMultipleJobPostings } from '@fedjobs/utils';

async function parseJobsPage() {
  const pageText = `
    # Available Positions
    
    ## Software Engineer
    Full-time, New York
    
    ## UX Designer
    Full-time, Remote
  `;
  
  const jobs = await extractMultipleJobPostings(pageText, {
    url: 'https://example.com/careers',
    keywords: ['engineering', 'development']
  });
  
  console.log(`Found ${jobs.length} jobs`);
  jobs.forEach(job => console.log(job.title));
}
```

### Database Integration

The package includes examples of how to integrate with your database:

```typescript
import { parseAndCreateJobRecord } from '@fedjobs/utils';

async function saveJobToDatabase(jobText, sourceId) {
  const source = await getJobSource(sourceId);
  const jobRecord = await parseAndCreateJobRecord(jobText, source);
  
  // Save to database
  await jobRepository.create(jobRecord);
}
```

See the `examples` directory for more detailed examples:
- `job-parsing-example.ts` - Basic usage examples
- `job-database-integration.ts` - Integration with database models
- `structured-job-parsing.ts` - Using structured output directly