// File path: packages/utils/src/Services/AIService/examples/structured-job-parsing.ts

import { aiService } from '../index';

/**
 * Interface representing the structure of a parsed job posting
 */
interface JobPosting {
  title: string;
  company: string;
  location: string;
  salary?: {
    min: number;
    max: number;
    currency: string;
  };
  isRemote: boolean;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP';
  description?: string;
  responsibilities: string[];
  requirements: string[];
  benefits?: string[];
  applicationUrl?: string;
  contactEmail?: string;
  postedDate?: string;
}

/**
 * Schema for the job posting
 */
const jobPostingSchema = {
  title: { 
    type: 'string', 
    description: 'The title of the job position' 
  },
  company: { 
    type: 'string', 
    description: 'The name of the company offering the job' 
  },
  location: { 
    type: 'string', 
    description: 'The location where the job is based' 
  },
  salary: { 
    type: 'object',
    description: 'Salary information if provided',
    properties: {
      min: { type: 'number', description: 'Minimum salary amount' },
      max: { type: 'number', description: 'Maximum salary amount' },
      currency: { type: 'string', description: 'Currency code e.g., USD' }
    },
    required: ['min', 'max', 'currency']
  },
  isRemote: { 
    type: 'boolean', 
    description: 'Whether the job is remote or not' 
  },
  employmentType: { 
    type: 'string',
    enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'],
    description: 'Type of employment offered'
  },
  description: { 
    type: 'string', 
    description: 'General description of the job position' 
  },
  responsibilities: { 
    type: 'array',
    items: { type: 'string' },
    description: 'List of responsibilities for the role'
  },
  requirements: { 
    type: 'array',
    items: { type: 'string' },
    description: 'List of requirements or qualifications needed'
  },
  benefits: { 
    type: 'array',
    items: { type: 'string' },
    description: 'List of benefits offered with the position' 
  },
  applicationUrl: { 
    type: 'string', 
    description: 'URL where candidates can apply' 
  },
  contactEmail: { 
    type: 'string', 
    description: 'Email address for inquiries about the position' 
  },
  postedDate: { 
    type: 'string', 
    description: 'Date when the job was posted, in ISO format if possible' 
  }
};

/**
 * Example job posting text
 */
const exampleJobPosting = `
# Senior Software Engineer

## Company: TechInnovate Inc.

**Location:** New York, NY (Hybrid - 3 days in office)
**Salary:** $120,000 - $150,000 USD annually
**Type:** Full-time

### Job Description
TechInnovate is seeking a Senior Software Engineer to join our growing team. The ideal candidate will have strong experience with modern web technologies and a passion for building scalable, high-performance applications.

### Responsibilities:
- Design and implement new features for our core platform
- Work with product and design teams to translate requirements into technical solutions
- Mentor junior developers and conduct code reviews
- Optimize application performance and improve code quality
- Troubleshoot and fix bugs in existing systems

### Requirements:
- 5+ years of professional software engineering experience
- Strong proficiency in JavaScript/TypeScript and React
- Experience with Node.js backend development
- Working knowledge of SQL and NoSQL databases
- Familiarity with CI/CD pipelines and deployment processes
- Bachelor's degree in Computer Science or equivalent experience

### Benefits:
- Comprehensive health, dental, and vision insurance
- 401(k) matching program
- Flexible PTO policy
- Professional development budget
- Home office stipend
- Catered lunches when in-office

### Apply at: careers.techinnovate.com/senior-engineer
### Contact: jobs@techinnovate.com

Posted: March 15, 2024
`;

/**
 * Example function to parse a job posting
 */
async function parseJobPosting(jobText: string): Promise<JobPosting> {
  const prompt = `
Parse the following job posting and extract all relevant information into a structured format.
Extract as much detail as possible, including title, company, location, salary, job type, 
responsibilities, requirements, benefits, and any other information provided.

Here's the job posting to parse:

${jobText}
  `;
  
  // Choose the model based on your needs
  const model = 'gpt-4o'; // or 'claude-3-7-sonnet-20250219'
  
  // Parse using structured output
  const result = await aiService.generateStructuredOutput<JobPosting>({
    model,
    prompt,
    schema: jobPostingSchema,
    toolName: 'parse_job_posting',
    toolDescription: 'Parse a job posting text into a structured format with all details organized into appropriate fields'
  });
  
  return result.data;
}

/**
 * Example of how to use the job parser
 */
async function main() {
  try {
    console.log('Parsing job posting...');
    const jobData = await parseJobPosting(exampleJobPosting);
    
    console.log('\nParsed Job Information:');
    console.log('======================');
    console.log(`Title: ${jobData.title}`);
    console.log(`Company: ${jobData.company}`);
    console.log(`Location: ${jobData.location}`);
    console.log(`Remote: ${jobData.isRemote ? 'Yes' : 'No'}`);
    console.log(`Employment Type: ${jobData.employmentType}`);
    
    if (jobData.salary) {
      console.log(`Salary: ${jobData.salary.min.toLocaleString()} - ${jobData.salary.max.toLocaleString()} ${jobData.salary.currency}`);
    }
    
    console.log('\nResponsibilities:');
    jobData.responsibilities.forEach(r => console.log(`- ${r}`));
    
    console.log('\nRequirements:');
    jobData.requirements.forEach(r => console.log(`- ${r}`));
    
    if (jobData.benefits && jobData.benefits.length > 0) {
      console.log('\nBenefits:');
      jobData.benefits.forEach(b => console.log(`- ${b}`));
    }
    
    if (jobData.applicationUrl) {
      console.log(`\nApplication URL: ${jobData.applicationUrl}`);
    }
    
    if (jobData.contactEmail) {
      console.log(`Contact: ${jobData.contactEmail}`);
    }
    
    if (jobData.postedDate) {
      console.log(`Posted Date: ${jobData.postedDate}`);
    }
  } catch (error) {
    console.error('Error parsing job posting:', error);
  }
}

// Run the example (uncomment to execute)
// main();

export { parseJobPosting, jobPostingSchema };
export type { JobPosting };