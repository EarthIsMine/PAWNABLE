import prisma from '../config/database';
import { Prisma } from '@prisma/client';
import { LoanRequestStatus, LoanStatus } from '../types';
import { IndexLoanFundedData } from '../types';

interface GetLoansFilter {
  status?: string;
  borrower?: string;
  lender?: string;
  limit: number;
  offset: number;
}

export const getLoans = async (filters: GetLoansFilter) => {
  const where: any = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.borrower) {
    where.borrowerAddress = filters.borrower.toLowerCase();
  }

  if (filters.lender) {
    where.lenderAddress = filters.lender.toLowerCase();
  }

  const [loans, total] = await Promise.all([
    prisma.loan.findMany({
      where,
      include: {
        borrower: true,
        lender: true,
        request: {
          include: {
            collateralToken: true,
            principalToken: true,
          },
        },
      },
      orderBy: { indexedAt: 'desc' },
      take: filters.limit,
      skip: filters.offset,
    }),
    prisma.loan.count({ where }),
  ]);

  return {
    loans,
    total,
    limit: filters.limit,
    offset: filters.offset,
  };
};

export const getLoanById = async (id: string) => {
  return await prisma.loan.findUnique({
    where: { id },
    include: {
      borrower: true,
      lender: true,
      request: {
        include: {
          collateralToken: true,
          principalToken: true,
        },
      },
    },
  });
};

export const createLoan = async (data: IndexLoanFundedData) => {
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Ensure users exist
    await Promise.all([
      tx.user.upsert({
        where: { address: data.borrower.toLowerCase() },
        create: { address: data.borrower.toLowerCase() },
        update: {},
      }),
      tx.user.upsert({
        where: { address: data.lender.toLowerCase() },
        create: { address: data.lender.toLowerCase() },
        update: {},
      }),
    ]);

    // Find linked LoanRequest by onchain ID and update to FUNDED
    const loanRequest = await tx.loanRequest.findUnique({
      where: {
        chainId_contractAddress_onchainRequestId: {
          chainId: data.chainId,
          contractAddress: data.contractAddress.toLowerCase(),
          onchainRequestId: data.onchainRequestId,
        },
      },
    });

    if (loanRequest && loanRequest.status === LoanRequestStatus.OPEN) {
      await tx.loanRequest.update({
        where: { id: loanRequest.id },
        data: { status: LoanRequestStatus.FUNDED },
      });
    }

    // Create loan
    const loan = await tx.loan.create({
      data: {
        chainId: data.chainId,
        contractAddress: data.contractAddress.toLowerCase(),
        onchainLoanId: data.onchainLoanId,
        requestId: loanRequest?.id || null,
        borrowerAddress: data.borrower.toLowerCase(),
        lenderAddress: data.lender.toLowerCase(),
        startTimestamp: BigInt(data.startTimestamp),
        dueTimestamp: BigInt(data.dueTimestamp),
        status: LoanStatus.ONGOING,
        fundTxHash: data.fundTxHash,
      },
      include: {
        borrower: true,
        lender: true,
        request: true,
      },
    });

    return loan;
  });
};

export const updateLoanStatus = async (id: string, status: string, txHash: string) => {
  const loan = await prisma.loan.findUnique({ where: { id } });

  if (!loan) {
    throw new Error('Loan not found');
  }

  if (loan.status !== LoanStatus.ONGOING) {
    throw new Error(`Loan is already ${loan.status}, cannot transition to ${status}`);
  }

  const updateData: any = { status };

  if (status === LoanStatus.REPAID) {
    updateData.repayTxHash = txHash;
  } else if (status === LoanStatus.CLAIMED) {
    updateData.claimTxHash = txHash;
  }

  return await prisma.loan.update({
    where: { id },
    data: updateData,
  });
};
