// tests/helpers/mockPlaywright.ts
import { vi } from 'vitest';

/**
 * Creates a mock Playwright page for testing crawler functionality
 * @param url The URL to mock
 * @returns A mock Playwright page object
 */
export function createMockPlaywrightPage(url: string) {
  // Create mock HTML based on the URL
  let mockHtml = '<html><body>';
  
  if (url.includes('jobs') || url.includes('careers')) {
    mockHtml += `
      <header>
        <h1>Test Jobs</h1>
      </header>
      <main>
        <div class="job-listing">
          <h2>Software Engineer</h2>
          <div class="company">TestCorp</div>
          <div class="location">Remote</div>
          <div class="description">
            <p>This is a test job description.</p>
            <p>Requirements: JavaScript, React, TypeScript</p>
          </div>
          <a href="/jobs/123">View Details</a>
        </div>
      </main>
    `;
  } else {
    mockHtml += `
      <header>
        <h1>Test Website</h1>
      </header>
      <main>
        <p>Regular page content</p>
        <nav>
          <a href="/jobs">View Jobs</a>
          <a href="/about">About Us</a>
        </nav>
      </main>
    `;
  }
  
  mockHtml += '</body></html>';
  
  // Create mock page object
  return {
    content: vi.fn().mockResolvedValue(mockHtml),
    title: vi.fn().mockResolvedValue('Test Page Title'),
    url: vi.fn().mockReturnValue(url),
    goto: vi.fn().mockResolvedValue(undefined),
    $: vi.fn().mockImplementation((selector) => {
      if (selector === 'title') {
        return { textContent: vi.fn().mockResolvedValue('Test Page Title') };
      }
      if (selector === 'meta[name="description"]') {
        return { content: vi.fn().mockResolvedValue('Test description') };
      }
      return null;
    }),
    $$: vi.fn().mockImplementation((selector) => {
      if (selector === 'a') {
        return [
          {
            getAttribute: vi.fn().mockImplementation((attr) => {
              if (attr === 'href') return '/jobs/123';
              if (attr === 'title') return 'View Job';
              return null;
            }),
            textContent: vi.fn().mockResolvedValue('Software Engineer')
          },
          {
            getAttribute: vi.fn().mockImplementation((attr) => {
              if (attr === 'href') return '/about';
              return null;
            }),
            textContent: vi.fn().mockResolvedValue('About Us')
          }
        ];
      }
      return [];
    }),
    evaluate: vi.fn().mockImplementation((fn) => {
      // Simulated DOM extraction
      return {
        title: 'Test Page Title',
        description: 'Test description',
        links: [
          { href: '/jobs/123', text: 'Software Engineer', title: 'View Job', aria: '' },
          { href: '/about', text: 'About Us', title: '', aria: '' }
        ]
      };
    })
  };
}