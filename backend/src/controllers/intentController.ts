import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/response';
import * as intentService from '../services/intentService';
import {
  createIntentSchema,
  getIntentsQuerySchema,
  cancelIntentSchema,
  executeIntentSchema,
} from '../validators';

export const createIntent = async (req: Request, res: Response) => {
  try {
    const parsed = createIntentSchema.safeParse(req.body);
    if (!parsed.success) {
      return errorResponse(res, parsed.error.issues.map(i => i.message).join(', '), 400);
    }

    const intent = await intentService.createIntent(parsed.data);
    return successResponse(res, intent, 'Intent created successfully', 201);
  } catch (error: any) {
    return errorResponse(res, error.message, 400);
  }
};

export const getIntents = async (req: Request, res: Response) => {
  try {
    const parsed = getIntentsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return errorResponse(res, parsed.error.issues.map(i => i.message).join(', '), 400);
    }

    const intents = await intentService.getIntents(parsed.data);
    return successResponse(res, intents);
  } catch (error: any) {
    return errorResponse(res, error.message, 400);
  }
};

export const getIntentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const intent = await intentService.getIntentById(id);

    if (!intent) {
      return errorResponse(res, 'Intent not found', 404);
    }

    return successResponse(res, intent);
  } catch (error: any) {
    return errorResponse(res, error.message, 400);
  }
};

export const cancelIntent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = cancelIntentSchema.safeParse(req.body);
    if (!parsed.success) {
      return errorResponse(res, parsed.error.issues.map(i => i.message).join(', '), 400);
    }

    const intent = await intentService.cancelIntent(id, parsed.data.signature);
    return successResponse(res, intent, 'Intent cancelled successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 400);
  }
};

export const executeIntent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = executeIntentSchema.safeParse(req.body);
    if (!parsed.success) {
      return errorResponse(res, parsed.error.issues.map(i => i.message).join(', '), 400);
    }

    const intent = await intentService.executeIntent(id, parsed.data.txHash, parsed.data.loanId);
    return successResponse(res, intent, 'Intent executed successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 400);
  }
};

export const checkIntentState = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const state = await intentService.checkIntentState(id);
    return successResponse(res, state);
  } catch (error: any) {
    return errorResponse(res, error.message, 400);
  }
};
