// File path: packages/crawler/__tests__/core/crawler/PageHandler.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { PageHandler } from '../../../src/core/crawler/PageHandler';

describe('PageHandler', () => {
  it('should setup page with viewport and wait states', async () => {
    const mockPage = {
      setViewportSize: vi.fn(),
      waitForLoadState: vi.fn(),
      waitForTimeout: vi.fn()
    };

    const handler = new PageHandler();
    await handler.setupPage(mockPage);

    expect(mockPage.setViewportSize).toHaveBeenCalledWith({ width: 1280, height: 800 });
    expect(mockPage.waitForLoadState).toHaveBeenCalledWith('domcontentloaded');
    expect(mockPage.waitForTimeout).toHaveBeenCalledWith(2000);
    // We also expect a call to waitForLoadState('networkidle'), but that might have thrown, so we can check:
    expect(mockPage.waitForLoadState).toHaveBeenCalledWith('networkidle', { timeout: 10000 });
  });

  it('should extract page content, title, and meta description', async () => {
    const mockPage = {
      content: vi.fn().mockResolvedValue('HTML content'),
      title: vi.fn().mockResolvedValue('Test Page Title'),
      evaluate: vi.fn().mockResolvedValue('Some meta description')
    };

    const handler = new PageHandler();
    const result = await handler.extractPageData(mockPage);

    expect(result.content).toBe('HTML content');
    expect(result.title).toBe('Test Page Title');
    expect(result.description).toBe('Some meta description');
  });

  it('should handle errors when extracting meta description', async () => {
    const mockPage = {
      content: vi.fn().mockResolvedValue('HTML content'),
      title: vi.fn().mockResolvedValue('Page Title'),
      evaluate: vi.fn().mockRejectedValue(new Error('Evaluation failed'))
    };

    const handler = new PageHandler();
    const result = await handler.extractPageData(mockPage);

    expect(result.content).toBe('HTML content');
    expect(result.title).toBe('Page Title');
    expect(result.description).toBe(''); // gracefully defaults to empty
  });
});
