// packages/crawler/__tests__/integration/test-data.ts
import { JobPostingData } from '../../src/types';

/**
 * Mock job site for testing
 */
export const mockJobSite = {
  url: 'https://example.com/careers',
  title: 'Careers at Example Company',
  description: 'Find your next career opportunity at Example Company',
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Careers at Example Company</title>
      <meta name="description" content="Find your next career opportunity at Example Company">
    </head>
    <body>
      <h1>Careers at Example Company</h1>
      <div class="job-listings">
        <div class="job">
          <h3>Software Engineer</h3>
          <p>We're looking for a talented software engineer to join our team</p>
          <a href="/careers/software-engineer">Apply Now</a>
        </div>
        <div class="job">
          <h3>Product Manager</h3>
          <p>Lead product development for our exciting new projects</p>
          <a href="/careers/product-manager">Apply Now</a>
        </div>
        <div class="job">
          <h3>UX Designer</h3>
          <p>Create amazing user experiences for our products</p>
          <a href="/careers/ux-designer">Apply Now</a>
        </div>
      </div>
    </body>
    </html>
  `
};

/**
 * Mock job postings data for testing
 */
export const mockJobPostings: JobPostingData[] = [
  {
    title: 'Software Engineer',
    organization: 'Example Company',
    description: 'We\'re looking for a talented software engineer to join our team. You\'ll be working on cutting-edge technology and solving complex problems.',
    url: 'https://example.com/careers/software-engineer',
    location: 'Remote',
    employmentType: 'FULL_TIME',
    skills: ['JavaScript', 'TypeScript', 'React'],
    dateScraped: new Date()
  },
  {
    title: 'Product Manager',
    organization: 'Example Company',
    description: 'Lead product development for our exciting new projects. You\'ll work closely with engineering, design, and marketing teams to deliver great products.',
    url: 'https://example.com/careers/product-manager',
    location: 'San Francisco, CA',
    employmentType: 'FULL_TIME',
    skills: ['Product Management', 'Agile', 'User Research'],
    dateScraped: new Date()
  },
  {
    title: 'UX Designer',
    organization: 'Example Company',
    description: 'Create amazing user experiences for our products. You\'ll be responsible for UI design, user research, and prototyping.',
    url: 'https://example.com/careers/ux-designer',
    location: 'New York, NY',
    employmentType: 'CONTRACT',
    skills: ['UI Design', 'User Research', 'Figma'],
    dateScraped: new Date()
  }
];

/**
 * Mock OpenAI job listings data parsed from real content
 * Based on the provided OpenAI careers page content
 */
export const mockOpenAIJobs: JobPostingData[] = [
  {
    title: 'Engagement Manager, Government and Public Sector - Washington, DC',
    organization: 'OpenAI',
    description: 'Join OpenAI\'s Government and Public Sector team to manage client engagements and drive successful implementations.',
    url: 'https://openai.com/careers/engagement-manager-government-and-public-sector',
    location: 'Washington, DC',
    employmentType: 'FULL_TIME',
    dateScraped: new Date()
  },
  {
    title: 'Forward Deployed Security Engineer, Public Sector',
    organization: 'OpenAI',
    description: 'Join OpenAI\'s Security team to ensure the security of our public sector deployments.',
    url: 'https://openai.com/careers/forward-deployed-security-engineer-public-sector',
    location: 'Washington, DC',
    employmentType: 'FULL_TIME',
    dateScraped: new Date()
  },
  {
    title: 'Forward Deployed Software Engineer, Public Sector',
    organization: 'OpenAI',
    description: 'Join OpenAI\'s Applied AI Engineering team to deploy and customize our AI solutions for public sector clients.',
    url: 'https://openai.com/careers/forward-deployed-software-engineer-public-sector',
    location: 'Multiple Locations',
    employmentType: 'FULL_TIME',
    dateScraped: new Date()
  },
  {
    title: 'Full-Stack Engineer, Public Sector',
    organization: 'OpenAI',
    description: 'Join OpenAI\'s Applied AI team to build full-stack applications for public sector clients.',
    url: 'https://openai.com/careers/full-stack-engineer-public-sector',
    location: 'Multiple Locations',
    employmentType: 'FULL_TIME',
    dateScraped: new Date()
  },
  {
    title: 'Information Systems Security Engineer, Public Sector',
    organization: 'OpenAI',
    description: 'Join OpenAI\'s Security team to implement and maintain security systems for public sector deployments.',
    url: 'https://openai.com/careers/information-systems-security-engineer-public-sector',
    location: 'Washington, DC',
    employmentType: 'FULL_TIME',
    dateScraped: new Date()
  }
];

/**
 * Mock content for testing crawler on real site structures
 * Simplified version of the actual OpenAI careers page
 */
export const mockOpenAIContent = {
  url: 'https://openai.com/careers',
  title: 'Careers at OpenAI',
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>OpenAI Careers</title>
      <meta name="description" content="Careers at OpenAI">
    </head>
    <body>
      <div class="main-content">
        <h1>Careers at OpenAI</h1>
        <div class="job-listings">
          <div class="job">
            <h3>Engagement Manager, Government and Public Sector - Washington, DC</h3>
            <p>Customer Success</p>
            <p>Washington, DC</p>
            <a href="/careers/engagement-manager-government-and-public-sector">Apply now</a>
          </div>
          <div class="job">
            <h3>Forward Deployed Security Engineer, Public Sector</h3>
            <p>Security</p>
            <p>Washington, DC</p>
            <a href="/careers/forward-deployed-security-engineer-public-sector">Apply now</a>
          </div>
          <div class="job">
            <h3>Forward Deployed Software Engineer, Public Sector</h3>
            <p>Applied AI Engineering</p>
            <p>2 locations</p>
            <a href="/careers/forward-deployed-software-engineer-public-sector">Apply now</a>
          </div>
          <div class="job">
            <h3>Full-Stack Engineer, Public Sector</h3>
            <p>Applied AI</p>
            <p>2 locations</p>
            <a href="/careers/full-stack-engineer-public-sector">Apply now</a>
          </div>
          <div class="job">
            <h3>Information Systems Security Engineer, Public Sector</h3>
            <p>Security</p>
            <p>Washington, DC</p>
            <a href="/careers/information-systems-security-engineer-public-sector">Apply now</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
};