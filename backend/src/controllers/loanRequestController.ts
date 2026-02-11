import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/response';
import * as loanRequestService from '../services/loanRequestService';
import {
  getLoanRequestsQuerySchema,
  indexLoanRequestSchema,
  indexLoanRequestCancelSchema,
} from '../validators';

export const getLoanRequests = async (req: Request, res: Response) => {
  try {
    const parsed = getLoanRequestsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return errorResponse(res, parsed.error.issues.map(i => i.message).join(', '), 400);
    }

    const result = await loanRequestService.getLoanRequests(parsed.data);
    return successResponse(res, result);
  } catch (error: any) {
    return errorResponse(res, error.message, 400);
  }
};

export const getLoanRequestById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const loanRequest = await loanRequestService.getLoanRequestById(id);

    if (!loanRequest) {
      return errorResponse(res, 'Loan request not found', 404);
    }

    return successResponse(res, loanRequest);
  } catch (error: any) {
    return errorResponse(res, error.message, 400);
  }
};

export const indexLoanRequest = async (req: Request, res: Response) => {
  try {
    const parsed = indexLoanRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return errorResponse(res, parsed.error.issues.map(i => i.message).join(', '), 400);
    }

    const loanRequest = await loanRequestService.indexLoanRequest(parsed.data);
    return successResponse(res, loanRequest, 'Loan request indexed successfully', 201);
  } catch (error: any) {
    return errorResponse(res, error.message, 400);
  }
};

export const cancelLoanRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = indexLoanRequestCancelSchema.safeParse(req.body);
    if (!parsed.success) {
      return errorResponse(res, parsed.error.issues.map(i => i.message).join(', '), 400);
    }

    const loanRequest = await loanRequestService.indexLoanRequestCancel(id, parsed.data.cancelTxHash);
    return successResponse(res, loanRequest, 'Loan request cancelled');
  } catch (error: any) {
    return errorResponse(res, error.message, 400);
  }
};
