/**
 * Reindex script: 컨트랙트 배포 시점부터 현재까지의 이벤트를 DB에 재적재
 * Usage: npx tsx src/scripts/reindex.ts
 */
import { ethers } from 'ethers';
import prisma from '../config/database.js';
import { env } from '../config/env.js';
import { LoanRequestStatus, LoanStatus } from '../types/index.js';

const CONTRACT_ADDRESS = env.LOAN_CONTRACT_ADDRESS;
const RPC_URL = env.BASE_RPC_URL;
const CHAIN_ID = env.BASE_CHAIN_ID;

const ABI = [
  'event LoanRequestCreated(uint256 indexed requestId, address indexed borrower, address collateralToken, uint256 collateralAmount, address principalToken, uint256 principalAmount, uint256 interestBps, uint256 duration)',
  'event LoanRequestCancelled(uint256 indexed requestId, address indexed borrower)',
  'event LoanFunded(uint256 indexed loanId, uint256 indexed requestId, address indexed lender, address borrower, uint256 startTimestamp, uint256 dueTimestamp)',
  'event LoanRepaid(uint256 indexed loanId, address indexed borrower, uint256 repayAmount, uint256 fee)',
  'event CollateralClaimed(uint256 indexed loanId, address indexed lender, uint256 collateralAmount)',
];

// 한 번에 가져올 블록 범위 (RPC 제한 대응)
const BLOCK_CHUNK = 5000;

async function fetchLogs(
  contract: ethers.Contract,
  filter: ethers.ContractEventName,
  fromBlock: number,
  toBlock: number,
): Promise<ethers.EventLog[]> {
  const results: ethers.EventLog[] = [];
  for (let from = fromBlock; from <= toBlock; from += BLOCK_CHUNK) {
    const to = Math.min(from + BLOCK_CHUNK - 1, toBlock);
    console.log(`  fetching blocks ${from}~${to}...`);
    const logs = await contract.queryFilter(filter, from, to);
    results.push(...(logs as ethers.EventLog[]));
  }
  return results;
}

