// apps/api/src/utils/errors.ts
import { ZodError } from 'zod';
import { ValidationError as ExpressValidationError } from 'express-validator';

/**
 * Base API error class
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    statusCode: number,
    message: string,
    isOperational = true,
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    this.name = this.constructor.name;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request error
 */
export class BadRequestError extends ApiError {
  constructor(message = 'Bad request', details?: unknown) {
    super(400, message, true, details);
  }
}

/**
 * 401 Unauthorized error
 */
export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(401, message);
  }
}

/**
 * 403 Forbidden error
 */
export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(403, message);
  }
}

/**
 * 404 Not Found error
 */
export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(404, message);
  }
}

/**
 * 409 Conflict error
 */
export class ConflictError extends ApiError {
  constructor(message = 'Resource conflict') {
    super(409, message);
  }
}

/**
 * 422 Unprocessable Entity error (validation errors)
 */
export class ValidationError extends ApiError {
  constructor(message = 'Validation error', details?: unknown) {
    super(422, message, true, details);
  }
}

/**
 * 500 Internal Server Error
 */
export class InternalServerError extends ApiError {
  constructor(message = 'Internal server error', isOperational = false) {
    super(500, message, isOperational);
  }
}

/**
 * Creates an ApiError from various error types
 */
export function createApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new ValidationError('Validation error', {
      errors: error.errors.map(e => ({
        path: e.path,
        message: e.message,
      })),
    });
  }

  if (Array.isArray(error) && error.length > 0 && 'msg' in error[0]) {
    // Express validator errors
    // Express validator errors have a different structure than our ValidationError
    return new ValidationError('Validation error', {
      errors: (error as Array<{ param: string; msg: string }>).map(e => ({
        path: e.param,
        message: e.msg,
      })),
    });
  }

  const message = error instanceof Error ? error.message : String(error);
  return new InternalServerError(message);
}