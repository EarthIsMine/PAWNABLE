import prisma from '../config/database';
import { CreateIntentRequest, IntentStatus } from '../types';
import { ethers } from 'ethers';
import { env } from '../config/env';

// EIP-712 Domain & Types for signature verification
const EIP712_TYPES = {
  LoanIntent: [
    { name: 'borrower', type: 'address' },
    { name: 'collateralToken', type: 'address' },
    { name: 'collateralAmount', type: 'uint256' },
    { name: 'principalToken', type: 'address' },
    { name: 'principalAmount', type: 'uint256' },
    { name: 'interestBps', type: 'uint256' },
    { name: 'durationSeconds', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
};

function buildEIP712Domain(chainId: number, verifyingContract: string) {
  return {
    name: 'PawnableLoan',
    version: '1',
    chainId,
    verifyingContract,
  };
}

function verifyIntentSignature(data: CreateIntentRequest): string {
  const domain = buildEIP712Domain(data.chainId, data.verifyingContract);
  const message = {
    borrower: data.borrower,
    collateralToken: data.collateralToken,
    collateralAmount: data.collateralAmount,
    principalToken: data.principalToken,
    principalAmount: data.principalAmount,
    interestBps: data.interestBps,
    durationSeconds: data.durationSeconds,
    nonce: data.nonce,
    deadline: data.deadline,
  };

  const recovered = ethers.verifyTypedData(domain, EIP712_TYPES, message, data.signature);
  return recovered.toLowerCase();
}

/** Mark expired intents in query results */
async function markExpiredIntents(): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await prisma.intent.updateMany({
    where: {
      status: { in: [IntentStatus.ACTIVE, IntentStatus.UNAVAILABLE] },
      deadlineTimestamp: { lt: BigInt(now) },
    },
    data: { status: IntentStatus.EXPIRED },
  });
}

interface GetIntentsFilter {
  status?: string;
  borrower?: string;
  collateralToken?: string;
  principalToken?: string;
  limit: number;
  offset: number;
}

export const createIntent = async (data: CreateIntentRequest) => {
  // 1. chainId 검증
  if (data.chainId !== env.BASE_CHAIN_ID) {
    throw new Error(`Invalid chainId: expected ${env.BASE_CHAIN_ID}, got ${data.chainId}`);
  }

  // 2. verifyingContract 검증
  if (env.LOAN_CONTRACT_ADDRESS &&
      data.verifyingContract.toLowerCase() !== env.LOAN_CONTRACT_ADDRESS.toLowerCase()) {
    throw new Error('Invalid verifyingContract: does not match LOAN_CONTRACT_ADDRESS');
  }

  // 3. deadline 검증
  const now = Math.floor(Date.now() / 1000);
  const deadline = parseInt(data.deadline, 10);
  if (deadline <= now) {
    throw new Error('Intent deadline has passed');
  }

  // 4. EIP-712 서명 검증
  let recovered: string;
  try {
    recovered = verifyIntentSignature(data);
  } catch {
    throw new Error('Invalid EIP-712 signature');
  }

  if (recovered !== data.borrower.toLowerCase()) {
    throw new Error(`Signature mismatch: recovered ${recovered}, expected ${data.borrower.toLowerCase()}`);
  }

  // 5. Token 화이트리스트 검증
  const [collateralToken, principalToken] = await Promise.all([
    prisma.token.findUnique({
      where: {
        chainId_address: {
          chainId: data.chainId,
          address: data.collateralToken.toLowerCase(),
        },
      },
    }),
    prisma.token.findUnique({
      where: {
        chainId_address: {
          chainId: data.chainId,
          address: data.principalToken.toLowerCase(),
        },
      },
    }),
  ]);

  if (!collateralToken || !collateralToken.isAllowed) {
    throw new Error('Collateral token is not allowed');
  }
  if (!principalToken || !principalToken.isAllowed) {
    throw new Error('Principal token is not allowed');
  }

  // 6. nonce 중복 검증 (같은 borrower + 같은 nonce로 ACTIVE/UNAVAILABLE인 intent가 있는지)
  const existingIntent = await prisma.intent.findFirst({
    where: {
      chainId: data.chainId,
      verifyingContract: data.verifyingContract.toLowerCase(),
      borrowerAddress: data.borrower.toLowerCase(),
      intentNonce: data.nonce,
      status: { in: [IntentStatus.ACTIVE, IntentStatus.UNAVAILABLE] },
    },
  });

  if (existingIntent) {
    throw new Error(`Active intent already exists with nonce ${data.nonce}`);
  }

  // 7. User upsert & Intent 생성
  await prisma.user.upsert({
    where: { address: data.borrower.toLowerCase() },
    create: { address: data.borrower.toLowerCase() },
    update: {},
  });

  const intent = await prisma.intent.create({
    data: {
      chainId: data.chainId,
      verifyingContract: data.verifyingContract.toLowerCase(),
      borrowerAddress: data.borrower.toLowerCase(),
      collateralTokenAddress: data.collateralToken.toLowerCase(),
      collateralAmount: data.collateralAmount,
      principalTokenAddress: data.principalToken.toLowerCase(),
      principalAmount: data.principalAmount,
      interestBps: data.interestBps,
      durationSeconds: data.durationSeconds,
      intentNonce: data.nonce,
      deadlineTimestamp: BigInt(deadline),
      intentHash: data.intentHash,
      signature: data.signature,
      status: IntentStatus.ACTIVE,
    },
    include: {
      borrower: true,
      collateralToken: true,
      principalToken: true,
    },
  });

  return intent;
};

export const getIntents = async (filters: GetIntentsFilter) => {
  // 만료된 intent 자동 전환
  await markExpiredIntents();

  const where: any = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.borrower) {
    where.borrowerAddress = filters.borrower.toLowerCase();
  }

  if (filters.collateralToken) {
    where.collateralTokenAddress = filters.collateralToken.toLowerCase();
  }

  if (filters.principalToken) {
    where.principalTokenAddress = filters.principalToken.toLowerCase();
  }

  const [intents, total] = await Promise.all([
    prisma.intent.findMany({
      where,
      include: {
        borrower: true,
        collateralToken: true,
        principalToken: true,
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit,
      skip: filters.offset,
    }),
    prisma.intent.count({ where }),
  ]);

  return {
    intents,
    total,
    limit: filters.limit,
    offset: filters.offset,
  };
};

export const getIntentById = async (id: string) => {
  // 만료 체크 후 반환
  await markExpiredIntents();

  return await prisma.intent.findUnique({
    where: { id },
    include: {
      borrower: true,
      collateralToken: true,
      principalToken: true,
      snapshots: {
        orderBy: { checkedAt: 'desc' },
        take: 1,
      },
    },
  });
};

export const cancelIntent = async (id: string, signature: string) => {
  const intent = await prisma.intent.findUnique({ where: { id } });

  if (!intent) {
    throw new Error('Intent not found');
  }

  if (intent.status !== IntentStatus.ACTIVE && intent.status !== IntentStatus.UNAVAILABLE) {
    throw new Error('Intent cannot be cancelled');
  }

  // 서명 기반 borrower 인증: "Cancel intent: {id}" 메시지 서명 검증
  const cancelMessage = `Cancel intent: ${id}`;
  let recovered: string;
  try {
    recovered = ethers.verifyMessage(cancelMessage, signature).toLowerCase();
  } catch {
    throw new Error('Invalid cancel signature');
  }

  if (recovered !== intent.borrowerAddress.toLowerCase()) {
    throw new Error('Only the borrower can cancel this intent');
  }

  return await prisma.intent.update({
    where: { id },
    data: { status: IntentStatus.CANCELLED },
  });
};

export const executeIntent = async (id: string, txHash: string, loanId: string) => {
  const intent = await prisma.intent.findUnique({ where: { id } });

  if (!intent) {
    throw new Error('Intent not found');
  }

  if (intent.status !== IntentStatus.ACTIVE) {
    throw new Error('Intent is not active');
  }

  return await prisma.intent.update({
    where: { id },
    data: {
      status: IntentStatus.EXECUTED,
      executedTxHash: txHash,
      executedLoanId: loanId,
    },
  });
};

export const checkIntentState = async (id: string) => {
  const intent = await prisma.intent.findUnique({
    where: { id },
    include: { collateralToken: true },
  });

  if (!intent) {
    throw new Error('Intent not found');
  }

  // 이미 종료된 상태의 intent는 상태 체크 불필요
  if ([IntentStatus.EXPIRED, IntentStatus.CANCELLED, IntentStatus.EXECUTED].includes(intent.status as IntentStatus)) {
    throw new Error(`Intent is already ${intent.status}, state check not applicable`);
  }

  // deadline 만료 체크
  const now = Math.floor(Date.now() / 1000);
  if (Number(intent.deadlineTimestamp) <= now) {
    await prisma.intent.update({
      where: { id: intent.id },
      data: { status: IntentStatus.EXPIRED },
    });
    return {
      balance: '0',
      allowance: '0',
      required: intent.collateralAmount.toString(),
      status: 'EXPIRED',
      reason: 'Intent deadline has passed',
      blockNumber: 0,
    };
  }

  // Initialize provider
  const provider = new ethers.JsonRpcProvider(env.BASE_RPC_URL);
  const blockNumber = await provider.getBlockNumber();

  let balance: bigint;
  let allowance: bigint;
  let derivedStatus: string;
  let reason: string | null = null;

  if (intent.collateralToken.isNative) {
    balance = await provider.getBalance(intent.borrowerAddress);
    allowance = BigInt(0);
  } else {
    const tokenAbi = [
      'function balanceOf(address) view returns (uint256)',
      'function allowance(address,address) view returns (uint256)',
    ];
    const tokenContract = new ethers.Contract(intent.collateralTokenAddress, tokenAbi, provider);

    balance = await tokenContract.balanceOf(intent.borrowerAddress);
    allowance = await tokenContract.allowance(intent.borrowerAddress, intent.verifyingContract);
  }

  const requiredAmount = BigInt(intent.collateralAmount.toString());
  if (balance < requiredAmount) {
    derivedStatus = 'UNAVAILABLE';
    reason = 'INSUFFICIENT_BALANCE';
  } else if (!intent.collateralToken.isNative && allowance < requiredAmount) {
    derivedStatus = 'UNAVAILABLE';
    reason = 'INSUFFICIENT_ALLOWANCE';
  } else {
    derivedStatus = 'ACTIVE';
  }

  // Save snapshot
  await prisma.intentStateSnapshot.create({
    data: {
      intentId: intent.id,
      blockNumber: BigInt(blockNumber),
      collateralBalance: balance.toString(),
      collateralAllowance: allowance.toString(),
      derivedStatus,
      reason,
    },
  });

  // Update intent status if needed
  if (intent.status === IntentStatus.ACTIVE && derivedStatus === 'UNAVAILABLE') {
    await prisma.intent.update({
      where: { id: intent.id },
      data: { status: IntentStatus.UNAVAILABLE },
    });
  } else if (intent.status === IntentStatus.UNAVAILABLE && derivedStatus === 'ACTIVE') {
    await prisma.intent.update({
      where: { id: intent.id },
      data: { status: IntentStatus.ACTIVE },
    });
  }

  return {
    balance: balance.toString(),
    allowance: allowance.toString(),
    required: requiredAmount.toString(),
    status: derivedStatus,
    reason,
    blockNumber,
  };
};
