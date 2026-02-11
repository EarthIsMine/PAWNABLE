import { Response } from 'express';
import { ApiResponse } from '../types';

export const successResponse = <T>(res: Response, data: T, message?: string, statusCode = 200) => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
  };
  return res.status(statusCode).json(response);
};

export const errorResponse = (res: Response, error: string, statusCode = 400) => {
  const response: ApiResponse = {
    success: false,
    error,
  };
  return res.status(statusCode).json(response);
};
