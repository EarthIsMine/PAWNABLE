import { Router } from 'express';
import * as loanController from '../controllers/loanController';

const router = Router();

// Get all loans (with filters)
router.get('/', loanController.getLoans);

// Get loan by id
router.get('/:id', loanController.getLoanById);

// Create loan (for indexer)
router.post('/', loanController.createLoan);

// Update loan status
router.patch('/:id/status', loanController.updateLoanStatus);

export default router;
