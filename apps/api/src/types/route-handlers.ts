// File path: apps/api/src/types/route-handlers.ts
// apps/api/src/types/route-handlers.ts
import { Request, Response, NextFunction } from 'express';

export type RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any> | any;

export type ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any> | any;