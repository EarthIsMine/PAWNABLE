import { z } from 'zod';

const evmAddress = z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Invalid EVM address');
const bytes32Hex = z.string().regex(/^0x[0-9a-fA-F]{64}$/, 'Invalid bytes32 hex');
const uint256String = z.string().regex(/^\d+$/, 'Must be a numeric string (uint256)');

// ========================
// Intent Validators
// ========================

export const createIntentSchema = z.object({
  chainId: z.number().int().positive(),
  verifyingContract: evmAddress,
  borrower: evmAddress,
  collateralToken: evmAddress,
  collateralAmount: uint256String,
  principalToken: evmAddress,
  principalAmount: uint256String,
  interestBps: z.number().int().min(0).max(10000),
  durationSeconds: z.number().int().positive(),
  nonce: uint256String,
  deadline: uint256String,
  intentHash: bytes32Hex,
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Invalid signature hex'),
});

export const getIntentsQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'UNAVAILABLE', 'EXPIRED', 'CANCELLED', 'EXECUTED']).optional(),
  borrower: evmAddress.optional(),
  collateralToken: evmAddress.optional(),
  principalToken: evmAddress.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const cancelIntentSchema = z.object({
  borrowerAddress: evmAddress,
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Invalid signature hex'),
});

export const executeIntentSchema = z.object({
  txHash: bytes32Hex,
  loanId: uint256String,
});

// ========================
// Loan Validators
// ========================

export const createLoanSchema = z.object({
  chainId: z.number().int().positive(),
  verifyingContract: evmAddress,
  loanId: uint256String,
  intentId: z.string().uuid().optional(),
  borrower: evmAddress,
  lender: evmAddress,
  startTimestamp: uint256String,
  dueTimestamp: uint256String,
  startTxHash: bytes32Hex,
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
  txHash: bytes32Hex.optional(),
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
