import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/response';
import * as tokenService from '../services/tokenService';
import { addTokenSchema, updateTokenAllowanceSchema } from '../validators';

export const getTokens = async (req: Request, res: Response) => {
  try {
    const { isAllowed } = req.query;
    const tokens = await tokenService.getTokens(
      isAllowed === 'true' ? true : isAllowed === 'false' ? false : undefined
    );
    return successResponse(res, tokens);
  } catch (error: any) {
    return errorResponse(res, error.message, 400);
  }
};

export const getTokenByAddress = async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { chainId = '8453' } = req.query;

    const token = await tokenService.getTokenByAddress(
      parseInt(chainId as string, 10),
      address
    );

    if (!token) {
      return errorResponse(res, 'Token not found', 404);
    }

    return successResponse(res, token);
  } catch (error: any) {
    return errorResponse(res, error.message, 400);
  }
};

export const addToken = async (req: Request, res: Response) => {
  try {
    const parsed = addTokenSchema.safeParse(req.body);
    if (!parsed.success) {
      return errorResponse(res, parsed.error.issues.map(i => i.message).join(', '), 400);
    }

    const token = await tokenService.addToken(parsed.data);
    return successResponse(res, token, 'Token added successfully', 201);
  } catch (error: any) {
    return errorResponse(res, error.message, 400);
  }
};

export const updateTokenAllowance = async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const parsed = updateTokenAllowanceSchema.safeParse(req.body);
    if (!parsed.success) {
      return errorResponse(res, parsed.error.issues.map(i => i.message).join(', '), 400);
    }

    const token = await tokenService.updateTokenAllowance(
      parsed.data.chainId,
      address,
      parsed.data.isAllowed
    );

    return successResponse(res, token, 'Token allowance updated successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 400);
  }
};
