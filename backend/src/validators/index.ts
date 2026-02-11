import { z } from 'zod';

const evmAddress = z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Invalid EVM address');
const bytes32Hex = z.string().regex(/^0x[0-9a-fA-F]{64}$/, 'Invalid bytes32 hex');
const uint256String = z.string().regex(/^\d+$/, 'Must be a numeric string (uint256)');

// ========================
// Loan Request Validators
// ========================

export const getLoanRequestsQuerySchema = z.object({
  status: z.enum(['OPEN', 'FUNDED', 'CANCELLED']).optional(),
  borrower: evmAddress.optional(),
  collateralToken: evmAddress.optional(),
  principalToken: evmAddress.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const indexLoanRequestSchema = z.object({
  chainId: z.number().int().positive(),
  contractAddress: evmAddress,
  onchainRequestId: uint256String,
  borrower: evmAddress,
  collateralToken: evmAddress,
  collateralAmount: uint256String,
  principalToken: evmAddress,
  principalAmount: uint256String,
  interestBps: z.number().int().min(0).max(10000),
  durationSeconds: z.number().int().positive(),
  createTxHash: bytes32Hex,
  createdAtBlock: uint256String,
});

export const indexLoanRequestCancelSchema = z.object({
  cancelTxHash: bytes32Hex,
});

// ========================
// Loan Validators
// ========================

export const indexLoanFundedSchema = z.object({
  chainId: z.number().int().positive(),
  contractAddress: evmAddress,
  onchainLoanId: uint256String,
  onchainRequestId: uint256String,
  borrower: evmAddress,
  lender: evmAddress,
  startTimestamp: uint256String,
  dueTimestamp: uint256String,
  fundTxHash: bytes32Hex,
});

export const getLoansQuerySchema = z.object({
  status: z.enum(['ONGOING', 'REPAID', 'CLAIMED']).optional(),
  borrower: evmAddress.optional(),
  lender: evmAddress.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const updateLoanStatusSchema = z.object({
  status: z.enum(['REPAID', 'CLAIMED']),
  txHash: bytes32Hex,
});

// ========================
// Token Validators
// ========================

export const addTokenSchema = z.object({
  chainId: z.number().int().positive(),
  address: evmAddress,
  symbol: z.string().min(1).max(20),
  decimals: z.number().int().min(0).max(18),
  isNative: z.boolean(),
  isAllowed: z.boolean().default(true),
});

export const updateTokenAllowanceSchema = z.object({
  chainId: z.coerce.number().int().positive().default(84532),
  isAllowed: z.boolean(),
});
