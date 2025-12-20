import { Request, Response } from 'express';
import { LoanService } from '../services/loanService';
import { ResponseUtil } from '../utils/response';
import { CreateLoanDto, MatchLoanDto, LoanStatus } from '../types';

export class LoanController {
  private loanService: LoanService;

  constructor() {
    this.loanService = new LoanService();
  }

  /**
   * GET /api/loans
   * 모든 대출 조회
   */
  getAllLoans = async (req: Request, res: Response) => {
    try {
      const loans = await this.loanService.getAllLoans();
      return ResponseUtil.success(res, loans, 'Loans retrieved successfully');
    } catch (error) {
      console.error('Get all loans error:', error);
      return ResponseUtil.serverError(res, (error as Error).message);
    }
  };

  /**
   * GET /api/loans/:loan_id
   * 대출 상세 조회
   */
  getLoanById = async (req: Request, res: Response) => {
    try {
      const { loan_id } = req.params;
      const result = await this.loanService.getLoanWithCollaterals(loan_id);

      if (!result) {
        return ResponseUtil.notFound(res, 'Loan not found');
      }

      return ResponseUtil.success(res, result, 'Loan retrieved successfully');
    } catch (error) {
      console.error('Get loan by ID error:', error);
      return ResponseUtil.serverError(res, (error as Error).message);
    }
  };

  /**
   * GET /api/loans/marketplace
   * 마켓플레이스 (매칭 대기 중인 대출)
   */
  getMarketplace = async (req: Request, res: Response) => {
    try {
      const loans = await this.loanService.getPendingLoans();
      return ResponseUtil.success(res, loans, 'Marketplace loans retrieved successfully');
    } catch (error) {
      console.error('Get marketplace error:', error);
      return ResponseUtil.serverError(res, (error as Error).message);
    }
  };

  /**
   * GET /api/loans/borrower/:borrower_id
   * 차입자의 대출 목록
   */
  getLoansByBorrower = async (req: Request, res: Response) => {
    try {
      const { borrower_id } = req.params;
      const loans = await this.loanService.getLoansByBorrowerId(borrower_id);
      return ResponseUtil.success(res, loans, 'Borrower loans retrieved successfully');
    } catch (error) {
      console.error('Get loans by borrower error:', error);
      return ResponseUtil.serverError(res, (error as Error).message);
    }
  };

  /**
   * GET /api/loans/lender/:lender_id
   * 대출자의 대출 목록
   */
  getLoansByLender = async (req: Request, res: Response) => {
    try {
      const { lender_id } = req.params;
      const loans = await this.loanService.getLoansByLenderId(lender_id);
      return ResponseUtil.success(res, loans, 'Lender loans retrieved successfully');
    } catch (error) {
      console.error('Get loans by lender error:', error);
      return ResponseUtil.serverError(res, (error as Error).message);
    }
  };

  /**
   * POST /api/loans
   * 새 대출 생성
   */
  createLoan = async (req: Request, res: Response) => {
    try {
      const dto: CreateLoanDto = req.body;

      if (!dto.borrower_id || !dto.loan_asset_id || !dto.loan_amount ||
          !dto.interest_rate_pct || !dto.total_repay_amount || !dto.repay_due_at ||
          !dto.collaterals || dto.collaterals.length === 0) {
        return ResponseUtil.badRequest(res, 'Missing required fields');
      }

      const result = await this.loanService.createLoan(dto);
      return ResponseUtil.created(res, result, 'Loan created successfully');
    } catch (error) {
      console.error('Create loan error:', error);
      return ResponseUtil.serverError(res, (error as Error).message);
    }
  };

  /**
   * POST /api/loans/:loan_id/match
   * 대출 매칭
   */
  matchLoan = async (req: Request, res: Response) => {
    try {
      const { loan_id } = req.params;
      const { lender_id } = req.body;

      if (!lender_id) {
        return ResponseUtil.badRequest(res, 'Lender ID is required');
      }

      const dto: MatchLoanDto = { loan_id, lender_id };
      const loan = await this.loanService.matchLoan(dto);

      return ResponseUtil.success(res, loan, 'Loan matched successfully');
    } catch (error) {
      console.error('Match loan error:', error);
      const message = (error as Error).message;
      if (message.includes('not found') || message.includes('not available')) {
        return ResponseUtil.badRequest(res, message);
      }
      return ResponseUtil.serverError(res, message);
    }
  };

  /**
   * POST /api/loans/:loan_id/activate
   * 대출 활성화
   */
  activateLoan = async (req: Request, res: Response) => {
    try {
      const { loan_id } = req.params;
      const loan = await this.loanService.activateLoan(loan_id);
      return ResponseUtil.success(res, loan, 'Loan activated successfully');
    } catch (error) {
      console.error('Activate loan error:', error);
      return ResponseUtil.badRequest(res, (error as Error).message);
    }
  };

  /**
   * POST /api/loans/:loan_id/repay
   * 대출 상환
   */
  repayLoan = async (req: Request, res: Response) => {
    try {
      const { loan_id } = req.params;
      const loan = await this.loanService.repayLoan(loan_id);
      return ResponseUtil.success(res, loan, 'Loan repaid successfully');
    } catch (error) {
      console.error('Repay loan error:', error);
      return ResponseUtil.badRequest(res, (error as Error).message);
    }
  };

  /**
   * POST /api/loans/:loan_id/liquidate
   * 대출 청산
   */
  liquidateLoan = async (req: Request, res: Response) => {
    try {
      const { loan_id } = req.params;
      const loan = await this.loanService.liquidateLoan(loan_id);
      return ResponseUtil.success(res, loan, 'Loan liquidated successfully');
    } catch (error) {
      console.error('Liquidate loan error:', error);
      return ResponseUtil.badRequest(res, (error as Error).message);
    }
  };

  /**
   * DELETE /api/loans/:loan_id
   * 대출 취소
   */
  cancelLoan = async (req: Request, res: Response) => {
    try {
      const { loan_id } = req.params;
      const { borrower_id } = req.body;

      if (!borrower_id) {
        return ResponseUtil.badRequest(res, 'Borrower ID is required');
      }

      await this.loanService.cancelLoan(loan_id, borrower_id);
      return ResponseUtil.success(res, null, 'Loan cancelled successfully');
    } catch (error) {
      console.error('Cancel loan error:', error);
      return ResponseUtil.badRequest(res, (error as Error).message);
    }
  };
}
