import { Request, Response, NextFunction } from 'express';
import { ResponseUtil } from '../utils/response';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  if (err.message === 'Not allowed by CORS') {
    return ResponseUtil.error(res, 'CORS policy violation', 403);
  }

  if (err.name === 'ValidationError') {
    return ResponseUtil.badRequest(res, err.message);
  }

  if (err.name === 'UnauthorizedError') {
    return ResponseUtil.unauthorized(res, err.message);
  }

  return ResponseUtil.serverError(res, err.message || 'Internal server error');
};

export const notFoundHandler = (req: Request, res: Response) => {
  return ResponseUtil.notFound(res, `Route ${req.method} ${req.path} not found`);
};
