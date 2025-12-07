/**
 * Global Error Handler Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error({
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    error: {
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    },
  });
}
