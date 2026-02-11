import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response.js';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
    return errorResponse(res, err.message, 400);
  }

  if (err.name === 'UnauthorizedError') {
    return errorResponse(res, 'Unauthorized', 401);
  }

  return errorResponse(res, 'Internal server error', 500);
};

export const notFoundHandler = (req: Request, res: Response) => {
  return errorResponse(res, 'Route not found', 404);
};
