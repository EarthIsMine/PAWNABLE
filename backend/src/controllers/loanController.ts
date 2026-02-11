import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/response.js';
import * as loanService from '../services/loanService.js';
import {
  indexLoanFundedSchema,
  getLoansQuerySchema,
  updateLoanStatusSchema,
} from '../validators/index.js';

export const getLoans = async (req: Request, res: Response) => {
  try {
    const parsed = getLoansQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return errorResponse(res, parsed.error.issues.map(i => i.message).join(', '), 400);
    }

    const loans = await loanService.getLoans(parsed.data);
    return successResponse(res, loans);
  } catch (error: any) {
    return errorResponse(res, error.message, 400);
  }
};

export const getLoanById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const loan = await loanService.getLoanById(id);

    if (!loan) {
      return errorResponse(res, 'Loan not found', 404);
    }

    return successResponse(res, loan);
  } catch (error: any) {
    return errorResponse(res, error.message, 400);
  }
};

export const createLoan = async (req: Request, res: Response) => {
  try {
    const parsed = indexLoanFundedSchema.safeParse(req.body);
    if (!parsed.success) {
      return errorResponse(res, parsed.error.issues.map(i => i.message).join(', '), 400);
    }

    const loan = await loanService.createLoan(parsed.data);
    return successResponse(res, loan, 'Loan created successfully', 201);
  } catch (error: any) {
    return errorResponse(res, error.message, 400);
  }
};

export const updateLoanStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = updateLoanStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return errorResponse(res, parsed.error.issues.map(i => i.message).join(', '), 400);
    }

    const loan = await loanService.updateLoanStatus(id, parsed.data.status, parsed.data.txHash);
    return successResponse(res, loan, 'Loan status updated successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 400);
  }
};
