// apps/api/src/utils/asyncHandler.ts
import { Request, Response, NextFunction } from 'express';

/**
 * Type for async route handler function
 */
export type AsyncHandler<T = any> = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<T>;

/**
 * Wraps an async route handler to catch errors and pass them to the next middleware
 * This eliminates the need for try/catch blocks in every route handler
 */
export function asyncHandler<T>(handler: AsyncHandler<T>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Creates an async handler that automatically sends a response
 * Useful for simple handlers that just return data
 */
export function createResponseHandler<T>(handler: (req: Request) => Promise<T>) {
  return asyncHandler(async (req: Request, res: Response) => {
    const result = await handler(req);
    res.json(result);
  });
}