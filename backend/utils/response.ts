import { Response } from 'express';
import { ApiResponse } from '../types';

export class ResponseUtil {
  static success<T>(res: Response, data: T, message?: string, statusCode: number = 200) {
    const response: ApiResponse<T> = {
      success: true,
      message: message || 'Success',
      data,
    };
    return res.status(statusCode).json(response);
  }

  static error(res: Response, error: string, statusCode: number = 500) {
    const response: ApiResponse = {
      success: false,
      error,
    };
    return res.status(statusCode).json(response);
  }

  static created<T>(res: Response, data: T, message?: string) {
    return this.success(res, data, message || 'Resource created successfully', 201);
  }

  static badRequest(res: Response, error: string) {
    return this.error(res, error, 400);
  }

  static unauthorized(res: Response, error: string = 'Unauthorized') {
    return this.error(res, error, 401);
  }

  static notFound(res: Response, error: string = 'Resource not found') {
    return this.error(res, error, 404);
  }

  static serverError(res: Response, error: string = 'Internal server error') {
    return this.error(res, error, 500);
  }
}
