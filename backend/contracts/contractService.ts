import { ethers } from 'ethers';
import { LOAN_CONTRACT_ABI, NFT_CONTRACT_ABI, TOKEN_CONTRACT_ABI } from './abis';

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
  private tokenContract: ethers.Contract;

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

    // 토큰 컨트랙트 초기화
    const tokenContractAddress = process.env.TOKEN_CONTRACT_ADDRESS;
    if (!tokenContractAddress) {
      throw new Error('TOKEN_CONTRACT_ADDRESS is not set in environment variables');
    }
    this.tokenContract = new ethers.Contract(
      tokenContractAddress,
      TOKEN_CONTRACT_ABI,
      this.wallet
    );
  }

  /**
   * 대출 활성화 - 대출자가 matchLoan을 호출하여 토큰을 전송하고 대출 활성화
   * 주의: 이 함수는 서버 지갑(대출자 역할)으로 실행됩니다
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
      console.log(`Activating loan ${loanId} - Lender: ${lenderAddress}`);

      // 대출자 지갑으로 전환 (실제로는 대출자의 private key가 필요)
      // 현재는 서버 지갑을 사용하므로 서버가 대출자 역할을 합니다
      const lenderWallet = this.wallet; // 실제로는 대출자의 지갑이어야 함

      // 1. 대출자가 토큰을 대출 컨트랙트에 approve
      console.log(`Approving ${loanAmount} tokens for loan contract`);
      const tokenWithLender = this.tokenContract.connect(lenderWallet) as any;
      const loanAmountWei = ethers.parseUnits(loanAmount, 6); // USDT는 6 decimals

      const approveTx = await tokenWithLender.approve(
        this.loanContract.target,
        loanAmountWei
      );
      await approveTx.wait();
      console.log(`Tokens approved: ${approveTx.hash}`);

      // 2. 대출자가 matchLoan 호출
      console.log(`Matching loan ${loanId} on-chain`);
      const loanContractWithLender = this.loanContract.connect(lenderWallet) as any;
      const tx = await loanContractWithLender.matchLoan(loanId);

      const receipt = await tx.wait();
      console.log(`Loan matched successfully: ${receipt.hash}`);

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
   * 대출 상환 - 차입자가 상환금을 지불하고 담보를 반환받음
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

      // 차입자 지갑으로 전환 (실제로는 차입자의 private key가 필요)
      const borrowerWallet = this.wallet;

      // 1. 차입자가 상환 금액을 대출 컨트랙트에 approve
      console.log(`Approving ${repayAmount} tokens for repayment`);
      const tokenWithBorrower = this.tokenContract.connect(borrowerWallet) as any;
      const repayAmountWei = ethers.parseUnits(repayAmount, 6); // USDT는 6 decimals

      const approveTx = await tokenWithBorrower.approve(
        this.loanContract.target,
        repayAmountWei
      );
      await approveTx.wait();
      console.log(`Tokens approved for repayment: ${approveTx.hash}`);

      // 2. 차입자가 repayLoan 호출 (컨트랙트가 자동으로 담보 반환)
      const loanContractWithBorrower = this.loanContract.connect(borrowerWallet) as any;
      const tx = await loanContractWithBorrower.repayLoan(loanId);

      const receipt = await tx.wait();
      console.log(`Loan repaid successfully: ${receipt.hash}`);

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
   * 누구나 호출 가능하지만, 담보는 대출자에게 전송됨
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
      // 누구나 호출 가능하므로 서버 지갑으로 호출
      const tx = await (this.loanContract as any).liquidateLoan(loanId);

      const receipt = await tx.wait();
      console.log(`Loan liquidated successfully: ${receipt.hash}`);

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
