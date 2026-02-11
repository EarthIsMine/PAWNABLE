import { Router } from 'express';
import * as loanRequestController from '../controllers/loanRequestController';

const router = Router();

// Get all loan requests (with filters)
router.get('/', loanRequestController.getLoanRequests);

// Get loan request by id
router.get('/:id', loanRequestController.getLoanRequestById);

// Index new loan request (called by indexer)
router.post('/', loanRequestController.indexLoanRequest);

// Index cancellation (called by indexer)
router.patch('/:id/cancel', loanRequestController.cancelLoanRequest);

export default router;
