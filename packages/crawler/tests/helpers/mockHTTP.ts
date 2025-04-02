// tests/helpers/mockHTTP.ts
import { vi } from 'vitest';

/**
 * Sets up HTTP mocks for testing
 * These help by preventing actual HTTP requests during testing
 */
export function setupHTTPMocks() {
  // Mock fetch globally
  global.fetch = vi.fn().mockImplementation(async (url) => {
    if (url.toString().includes('example.com')) {
      return {
        ok: true,
        status: 200,
        text: async () => '<html><body><h1>Test Page</h1></body></html>',
        json: async () => ({ success: true }),
        headers: new Headers()
      };
    }
    
    // Return 404 for unknown URLs
    return {
      ok: false,
      status: 404,
      text: async () => 'Not Found',
      json: async () => ({ error: 'Not Found' }),
      headers: new Headers()
    };
  });
}

/**
 * Provides mock responses for specific URLs
 * @param url The URL being requested
 * @returns Mock HTML content for the URL
 */
export function getMockResponse(url: string): string {
  // Job list page
  if (url.includes('/jobs') && !url.includes('/jobs/')) {
    return `
      <html>
        <head>
          <title>Test Jobs</title>
          <meta name="description" content="Job listings">
        </head>
        <body>
          <h1>Available Jobs</h1>
          <div class="job-list">
            <div class="job-item">
              <h2><a href="/jobs/1">Software Engineer</a></h2>
              <div class="job-company">Test Company</div>
              <div class="job-location">Remote</div>
            </div>
            <div class="job-item">
              <h2><a href="/jobs/2">Product Manager</a></h2>
              <div class="job-company">Test Company</div>
              <div class="job-location">New York</div>
            </div>
            <div class="job-item">
              <h2><a href="/jobs/3">UX Designer</a></h2>
              <div class="job-company">Test Company</div>
              <div class="job-location">San Francisco</div>
            </div>
          </div>
        </body>
      </html>
    `;
  }
  
  // Specific job page
  if (url.includes('/jobs/1')) {
    return `
      <html>
        <head>
          <title>Software Engineer - Test Company</title>
          <meta name="description" content="Software Engineer job at Test Company">
        </head>
        <body>
          <h1>Software Engineer</h1>
          <div class="job-company">Test Company</div>
          <div class="job-location">Remote</div>
          <div class="job-type">Full-time</div>
          <div class="job-salary">$100,000 - $150,000</div>
          <div class="job-description">
            <p>We are looking for a software engineer to join our team.</p>
            <h3>Requirements:</h3>
            <ul>
              <li>3+ years of experience with JavaScript</li>
              <li>Experience with React and Node.js</li>
              <li>Experience with TypeScript</li>
            </ul>
            <h3>Benefits:</h3>
            <ul>
              <li>Remote work</li>
              <li>Flexible hours</li>
              <li>Health insurance</li>
            </ul>
          </div>
        </body>
      </html>
    `;
  }
  
  // Homepage
  if (url.includes('example.com') && !url.includes('/jobs')) {
    return `
      <html>
        <head>
          <title>Test Company</title>
          <meta name="description" content="Test Company Homepage">
        </head>
        <body>
          <h1>Welcome to Test Company</h1>
          <nav>
            <a href="/">Home</a>
            <a href="/jobs">Jobs</a>
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
          </nav>
          <div class="main-content">
            <p>We are a test company for crawler testing.</p>
          </div>
        </body>
      </html>
    `;
  }
  
  // Default for unknown pages
  return `
    <html>
      <head>
        <title>Page Not Found</title>
      </head>
      <body>
        <h1>404 Not Found</h1>
        <p>The page you are looking for does not exist.</p>
      </body>
    </html>
  `;
}