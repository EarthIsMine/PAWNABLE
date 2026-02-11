import prisma from '../config/database';
import { IntentStatus, LoanStatus } from '../types';

interface GetLoansFilter {
  status?: string;
  borrower?: string;
  lender?: string;
  limit: number;
  offset: number;
}

interface CreateLoanData {
  chainId: number;
  verifyingContract: string;
  loanId: string;
  intentId?: string;
  borrower: string;
  lender: string;
  startTimestamp: string;
  dueTimestamp: string;
  startTxHash: string;
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
        intent: {
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
      intent: {
        include: {
          collateralToken: true,
          principalToken: true,
        },
      },
    },
  });
};

export const createLoan = async (data: CreateLoanData) => {
  // 원자적 트랜잭션: User upsert + Loan 생성 + Intent 상태 업데이트
  return await prisma.$transaction(async (tx) => {
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

    // Intent가 연결된 경우 상태 검증 및 업데이트
    if (data.intentId) {
      const intent = await tx.intent.findUnique({ where: { id: data.intentId } });

      if (!intent) {
        throw new Error(`Intent ${data.intentId} not found`);
      }

      if (intent.status !== IntentStatus.ACTIVE) {
        throw new Error(`Intent is not active (current: ${intent.status})`);
      }

      // Intent를 EXECUTED로 업데이트
      await tx.intent.update({
        where: { id: data.intentId },
        data: {
          status: IntentStatus.EXECUTED,
          executedTxHash: data.startTxHash,
          executedLoanId: data.loanId,
        },
      });
    }

    // Create loan
    const loan = await tx.loan.create({
      data: {
        chainId: data.chainId,
        verifyingContract: data.verifyingContract.toLowerCase(),
        loanId: data.loanId,
        intentId: data.intentId || null,
        borrowerAddress: data.borrower.toLowerCase(),
        lenderAddress: data.lender.toLowerCase(),
        startTimestamp: BigInt(data.startTimestamp),
        dueTimestamp: BigInt(data.dueTimestamp),
        status: LoanStatus.ONGOING,
        startTxHash: data.startTxHash,
      },
      include: {
        borrower: true,
        lender: true,
        intent: true,
      },
    });

    return loan;
  });
};

export const updateLoanStatus = async (id: string, status: string, txHash?: string) => {
  const loan = await prisma.loan.findUnique({ where: { id } });

  if (!loan) {
    throw new Error('Loan not found');
  }

  // 상태 전이 검증
  if (loan.status !== LoanStatus.ONGOING) {
    throw new Error(`Loan is already ${loan.status}, cannot transition to ${status}`);
  }

  const updateData: any = { status };

  if (status === LoanStatus.REPAID && txHash) {
    updateData.repaidTxHash = txHash;
  } else if (status === LoanStatus.CLAIMED && txHash) {
    updateData.claimedTxHash = txHash;
  }

  return await prisma.loan.update({
    where: { id },
    data: updateData,
  });
};
