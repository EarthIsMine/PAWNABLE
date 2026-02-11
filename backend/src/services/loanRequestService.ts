import prisma from '../config/database.js';
import { IndexLoanRequestData, LoanRequestStatus } from '../types/index.js';

interface GetLoanRequestsFilter {
  status?: string;
  borrower?: string;
  collateralToken?: string;
  principalToken?: string;
  limit: number;
  offset: number;
}

export const getLoanRequests = async (filters: GetLoanRequestsFilter) => {
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

  const [loanRequests, total] = await Promise.all([
    prisma.loanRequest.findMany({
      where,
      include: {
        borrower: true,
        collateralToken: true,
        principalToken: true,
      },
      orderBy: { indexedAt: 'desc' },
      take: filters.limit,
      skip: filters.offset,
    }),
    prisma.loanRequest.count({ where }),
  ]);

  return {
    loanRequests,
    total,
    limit: filters.limit,
    offset: filters.offset,
  };
};

export const getLoanRequestById = async (id: string) => {
  return await prisma.loanRequest.findUnique({
    where: { id },
    include: {
      borrower: true,
      collateralToken: true,
      principalToken: true,
      loan: true,
    },
  });
};

export const indexLoanRequest = async (data: IndexLoanRequestData) => {
  // Upsert borrower user
  await prisma.user.upsert({
    where: { address: data.borrower.toLowerCase() },
    create: { address: data.borrower.toLowerCase() },
    update: {},
  });

  const loanRequest = await prisma.loanRequest.create({
    data: {
      chainId: data.chainId,
      contractAddress: data.contractAddress.toLowerCase(),
      onchainRequestId: data.onchainRequestId,
      borrowerAddress: data.borrower.toLowerCase(),
      collateralTokenAddress: data.collateralToken.toLowerCase(),
      collateralAmount: data.collateralAmount,
      principalTokenAddress: data.principalToken.toLowerCase(),
      principalAmount: data.principalAmount,
      interestBps: data.interestBps,
      durationSeconds: data.durationSeconds,
      status: LoanRequestStatus.OPEN,
      createTxHash: data.createTxHash,
      createdAtBlock: BigInt(data.createdAtBlock),
    },
    include: {
      borrower: true,
      collateralToken: true,
      principalToken: true,
    },
  });

  return loanRequest;
};

export const indexLoanRequestCancel = async (
  id: string,
  cancelTxHash: string,
) => {
  const request = await prisma.loanRequest.findUnique({ where: { id } });

  if (!request) {
    throw new Error('Loan request not found');
  }

  if (request.status !== LoanRequestStatus.OPEN) {
    throw new Error(`Loan request is not open (current: ${request.status})`);
  }

  return await prisma.loanRequest.update({
    where: { id },
    data: {
      status: LoanRequestStatus.CANCELLED,
      cancelTxHash,
    },
  });
};