async function main() {
  console.log('🔍 Reindexing from chain...');
  console.log(`  RPC: ${RPC_URL}`);
  console.log(`  Contract: ${CONTRACT_ADDRESS}`);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

  const latestBlock = await provider.getBlockNumber();
  console.log(`  Latest block: ${latestBlock}`);

  // 컨트랙트 배포 블록 (WorldLand mainnet)
  const FROM_BLOCK = 8306000;

  // ── 1. LoanRequestCreated ─────────────────────────────────────────
  console.log('\n📥 LoanRequestCreated events...');
  const createdLogs = await fetchLogs(contract, 'LoanRequestCreated', FROM_BLOCK, latestBlock);
  console.log(`  Found ${createdLogs.length} events`);

  for (const log of createdLogs) {
    const { requestId, borrower, collateralToken, collateralAmount, principalToken, principalAmount, interestBps, duration } = log.args;
    const tx = log.transactionHash;
    const block = log.blockNumber;

    await prisma.user.upsert({
      where: { address: borrower.toLowerCase() },
      create: { address: borrower.toLowerCase() },
      update: {},
    });

    await prisma.loanRequest.upsert({
      where: {
        chainId_contractAddress_onchainRequestId: {
          chainId: CHAIN_ID,
          contractAddress: CONTRACT_ADDRESS.toLowerCase(),
          onchainRequestId: requestId.toString(),
        },
      },
      create: {
        chainId: CHAIN_ID,
        contractAddress: CONTRACT_ADDRESS.toLowerCase(),
        onchainRequestId: requestId.toString(),
        borrowerAddress: borrower.toLowerCase(),
        collateralTokenAddress: collateralToken.toLowerCase(),
        collateralAmount: collateralAmount.toString(),
        principalTokenAddress: principalToken.toLowerCase(),
        principalAmount: principalAmount.toString(),
        interestBps: Number(interestBps),
        durationSeconds: Number(duration),
        status: LoanRequestStatus.OPEN,
        createTxHash: tx,
        createdAtBlock: BigInt(block),
      },
      update: {},
    });
  }

  // ── 2. LoanRequestCancelled ───────────────────────────────────────
  console.log('\n❌ LoanRequestCancelled events...');
  const cancelledLogs = await fetchLogs(contract, 'LoanRequestCancelled', FROM_BLOCK, latestBlock);
  console.log(`  Found ${cancelledLogs.length} events`);

  for (const log of cancelledLogs) {
    const { requestId } = log.args;
    const tx = log.transactionHash;

    await prisma.loanRequest.updateMany({
      where: {
        chainId: CHAIN_ID,
        contractAddress: CONTRACT_ADDRESS.toLowerCase(),
        onchainRequestId: requestId.toString(),
      },
      data: {
        status: LoanRequestStatus.CANCELLED,
        cancelTxHash: tx,
      },
    });
  }

  // ── 3. LoanFunded ─────────────────────────────────────────────────
  console.log('\n💰 LoanFunded events...');
  const fundedLogs = await fetchLogs(contract, 'LoanFunded', FROM_BLOCK, latestBlock);
  console.log(`  Found ${fundedLogs.length} events`);

  for (const log of fundedLogs) {
    const { loanId, requestId, lender, borrower, startTimestamp, dueTimestamp } = log.args;
    const tx = log.transactionHash;

    // LoanRequest 상태 → FUNDED
    await prisma.loanRequest.updateMany({
      where: {
        chainId: CHAIN_ID,
        contractAddress: CONTRACT_ADDRESS.toLowerCase(),
        onchainRequestId: requestId.toString(),
      },
      data: { status: LoanRequestStatus.FUNDED },
    });

    // LoanRequest id 조회
    const loanReq = await prisma.loanRequest.findFirst({
      where: {
        chainId: CHAIN_ID,
        contractAddress: CONTRACT_ADDRESS.toLowerCase(),
        onchainRequestId: requestId.toString(),
      },
    });

    await prisma.user.upsert({
      where: { address: lender.toLowerCase() },
      create: { address: lender.toLowerCase() },
      update: {},
    });

    await prisma.loan.upsert({
      where: {
        chainId_onchainLoanId: {
          chainId: CHAIN_ID,
          onchainLoanId: loanId.toString(),
        },
      },
      create: {
        chainId: CHAIN_ID,
        contractAddress: CONTRACT_ADDRESS.toLowerCase(),
        onchainLoanId: loanId.toString(),
        requestId: loanReq?.id ?? null,
        borrowerAddress: borrower.toLowerCase(),
        lenderAddress: lender.toLowerCase(),
        startTimestamp: BigInt(startTimestamp),
        dueTimestamp: BigInt(dueTimestamp),
        status: LoanStatus.ONGOING,
        fundTxHash: tx,
      },
      update: {},
    });
  }

  // ── 4. LoanRepaid ─────────────────────────────────────────────────
  console.log('\n✅ LoanRepaid events...');
  const repaidLogs = await fetchLogs(contract, 'LoanRepaid', FROM_BLOCK, latestBlock);
  console.log(`  Found ${repaidLogs.length} events`);

  for (const log of repaidLogs) {
    const { loanId } = log.args;
    const tx = log.transactionHash;

    await prisma.loan.updateMany({
      where: { chainId: CHAIN_ID, onchainLoanId: loanId.toString() },
      data: { status: LoanStatus.REPAID, repayTxHash: tx },
    });
  }

  // ── 5. CollateralClaimed ──────────────────────────────────────────
  console.log('\n🔒 CollateralClaimed events...');
  const claimedLogs = await fetchLogs(contract, 'CollateralClaimed', FROM_BLOCK, latestBlock);
  console.log(`  Found ${claimedLogs.length} events`);

  for (const log of claimedLogs) {
    const { loanId } = log.args;
    const tx = log.transactionHash;

    await prisma.loan.updateMany({
      where: { chainId: CHAIN_ID, onchainLoanId: loanId.toString() },
      data: { status: LoanStatus.CLAIMED, claimTxHash: tx },
    });
  }

  console.log('\n✅ Reindex complete!');

  // 요약
  const [reqCount, loanCount] = await Promise.all([
    prisma.loanRequest.count(),
    prisma.loan.count(),
  ]);
  console.log(`  loan_requests: ${reqCount}`);
  console.log(`  loans: ${loanCount}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
