// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// User Types
export interface CreateUserDto {
  wallet_address: string;
  nickname: string;
  email: string;
}

export interface UpdateUserDto {
  nickname?: string;
  email?: string;
}

// Loan Types
export enum LoanStatus {
  PENDING = 'pending',
  MATCHED = 'matched',
  ACTIVE = 'active',
  REPAID = 'repaid',
  DEFAULTED = 'defaulted',
  LIQUIDATED = 'liquidated',
}

export interface CreateLoanDto {
  borrower_id: string;
  loan_asset_id: string;
  loan_amount: number;
  interest_rate_pct: number;
  total_repay_amount: number;
  repay_due_at: Date;
  collaterals: CreateCollateralDto[];
}

export interface MatchLoanDto {
  loan_id: string;
  lender_id: string;
}

// Collateral Types
export interface CreateCollateralDto {
  asset_id: string;
  amount: number;
  token_id?: string;
}

// Asset Types
export interface CreateAssetDto {
  blockchain: string;
  asset_type: string;
  symbol: string;
  name: string;
  contract_address?: string;
}

// Auth Types
export interface WalletAuthPayload {
  wallet_address: string;
  signature: string;
  timestamp: number;
}

export interface JwtPayload {
  user_id: string;
  wallet_address: string;
}

// Transaction Log Types
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
