// Intent Status
export enum IntentStatus {
  ACTIVE = 'ACTIVE',
  UNAVAILABLE = 'UNAVAILABLE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  EXECUTED = 'EXECUTED',
}

// Loan Status
export enum LoanStatus {
  ONGOING = 'ONGOING',
  REPAID = 'REPAID',
  CLAIMED = 'CLAIMED',
}

// Token Type
export enum TokenType {
  ERC20 = 'ERC20',
  NATIVE = 'NATIVE',
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// EIP-712 Intent Structure
export interface EIP712Intent {
  borrower: string;
  collateralToken: string;
  collateralAmount: string;
  principalToken: string;
  principalAmount: string;
  interestBps: number;
  durationSeconds: number;
  nonce: string;
  deadline: string;
}

// Create Intent Request
export interface CreateIntentRequest {
  chainId: number;
  verifyingContract: string;
  borrower: string;
  collateralToken: string;
  collateralAmount: string;
  principalToken: string;
  principalAmount: string;
  interestBps: number;
  durationSeconds: number;
  nonce: string;
  deadline: string;
  intentHash: string;
  signature: string;
}
