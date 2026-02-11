// Loan Request Status (on-chain order book)
export enum LoanRequestStatus {
  OPEN = 'OPEN',
  FUNDED = 'FUNDED',
  CANCELLED = 'CANCELLED',
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

// Indexer: LoanRequestCreated event data
export interface IndexLoanRequestData {
  chainId: number;
  contractAddress: string;
  onchainRequestId: string;
  borrower: string;
  collateralToken: string;
  collateralAmount: string;
  principalToken: string;
  principalAmount: string;
  interestBps: number;
  durationSeconds: number;
  createTxHash: string;
  createdAtBlock: string;
}

// Indexer: LoanFunded event data
export interface IndexLoanFundedData {
  chainId: number;
  contractAddress: string;
  onchainLoanId: string;
  onchainRequestId: string;
  borrower: string;
  lender: string;
  startTimestamp: string;
  dueTimestamp: string;
  fundTxHash: string;
}
