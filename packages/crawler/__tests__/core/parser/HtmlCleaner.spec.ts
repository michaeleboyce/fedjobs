// packages/crawler/__tests__/core/parser/HtmlCleaner.spec.ts
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { HtmlCleaner } from '../../../src/core/parser/HtmlCleaner';

describe('HtmlCleaner', () => {
  let htmlCleaner: HtmlCleaner;

  beforeEach(() => {
    htmlCleaner = new HtmlCleaner();
    vi.clearAllMocks();
  });

  it('should remove scripts, styles, and non-content elements', () => {
    const html = `
      <html>
        <head>
          <script>alert('test');</script>
          <style>body { color: red; }</style>
        </head>
        <body>
          <div>This is <b>important</b> content</div>
          <script>console.log('should be removed');</script>
          <style>.hidden { display: none; }</style>
          <svg width="100" height="100"></svg>
        </body>
      </html>
    `;
    const result = htmlCleaner.cleanHtml(html);
    // We expect the text "This is important content" in that exact order
    expect(result).toContain('This is important content');
    expect(result).not.toContain('alert(\'test\')');
    expect(result).not.toContain('console.log');
    expect(result).not.toContain('color: red');
    expect(result).not.toContain('display: none');
  });

  it('should extract content from main content selectors if available', () => {
    const html = `
      <html>
        <body>
          <main>Main content here</main>
        </body>
      </html>
    `;
    const result = htmlCleaner.cleanHtml(html);
    expect(result).toContain('Main content here');
  });

  it('should fallback to body content if no main selectors are found', () => {
    const html = `
      <html>
        <body>
          <div>Body content without main tags</div>
        </body>
      </html>
    `;
    const result = htmlCleaner.cleanHtml(html);
    expect(result).toContain('Body content without main tags');
  });

  it('should handle empty or malformed HTML gracefully', () => {
    const emptyResult = htmlCleaner.cleanHtml('');
    expect(emptyResult).toBe('');

    const malformedResult = htmlCleaner.cleanHtml('<div>Unclosed div');
    expect(malformedResult).toBeTruthy();
  });

  describe('when cheerio fails', () => {
    // We do a local mock for cheerio in this "describe" so we can force load() to throw
    beforeAll(() => {
      vi.mock('cheerio', () => ({
        load: () => {
          throw new Error('Cheerio error');
        }
      }));
    });
    afterAll(() => {
      vi.unmock('cheerio');
    });

    it('should fallback to regex-based cleaning if cheerio fails', () => {
      const html = `
        <html>
          <body>
            <p>Test content</p>
            <script>alert('script');</script>
          </body>
        </html>
      `;
      const result = htmlCleaner.cleanHtml(html);
      expect(result).toContain('Test content');
      expect(result).not.toContain('alert(\'script\')');
    });
  });

  it('should clean up whitespace in the result', () => {
    const html = `
      <html>
        <body>
          <div>
            Multiple    spaces
            and
            line
            breaks
          </div>
        </body>
      </html>
    `;
    const result = htmlCleaner.cleanHtml(html);
    expect(result).toContain('Multiple spaces and line breaks');
    expect(result).not.toContain('    ');
  });

  it('should use fallback content extraction method for very short content', () => {
    const html = `
      <html>
        <body>
          <main>Short</main>
          <h1>Heading 1</h1>
          <p>Paragraph 1</p>
          <li>List item</li>
        </body>
      </html>
    `;
    const result = htmlCleaner.cleanHtml(html);
    // Even though <main> is "Short", the fallback should pick up other text
    expect(result).toContain('Heading 1');
    expect(result).toContain('Paragraph 1');
    expect(result).toContain('List item');
  });
});
