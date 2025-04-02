// src/utils/errors.ts
export enum ErrorCode {
    // Crawler errors
    CRAWLER_INITIALIZATION_FAILED = 'CRAWLER_INITIALIZATION_FAILED',
    CRAWLER_NAVIGATION_FAILED = 'CRAWLER_NAVIGATION_FAILED',
    CRAWLER_PAGE_PROCESSING_FAILED = 'CRAWLER_PAGE_PROCESSING_FAILED',
    CRAWLER_CANCELLATION_FAILED = 'CRAWLER_CANCELLATION_FAILED',
    
    // Parser errors
    PARSER_CONTENT_EXTRACTION_FAILED = 'PARSER_CONTENT_EXTRACTION_FAILED',
    PARSER_JOB_EXTRACTION_FAILED = 'PARSER_JOB_EXTRACTION_FAILED',
    PARSER_LINK_ANALYSIS_FAILED = 'PARSER_LINK_ANALYSIS_FAILED',
    PARSER_AI_QUERY_FAILED = 'PARSER_AI_QUERY_FAILED',
  
    // Cache errors
    CACHE_RETRIEVAL_FAILED = 'CACHE_RETRIEVAL_FAILED',
    CACHE_CREATION_FAILED = 'CACHE_CREATION_FAILED',
    CACHE_UPDATE_FAILED = 'CACHE_UPDATE_FAILED',
    
    // General errors
    INVALID_ARGUMENTS = 'INVALID_ARGUMENTS',
    OPERATION_TIMEOUT = 'OPERATION_TIMEOUT',
    UNEXPECTED_ERROR = 'UNEXPECTED_ERROR'
  }
  
  export class CrawlerError extends Error {
    readonly code: ErrorCode;
    readonly originalError?: Error;
    readonly context?: Record<string, any>;
  
    constructor(message: string, code: ErrorCode, originalError?: Error, context?: Record<string, any>) {
      super(message);
      this.name = 'CrawlerError';
      this.code = code;
      this.originalError = originalError;
      this.context = context;
      
      // Preserve stack trace
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, CrawlerError);
      }
    }
  
    /**
     * Creates an error message that includes context
     */
    static withContext(message: string, code: ErrorCode, context: Record<string, any>, originalError?: Error): CrawlerError {
      return new CrawlerError(message, code, originalError, context);
    }
  }
  
  export class ParserError extends CrawlerError {
    constructor(message: string, code: ErrorCode, originalError?: Error, context?: Record<string, any>) {
      super(message, code, originalError, context);
      this.name = 'ParserError';
    }
  }
  
  export class CacheError extends CrawlerError {
    constructor(message: string, code: ErrorCode, originalError?: Error, context?: Record<string, any>) {
      super(message, code, originalError, context);
      this.name = 'CacheError';
    }
  }