// File path: packages/utils/src/Services/AIService/examples/job-parsing-example.ts

import { parseJobPosting, extractMultipleJobPostings } from '../../../Parsers/JobPostingParser';

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
 * Example of a page with multiple job listings
 */
const exampleJobsPage = `
# TechInnovate Career Opportunities

We're growing fast and looking for talented individuals to join our team! 
Check out our current openings below:

## Senior Software Engineer
- Full-time
- New York, NY
- $120,000 - $150,000
- Work on our core platform using JavaScript, React, and Node.js
- 5+ years experience required

## UX/UI Designer 
- Full-time
- Remote
- $90,000 - $110,000
- Create beautiful user experiences for our products
- 3+ years of experience with design tools

## DevOps Engineer
- Contract
- San Francisco, CA
- $140,000 - $160,000
- Manage our cloud infrastructure and CI/CD pipelines
- Experience with AWS, Kubernetes, and Terraform required

## Marketing Specialist
- Part-time
- Chicago, IL
- $50,000 - $60,000 (pro-rated)
- Help grow our brand and acquire new customers
- Social media experience needed

All positions include health benefits, flexible PTO, and competitive compensation.
Apply today at careers.techinnovate.com or email jobs@techinnovate.com for more information.
`;

/**
 * Example function demonstrating how to use the job parser
 */
async function runJobParsingExample() {
  try {
    console.log('=== JOB POSTING PARSER EXAMPLE ===');
    console.log('\nParsing single job posting...');
    
    // Parse single job posting
    const jobData = await parseJobPosting(exampleJobPosting, {
      url: 'https://careers.techinnovate.com/senior-engineer'
    });
    
    console.log('\nParsed Job Information:');
    console.log('======================');
    console.log(`Title: ${jobData.title}`);
    console.log(`Organization: ${jobData.organization}`);
    console.log(`Location: ${jobData.location || 'Not specified'}`);
    console.log(`Type: ${jobData.type || 'Not specified'}`);
    
    if (jobData.salary) {
      console.log(`Salary: ${jobData.salary}`);
    }
    
    console.log('\nSkills:');
    if (jobData.skills && jobData.skills.length > 0) {
      jobData.skills.forEach(skill => console.log(`- ${skill}`));
    } else {
      console.log('- No skills specified');
    }
    
    console.log('\n\nExtracting multiple job postings from page...');
    
    // Extract multiple job postings
    const jobListings = await extractMultipleJobPostings(exampleJobsPage, {
      url: 'https://careers.techinnovate.com',
      keywords: ['engineer', 'developer']
    });
    
    console.log(`\nFound ${jobListings.length} job listings:`);
    console.log('===========================');
    
    jobListings.forEach((job, index) => {
      console.log(`\nJob #${index + 1}: ${job.title}`);
      console.log(`Organization: ${job.organization}`);
      console.log(`Type: ${job.type || 'Not specified'}`);
      console.log(`Location: ${job.location || 'Not specified'}`);
      console.log(`Salary: ${job.salary || 'Not specified'}`);
      console.log('---');
    });
    
    console.log('\nExample complete!');
  } catch (error) {
    console.error('Error running job parsing example:', error);
  }
}

// Export the example function
export { runJobParsingExample };

// Uncomment to run directly
// runJobParsingExample();