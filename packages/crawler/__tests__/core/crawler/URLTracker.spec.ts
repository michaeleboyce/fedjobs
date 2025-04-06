// File path: packages/crawler/__tests__/core/crawler/URLTracker.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { UrlTracker } from '../../../src/core/crawler/URLTracker';

describe('UrlTracker', () => {
  let tracker: UrlTracker;

  beforeEach(() => {
    tracker = new UrlTracker();
  });

  it('should return false if URL was never visited', () => {
    const result = tracker.isRecentlyVisited('https://unvisited.com');
    expect(result).toBe(false);
  });

  it('should record a URL visit and then return true for isRecentlyVisited', () => {
    tracker.recordVisit('https://visited.com');
    const result = tracker.isRecentlyVisited('https://visited.com');
    expect(result).toBe(true);
  });

  it('should treat URLs with trailing slash or case differently unless normalized', () => {
    tracker.recordVisit('https://example.com/path/');
    expect(tracker.isRecentlyVisited('https://example.com/path')).toBe(true);
    // Because we remove trailing slash in normalizeUrl
  });

  // If you want to test expiration logic, you can manipulate Date.now or the stored time
  // For example, using vitest's fakeTimers or partial mocking of Date.
});
