// tests/unit/ErrorHandling.test.ts
import { describe, it, expect } from 'vitest';
import { CrawlerError, ParserError, ErrorCode } from '../../src/utils/errors';

describe('Error Handling', () => {
  it('should create CrawlerError with default properties', () => {
    const error = new CrawlerError('Test error', ErrorCode.UNEXPECTED_ERROR);
    
    expect(error.message).toBe('Test error');
    expect(error.code).toBe(ErrorCode.UNEXPECTED_ERROR);
    expect(error.originalError).toBeUndefined();
    expect(error.context).toBeUndefined();
  });
  
  it('should create CrawlerError with custom properties', () => {
    const originalError = new Error('Original error');
    const context = { sourceId: 123 };
    const error = new CrawlerError('Test error', ErrorCode.CRAWLER_NAVIGATION_FAILED, originalError, context);
    
    expect(error.message).toBe('Test error');
    expect(error.code).toBe(ErrorCode.CRAWLER_NAVIGATION_FAILED);
    expect(error.originalError).toBe(originalError);
    expect(error.context).toBe(context);
  });
  
  it('should create ParserError with default properties', () => {
    const error = new ParserError('Test error', ErrorCode.PARSER_JOB_EXTRACTION_FAILED);
    
    expect(error.message).toBe('Test error');
    expect(error.code).toBe(ErrorCode.PARSER_JOB_EXTRACTION_FAILED);
    expect(error.originalError).toBeUndefined();
    expect(error.context).toBeUndefined();
    expect(error.name).toBe('ParserError');
  });
  
  it('should create ParserError with custom properties', () => {
    const originalError = new Error('Original error');
    const context = { url: 'https://example.com' };
    const error = new ParserError('Test error', ErrorCode.PARSER_CONTENT_EXTRACTION_FAILED, originalError, context);
    
    expect(error.message).toBe('Test error');
    expect(error.code).toBe(ErrorCode.PARSER_CONTENT_EXTRACTION_FAILED);
    expect(error.originalError).toBe(originalError);
    expect(error.context).toBe(context);
  });
  
  it('should produce string representation of error', () => {
    const error = new CrawlerError('Test error', ErrorCode.CRAWLER_NAVIGATION_FAILED);
    const errorString = error.toString();
    
    expect(errorString).toContain('Test error');
    expect(errorString).toContain('CrawlerError');
  });
  
  it('should create error with context using static method', () => {
    const originalError = new Error('Original error');
    const context = { sourceId: 123, url: 'https://example.com' };
    
    const error = CrawlerError.withContext(
      'Failed to process page', 
      ErrorCode.CRAWLER_PAGE_PROCESSING_FAILED,
      context,
      originalError
    );
    
    expect(error.message).toBe('Failed to process page');
    expect(error.code).toBe(ErrorCode.CRAWLER_PAGE_PROCESSING_FAILED);
    expect(error.originalError).toBe(originalError);
    expect(error.context).toBe(context);
  });
  
  it('should preserve stack trace', () => {
    const error = new CrawlerError('Test error', ErrorCode.UNEXPECTED_ERROR);
    expect(error.stack).toBeDefined();
  });
});