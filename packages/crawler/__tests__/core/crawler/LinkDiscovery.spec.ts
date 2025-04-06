import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LinkDiscovery } from '../../../src/core/crawler/LinkDiscovery';
import { JobParserService } from '../../../src/core/parser';
import { UrlTracker } from '../../../src/core/crawler/URLTracker';

// Create a mock page object with evaluate and title methods.
const mockPage: any = {
  evaluate: vi.fn(),
  title: vi.fn(),
};

describe('LinkDiscovery', () => {
  let linkDiscovery: LinkDiscovery;
  let parser: JobParserService;
  let urlTracker: UrlTracker;
  let enqueueLinksMock: any;

  beforeEach(() => {
    parser = new JobParserService();
    linkDiscovery = new LinkDiscovery(parser);
    urlTracker = new UrlTracker();
    enqueueLinksMock = vi.fn();

    // Reset mocks for each test.
    mockPage.evaluate.mockReset();
    mockPage.title.mockReset();
  });

  it('should enqueue pagination links with high priority', async () => {
    // First evaluate call returns pagination links.
    mockPage.evaluate
      .mockResolvedValueOnce([
        { href: 'https://example.com/page=2', text: '2', isPagination: true },
      ])
      // Second evaluate call returns an empty array for all links.
      .mockResolvedValueOnce([]);

    // Simulate page.title() returning a valid title.
    mockPage.title.mockResolvedValue('Mock Title');

    await linkDiscovery.findAndEnqueueLinks(
      mockPage,
      enqueueLinksMock,
      'https://example.com/page=1',
      'https://example.com',
      urlTracker
    );

    // We expect enqueueLinks to be called once for pagination links.
    expect(enqueueLinksMock).toHaveBeenCalledTimes(1);
    expect(enqueueLinksMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        urls: ['https://example.com/page=2'],
      })
    );
  });

  it('should filter out recently visited or invalid links so that no job links are enqueued', async () => {
    // First evaluate call: pagination returns an empty array.
    mockPage.evaluate
      .mockResolvedValueOnce([])
      // Second evaluate call: returns two links.
      .mockResolvedValueOnce([
        {
          href: 'https://example.com/job/1',
          text: 'Job1',
          title: 'First Job',
          aria: ''
        },
        {
          href: 'https://example.com/login',
          text: 'Login',
          title: '',
          aria: ''
        }
      ]);
    // Simulate page.title() returning a title.
    mockPage.title.mockResolvedValue('Mock Title');

    // Mark the first link as visited so it will be filtered out.
    urlTracker.recordVisit('https://example.com/job/1');

    // Spy on analyzeLinks to simulate that with filtered links it returns an empty array.
    const analyzeLinksSpy = vi
      .spyOn(parser, 'analyzeLinks')
      .mockResolvedValue([]);

    await linkDiscovery.findAndEnqueueLinks(
      mockPage,
      enqueueLinksMock,
      'https://example.com/page=1',
      'https://example.com',
      urlTracker
    );

    // Since pagination returned empty and valid links were filtered out,
    // we expect analyzeLinks to have been called with an empty links array.
    expect(analyzeLinksSpy).toHaveBeenCalledWith({
      sourceUrl: 'https://example.com',
      pageTitle: 'Mock Title',
      links: [] // both links filtered out
    });
    // And since jobLinks is empty, enqueueJobLinks should not be called.
    // In this case, enqueueLinksMock should have been called only once (for pagination) which returned empty.
    // So we expect no call for job links.
    expect(enqueueLinksMock).toHaveBeenCalledTimes(0);
  });

  it('should enqueue job links with priority=2 when valid job links are found', async () => {
    // First evaluate call: pagination returns an empty array.
    mockPage.evaluate
      .mockResolvedValueOnce([])
      // Second evaluate call: returns one valid link.
      .mockResolvedValueOnce([
        {
          href: 'https://example.com/job/2',
          text: 'Some Job Title',
          title: 'Apply Now',
          aria: ''
        }
      ]);
    // Simulate page.title() returning a title.
    mockPage.title.mockResolvedValue('Mock Title');

    // Spy on analyzeLinks to simulate that it returns the valid job link.
    const analyzeLinksSpy = vi
      .spyOn(parser, 'analyzeLinks')
      .mockResolvedValue(['https://example.com/job/2']);

    await linkDiscovery.findAndEnqueueLinks(
      mockPage,
      enqueueLinksMock,
      'https://example.com/page=1',
      'https://example.com',
      urlTracker
    );

    // Verify that analyzeLinks was called with the expected parameters.
    expect(analyzeLinksSpy).toHaveBeenCalledWith({
      sourceUrl: 'https://example.com',
      pageTitle: 'Mock Title',
      links: [
        {
          href: 'https://example.com/job/2',
          text: 'Some Job Title',
          title: 'Apply Now',
          aria: ''
        }
      ]
    });
    // Since pagination returned empty, we expect enqueueLinksMock to be called only once for job links.
    expect(enqueueLinksMock).toHaveBeenCalledTimes(1);
    expect(enqueueLinksMock).toHaveBeenCalledWith(
      expect.objectContaining({
        urls: ['https://example.com/job/2']
      })
    );
  });
});
