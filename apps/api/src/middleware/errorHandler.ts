// apps/api/src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiError, createApiError } from '../utils/errors';
import { config } from '../config';

/**
 * Centralized error handling middleware
 */
export function errorHandler(
  err: Error | ApiError | unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Convert error to ApiError if it's not one already
  const apiError = err instanceof ApiError ? err : createApiError(err);

  // Log error (non-operational errors should be logged with more details)
  if (!apiError.isOperational) {
    console.error('NON-OPERATIONAL ERROR:', err);
  } else if (config.env === 'development') {
    console.error(`ERROR [${apiError.statusCode}]: ${apiError.message}`);
    if (apiError.details) {
      console.error('Details:', apiError.details);
    }
  }

  // Create response body
  const responseBody: Record<string, unknown> = {
    status: 'error',
    message: apiError.message,
  };

  // Add details for validation errors
  if (apiError.details) {
    responseBody.details = apiError.details;
  }

  // Add stack trace in development mode
  if (config.env === 'development' && !apiError.isOperational) {
    responseBody.stack = apiError.stack;
  }

  // Send response
  res.status(apiError.statusCode).json(responseBody);
}

/**
 * Handle 404 errors for routes that don't exist
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const apiError = new ApiError(404, `Not found: ${req.method} ${req.path}`);
  next(apiError);
}