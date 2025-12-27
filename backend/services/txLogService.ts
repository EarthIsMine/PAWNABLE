import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { OnchainTxLog } from '../models/onchain_tx_log';
import { v4 as uuidv4 } from 'uuid';

export enum TxDirection {
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
  LOCK = 'lock',
  UNLOCK = 'unlock',
  LIQUIDATE = 'liquidate',
}

export enum TxStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
}

export interface CreateTxLogDto {
  txHash: string;
  direction: TxDirection;
  amount: number;
  fromAddress: string;
  toAddress: string;
  loanId: string;
  assetId: string;
  txStatus?: TxStatus;
}

export class TxLogService {
  private txLogRepository: Repository<OnchainTxLog>;

  constructor() {
    this.txLogRepository = AppDataSource.getRepository(OnchainTxLog);
  }

  /**
   * 트랜잭션 로그 생성
   */
  async createTxLog(dto: CreateTxLogDto): Promise<OnchainTxLog> {
    const txLog = this.txLogRepository.create({
      tx_log_id: uuidv4(),
      tx_hash: dto.txHash,
      direction: dto.direction,
      amount: dto.amount,
      from_address: dto.fromAddress,
      to_address: dto.toAddress,
      loan_id: dto.loanId,
      asset_id: dto.assetId,
      tx_status: dto.txStatus || TxStatus.PENDING,
      occurred_at: new Date(),
    });

    return await this.txLogRepository.save(txLog);
  }

  /**
   * 트랜잭션 상태 업데이트
   */
  async updateTxStatus(txHash: string, status: TxStatus): Promise<OnchainTxLog | null> {
    const txLog = await this.txLogRepository.findOne({
      where: { tx_hash: txHash },
    });

    if (!txLog) {
      return null;
    }

    txLog.tx_status = status;
    return await this.txLogRepository.save(txLog);
  }

  /**
   * 대출 ID로 트랜잭션 로그 조회
   */
  async getTxLogsByLoanId(loanId: string): Promise<OnchainTxLog[]> {
    return await this.txLogRepository.find({
      where: { loan_id: loanId },
      order: { occurred_at: 'DESC' },
    });
  }

  /**
   * 트랜잭션 해시로 조회
   */
  async getTxLogByHash(txHash: string): Promise<OnchainTxLog | null> {
    return await this.txLogRepository.findOne({
      where: { tx_hash: txHash },
    });
  }

  /**
   * 대출 활성화 트랜잭션 로그 기록
   */
  async logLoanActivation(
    txHash: string,
    loanId: string,
    borrowerAddress: string,
    lenderAddress: string,
    loanAmount: number,
    assetId: string
  ): Promise<OnchainTxLog> {
    return await this.createTxLog({
      txHash,
      direction: TxDirection.DEPOSIT,
      amount: loanAmount,
      fromAddress: lenderAddress,
      toAddress: borrowerAddress,
      loanId,
      assetId,
      txStatus: TxStatus.CONFIRMED,
    });
  }

  /**
   * 대출 상환 트랜잭션 로그 기록
   */
  async logLoanRepayment(
    txHash: string,
    loanId: string,
    borrowerAddress: string,
    lenderAddress: string,
    repayAmount: number,
    assetId: string
  ): Promise<OnchainTxLog> {
    return await this.createTxLog({
      txHash,
      direction: TxDirection.WITHDRAW,
      amount: repayAmount,
      fromAddress: borrowerAddress,
      toAddress: lenderAddress,
      loanId,
      assetId,
      txStatus: TxStatus.CONFIRMED,
    });
  }

  /**
   * 대출 청산 트랜잭션 로그 기록
   */
  async logLoanLiquidation(
    txHash: string,
    loanId: string,
    borrowerAddress: string,
    lenderAddress: string,
    assetId: string
  ): Promise<OnchainTxLog> {
    return await this.createTxLog({
      txHash,
      direction: TxDirection.LIQUIDATE,
      amount: 0,
      fromAddress: borrowerAddress,
      toAddress: lenderAddress,
      loanId,
      assetId,
      txStatus: TxStatus.CONFIRMED,
    });
  }
}
