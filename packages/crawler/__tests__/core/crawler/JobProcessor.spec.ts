// File path: packages/crawler/__tests__/core/crawler/JobProcessor.spec.ts
import { describe, it, expect } from 'vitest';
import { JobProcessor } from '../../../src/core/crawler/JobProcessor';
import { JobPostingData } from '../../../src/types';

describe('JobProcessor', () => {
  it('should add non-duplicate jobs and invoke onJobFound callback', async () => {
    const processor = new JobProcessor();
    const results: JobPostingData[] = [];

    const sampleJobs: JobPostingData[] = [
      { title: 'Dev', url: 'https://example.com/job/1', description: '', dateScraped: new Date(), organization: 'Example' },
      { title: 'Ops', url: 'https://example.com/job/2', description: '', dateScraped: new Date(), organization: 'Example' }
    ];

    const onJobFoundMock = vi.fn();

    await processor.processJobData(sampleJobs, results, 10, onJobFoundMock);

    expect(results).toHaveLength(2);
    expect(onJobFoundMock).toHaveBeenCalledTimes(2);
  });

  it('should skip duplicate jobs and not invoke onJobFound for duplicates', async () => {
    const processor = new JobProcessor();
    const existingResults: JobPostingData[] = [
      { title: 'Existing', url: 'https://example.com/job/1', description: '', dateScraped: new Date(), organization: 'Example' }
    ];

    const duplicateJob: JobPostingData = {
      title: 'Existing',
      url: 'https://example.com/job/1',
      description: '',
      dateScraped: new Date(),
      organization: 'Example'
    };

    const onJobFoundMock = vi.fn();
    await processor.processJobData([duplicateJob], existingResults, 10, onJobFoundMock);

    expect(existingResults).toHaveLength(1); // still only 1
    expect(onJobFoundMock).not.toHaveBeenCalled();
  });

  it('should respect the maxJobs limit', async () => {
    const processor = new JobProcessor();
    const results: JobPostingData[] = [];

    const sampleJobs: JobPostingData[] = [
      { title: 'Job A', url: 'https://example.com/a', description: '', dateScraped: new Date(), organization: 'Example' },
      { title: 'Job B', url: 'https://example.com/b', description: '', dateScraped: new Date(), organization: 'Example' }
    ];

    await processor.processJobData(sampleJobs, results, 1);
    expect(results).toHaveLength(1);
  });
});
