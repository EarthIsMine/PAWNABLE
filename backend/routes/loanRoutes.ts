import { Router } from 'express';
import { LoanController } from '../controllers/loanController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();
const loanController = new LoanController();

// Public routes
router.get('/marketplace', loanController.getMarketplace);

// Protected routes
router.get('/', authMiddleware, loanController.getAllLoans);
router.get('/:loan_id', authMiddleware, loanController.getLoanById);
router.get('/borrower/:borrower_id', authMiddleware, loanController.getLoansByBorrower);
router.get('/lender/:lender_id', authMiddleware, loanController.getLoansByLender);

router.post('/', authMiddleware, loanController.createLoan);
router.post('/:loan_id/match', authMiddleware, loanController.matchLoan);
router.post('/:loan_id/activate', authMiddleware, loanController.activateLoan);
router.post('/:loan_id/repay', authMiddleware, loanController.repayLoan);
router.post('/:loan_id/liquidate', authMiddleware, loanController.liquidateLoan);

router.delete('/:loan_id', authMiddleware, loanController.cancelLoan);

export default router;
