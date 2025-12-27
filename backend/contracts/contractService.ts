import { ethers } from 'ethers';
import { LOAN_CONTRACT_ABI, NFT_CONTRACT_ABI } from './abis';

export interface LoanContractData {
  loanId: string;
  borrower: string;
  lender: string;
  loanAmount: string;
  collateralTokenIds: string[];
  repayAmount: string;
  dueDate: number;
}

export interface TransactionResult {
  txHash: string;
  success: boolean;
  blockNumber?: number;
  gasUsed?: string;
}

export class ContractService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private loanContract: ethers.Contract;
  private nftContract: ethers.Contract;

  constructor() {
    // RPC Provider 초기화
    const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://localhost:8545';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    // Wallet 초기화 (서버 지갑 - 트랜잭션 서명용)
    const privateKey = process.env.SERVER_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('SERVER_PRIVATE_KEY is not set in environment variables');
    }
    this.wallet = new ethers.Wallet(privateKey, this.provider);

    // 대출 컨트랙트 초기화
    const loanContractAddress = process.env.LOAN_CONTRACT_ADDRESS;
    if (!loanContractAddress) {
      throw new Error('LOAN_CONTRACT_ADDRESS is not set in environment variables');
    }
    this.loanContract = new ethers.Contract(
      loanContractAddress,
      LOAN_CONTRACT_ABI,
      this.wallet
    );

    // NFT 컨트랙트 초기화
    const nftContractAddress = process.env.NFT_CONTRACT_ADDRESS;
    if (!nftContractAddress) {
      throw new Error('NFT_CONTRACT_ADDRESS is not set in environment variables');
    }
    this.nftContract = new ethers.Contract(
      nftContractAddress,
      NFT_CONTRACT_ABI,
      this.wallet
    );
  }

  /**
   * 대출 활성화 - 담보를 잠그고 대출금을 전송
   */
  async activateLoan(
    loanId: string,
    borrowerAddress: string,
    lenderAddress: string,
    loanAmount: string,
    collateralTokenIds: string[],
    repayAmount: string,
    dueTimestamp: number
  ): Promise<TransactionResult> {
    try {
      // 1. 담보 NFT를 컨트랙트로 전송 (borrower가 approve 했다고 가정)
      console.log(`Transferring collateral NFTs to contract for loan ${loanId}`);
      for (const tokenId of collateralTokenIds) {
        const transferTx = await this.nftContract.transferFrom(
          borrowerAddress,
          this.loanContract.target,
          tokenId
        );
        await transferTx.wait();
      }

      // 2. 대출 활성화 트랜잭션 실행
      console.log(`Activating loan ${loanId} on-chain`);
      const tx = await this.loanContract.activateLoan(
        loanId,
        borrowerAddress,
        lenderAddress,
        ethers.parseEther(loanAmount),
        collateralTokenIds,
        ethers.parseEther(repayAmount),
        dueTimestamp
      );

      const receipt = await tx.wait();

      return {
        txHash: receipt.hash,
        success: receipt.status === 1,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      console.error('Error activating loan on-chain:', error);
      throw new Error(`Failed to activate loan on blockchain: ${(error as Error).message}`);
    }
  }

  /**
   * 대출 상환 - 상환금을 받고 담보를 반환
   */
  async repayLoan(
    loanId: string,
    borrowerAddress: string,
    lenderAddress: string,
    repayAmount: string,
    collateralTokenIds: string[]
  ): Promise<TransactionResult> {
    try {
      console.log(`Processing loan repayment for ${loanId}`);

      // 상환 트랜잭션 실행 (컨트랙트가 자동으로 담보 반환)
      const tx = await this.loanContract.repayLoan(
        loanId,
        borrowerAddress,
        lenderAddress,
        ethers.parseEther(repayAmount)
      );

      const receipt = await tx.wait();

      return {
        txHash: receipt.hash,
        success: receipt.status === 1,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      console.error('Error repaying loan on-chain:', error);
      throw new Error(`Failed to repay loan on blockchain: ${(error as Error).message}`);
    }
  }

  /**
   * 대출 청산 - 담보를 대출자에게 이전
   */
  async liquidateLoan(
    loanId: string,
    borrowerAddress: string,
    lenderAddress: string,
    collateralTokenIds: string[]
  ): Promise<TransactionResult> {
    try {
      console.log(`Liquidating loan ${loanId}`);

      // 청산 트랜잭션 실행 (컨트랙트가 자동으로 담보를 대출자에게 이전)
      const tx = await this.loanContract.liquidateLoan(
        loanId,
        borrowerAddress,
        lenderAddress
      );

      const receipt = await tx.wait();

      return {
        txHash: receipt.hash,
        success: receipt.status === 1,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      console.error('Error liquidating loan on-chain:', error);
      throw new Error(`Failed to liquidate loan on blockchain: ${(error as Error).message}`);
    }
  }

  /**
   * 담보 취소 - 매칭 전 대출 취소 시 담보 반환
   */
  async returnCollateral(
    borrowerAddress: string,
    collateralTokenIds: string[]
  ): Promise<TransactionResult> {
    try {
      console.log(`Returning collateral to ${borrowerAddress}`);

      // NFT를 다시 borrower에게 반환
      for (const tokenId of collateralTokenIds) {
        const transferTx = await this.nftContract.transferFrom(
          this.loanContract.target,
          borrowerAddress,
          tokenId
        );
        await transferTx.wait();
      }

      return {
        txHash: 'batch_transfer',
        success: true,
      };
    } catch (error) {
      console.error('Error returning collateral:', error);
      throw new Error(`Failed to return collateral: ${(error as Error).message}`);
    }
  }

  /**
   * 트랜잭션 상태 확인
   */
  async getTransactionStatus(txHash: string): Promise<{ confirmed: boolean; success: boolean }> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      if (!receipt) {
        return { confirmed: false, success: false };
      }
      return {
        confirmed: true,
        success: receipt.status === 1,
      };
    } catch (error) {
      console.error('Error checking transaction status:', error);
      return { confirmed: false, success: false };
    }
  }
}
