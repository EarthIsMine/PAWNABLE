import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Loan } from '../models/loanModel';
import { Collateral } from '../models/collaterals';
import { CreateLoanDto, MatchLoanDto, LoanStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { TxLogService } from './txLogService';

export class LoanService {
  private loanRepository: Repository<Loan>;
  private collateralRepository: Repository<Collateral>;
  private txLogService: TxLogService;

  constructor() {
    this.loanRepository = AppDataSource.getRepository(Loan);
    this.collateralRepository = AppDataSource.getRepository(Collateral);
    this.txLogService = new TxLogService();
  }

  /**
   * 모든 대출 조회
   */
  async getAllLoans(): Promise<Loan[]> {
    return await this.loanRepository.find({
      relations: ['borrower', 'lender', 'loanAsset'],
    });
  }

  /**
   * ID로 대출 조회
   */
  async getLoanById(loan_id: string): Promise<Loan | null> {
    return await this.loanRepository.findOne({
      where: { loan_id },
      relations: ['borrower', 'lender', 'loanAsset'],
    });
  }

  /**
   * 차입자 ID로 대출 조회
   */
  async getLoansByBorrowerId(borrower_id: string): Promise<Loan[]> {
    return await this.loanRepository.find({
      where: { borrower_id },
      relations: ['lender', 'loanAsset'],
    });
  }

  /**
   * 대출자 ID로 대출 조회
   */
  async getLoansByLenderId(lender_id: string): Promise<Loan[]> {
    return await this.loanRepository.find({
      where: { lender_id },
      relations: ['borrower', 'loanAsset'],
    });
  }

  /**
   * 상태별 대출 조회
   */
  async getLoansByStatus(status: LoanStatus): Promise<Loan[]> {
    return await this.loanRepository.find({
      where: { status },
      relations: ['borrower', 'lender', 'loanAsset'],
    });
  }

  /**
   * 매칭 대기 중인 대출 조회 (마켓플레이스)
   */
  async getPendingLoans(): Promise<Loan[]> {
    return await this.getLoansByStatus(LoanStatus.PENDING);
  }

  /**
   * 대출과 담보를 함께 조회
   */
  async getLoanWithCollaterals(loan_id: string): Promise<{ loan: Loan; collaterals: Collateral[] } | null> {
    const loan = await this.getLoanById(loan_id);
    if (!loan) return null;

    const collaterals = await this.collateralRepository.find({
      where: { loan_id },
      relations: ['asset'],
    });

    return { loan, collaterals };
  }

  /**
   * 새 대출 생성 (차입자가 생성)
   */
  async createLoan(dto: CreateLoanDto): Promise<{ loan: Loan; collaterals: Collateral[] }> {
    const loan_id = uuidv4();

    // 1. 대출 생성
    const loan = this.loanRepository.create({
      loan_id,
      borrower_id: dto.borrower_id,
      lender_id: null, // 아직 매칭되지 않음
      loan_asset_id: dto.loan_asset_id,
      loan_amount: dto.loan_amount,
      interest_rate_pct: dto.interest_rate_pct,
      total_repay_amount: dto.total_repay_amount,
      repay_due_at: dto.repay_due_at,
      status: LoanStatus.PENDING,
    });

    const savedLoan = await this.loanRepository.save(loan);

    // 2. 담보 생성
    const collaterals: Collateral[] = [];
    for (const collateralDto of dto.collaterals) {
      const collateral = this.collateralRepository.create({
        collateral_id: uuidv4(),
        loan_id,
        asset_id: collateralDto.asset_id,
        amount: collateralDto.amount,
        token_id: collateralDto.token_id,
        locked_price: 0, // 실제로는 외부 API에서 가격 가져와야 함
      });

      collaterals.push(await this.collateralRepository.save(collateral));
    }

    return { loan: savedLoan, collaterals };
  }

  /**
   * 대출 매칭 (대출자가 수락)
   */
  async matchLoan(dto: MatchLoanDto): Promise<Loan> {
    const loan = await this.getLoanById(dto.loan_id);

    if (!loan) {
      throw new Error('Loan not found');
    }

    if (loan.status !== LoanStatus.PENDING) {
      throw new Error('Loan is not available for matching');
    }

    loan.lender_id = dto.lender_id;
    loan.status = LoanStatus.MATCHED;
    loan.matched_at = new Date();

    return await this.loanRepository.save(loan);
  }

  /**
   * 대출 활성화 (프론트엔드에서 트랜잭션 완료 후 호출)
   * 블록체인 트랜잭션은 실행하지 않고, DB 상태만 업데이트
   */
  async activateLoan(loan_id: string, txHash: string): Promise<Loan> {
    const loan = await this.getLoanById(loan_id);

    if (!loan) {
      throw new Error('Loan not found');
    }

    if (loan.status !== LoanStatus.MATCHED) {
      throw new Error('Loan must be matched before activation');
    }

    if (!loan.lender_id) {
      throw new Error('Lender not found for this loan');
    }

    // 트랜잭션 로그 기록
    await this.txLogService.logLoanActivation(
      txHash,
      loan_id,
      loan.borrower.wallet_address,
      loan.lender.wallet_address,
      parseFloat(loan.loan_amount.toString()),
      loan.loan_asset_id
    );

    // 대출 상태 업데이트
    loan.status = LoanStatus.ACTIVE;
    return await this.loanRepository.save(loan);
  }

  /**
   * 대출 상환 (프론트엔드에서 트랜잭션 완료 후 호출)
   * 블록체인 트랜잭션은 실행하지 않고, DB 상태만 업데이트
   */
  async repayLoan(loan_id: string, txHash: string): Promise<Loan> {
    const loan = await this.getLoanById(loan_id);

    if (!loan) {
      throw new Error('Loan not found');
    }

    if (loan.status !== LoanStatus.ACTIVE) {
      throw new Error('Only active loans can be repaid');
    }

    if (!loan.lender_id) {
      throw new Error('Lender not found for this loan');
    }

    // 트랜잭션 로그 기록
    await this.txLogService.logLoanRepayment(
      txHash,
      loan_id,
      loan.borrower.wallet_address,
      loan.lender.wallet_address,
      parseFloat(loan.total_repay_amount.toString()),
      loan.loan_asset_id
    );

    // 대출 상태 업데이트
    loan.status = LoanStatus.REPAID;
    loan.closed_at = new Date();

    return await this.loanRepository.save(loan);
  }

  /**
   * 대출 청산 (프론트엔드에서 트랜잭션 완료 후 호출)
   * 블록체인 트랜잭션은 실행하지 않고, DB 상태만 업데이트
   */
  async liquidateLoan(loan_id: string, txHash: string): Promise<Loan> {
    const loan = await this.getLoanById(loan_id);

    if (!loan) {
      throw new Error('Loan not found');
    }

    if (loan.status !== LoanStatus.ACTIVE) {
      throw new Error('Only active loans can be liquidated');
    }

    const now = new Date();
    if (now < loan.repay_due_at) {
      throw new Error('Loan has not expired yet');
    }

    if (!loan.lender_id) {
      throw new Error('Lender not found for this loan');
    }

    // 트랜잭션 로그 기록
    await this.txLogService.logLoanLiquidation(
      txHash,
      loan_id,
      loan.borrower.wallet_address,
      loan.lender.wallet_address,
      loan.loan_asset_id
    );

    // 대출 상태 업데이트
    loan.status = LoanStatus.LIQUIDATED;
    loan.closed_at = new Date();

    return await this.loanRepository.save(loan);
  }

  /**
   * 대출 취소 (매칭 전)
   */
  async cancelLoan(loan_id: string, borrower_id: string): Promise<boolean> {
    const loan = await this.getLoanById(loan_id);

    if (!loan) {
      throw new Error('Loan not found');
    }

    if (loan.borrower_id !== borrower_id) {
      throw new Error('Only borrower can cancel the loan');
    }

    if (loan.status !== LoanStatus.PENDING) {
      throw new Error('Only pending loans can be cancelled');
    }

    // 담보 삭제
    await this.collateralRepository.delete({ loan_id });

    // 대출 삭제
    await this.loanRepository.remove(loan);

    return true;
  }
}
