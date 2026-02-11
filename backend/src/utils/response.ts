import { Response } from 'express';
import { ApiResponse } from '../types/index.js';

export const successResponse = <T>(res: Response, data: T, message?: string, statusCode = 200) => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
  };
  return res
    .status(statusCode)
    .set('Content-Type', 'application/json')
    .send(JSON.stringify(response, (_key, value) => (typeof value === 'bigint' ? value.toString() : value)));
};

export const errorResponse = (res: Response, error: string, statusCode = 400) => {
  const response: ApiResponse = {
    success: false,
    error,
  };
  return res
    .status(statusCode)
    .set('Content-Type', 'application/json')
    .send(JSON.stringify(response, (_key, value) => (typeof value === 'bigint' ? value.toString() : value)));
};
