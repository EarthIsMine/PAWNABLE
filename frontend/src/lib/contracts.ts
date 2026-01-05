import { BrowserProvider, Contract, parseUnits, formatUnits } from "ethers"
import PawnableLoanABI from "@/contracts/PawnableLoan.json"
import MockUSDTABI from "@/contracts/MockUSDT.json"
import PawnableNFTABI from "@/contracts/PawnableNFT.json"

// Contract addresses from environment variables
const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID || "1337"
const LOAN_CONTRACT = process.env.NEXT_PUBLIC_LOAN_CONTRACT!
const USDT_CONTRACT = process.env.NEXT_PUBLIC_USDT_CONTRACT!
const NFT_CONTRACT = process.env.NEXT_PUBLIC_NFT_CONTRACT!

export interface LoanRequest {
  loanId: number
  borrower: string
  lender: string
  nftContract: string
  tokenId: number
  loanAmount: bigint
  interestRate: number
  duration: number
  platformFee: bigint
  startTime: number
  endTime: number
  status: number // 0: PENDING, 1: ACTIVE, 2: REPAID, 3: LIQUIDATED, 4: CANCELLED
}

/**
 * Contract Service for interacting with PAWNABLE smart contracts
 */
export class ContractService {
  private provider: BrowserProvider | null = null
  private loanContract: Contract | null = null
  private usdtContract: Contract | null = null
  private nftContract: Contract | null = null

  /**
   * Initialize the contract service with the wallet provider
   */
  async initialize() {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("MetaMask is not installed")
    }

    this.provider = new BrowserProvider(window.ethereum)
    const signer = await this.provider.getSigner()

    // Initialize contracts with signer
    this.loanContract = new Contract(LOAN_CONTRACT, PawnableLoanABI.abi, signer)
    this.usdtContract = new Contract(USDT_CONTRACT, MockUSDTABI.abi, signer)
    this.nftContract = new Contract(NFT_CONTRACT, PawnableNFTABI.abi, signer)

    // Ensure correct network
    const network = await this.provider.getNetwork()
    if (network.chainId.toString() !== CHAIN_ID) {
      throw new Error(`Please switch to network with chainId ${CHAIN_ID}`)
    }
  }

  /**
   * Get USDT balance for an address
   */
  async getUSDTBalance(address: string): Promise<string> {
    if (!this.usdtContract) throw new Error("Contract not initialized")
    const balance = await this.usdtContract.balanceOf(address)
    return formatUnits(balance, 6) // USDT has 6 decimals
  }

  /**
   * Approve USDT spending for loan contract
   */
  async approveUSDT(amount: string): Promise<string> {
    if (!this.usdtContract) throw new Error("Contract not initialized")
    const amountWei = parseUnits(amount, 6)
    const tx = await this.usdtContract.approve(LOAN_CONTRACT, amountWei)
    await tx.wait()
    return tx.hash
  }

  /**
   * Check USDT allowance
   */
  async getUSDTAllowance(owner: string): Promise<string> {
    if (!this.usdtContract) throw new Error("Contract not initialized")
    const allowance = await this.usdtContract.allowance(owner, LOAN_CONTRACT)
    return formatUnits(allowance, 6)
  }

  /**
   * Get NFT owner
   */
  async getNFTOwner(tokenId: number): Promise<string> {
    if (!this.nftContract) throw new Error("Contract not initialized")
    return await this.nftContract.ownerOf(tokenId)
  }

  /**
   * Approve NFT for loan contract
   */
  async approveNFT(tokenId: number): Promise<string> {
    if (!this.nftContract) throw new Error("Contract not initialized")
    const tx = await this.nftContract.approve(LOAN_CONTRACT, tokenId)
    await tx.wait()
    return tx.hash
  }

  /**
   * Check if NFT is approved
   */
  async isNFTApproved(tokenId: number): Promise<boolean> {
    if (!this.nftContract) throw new Error("Contract not initialized")
    const approved = await this.nftContract.getApproved(tokenId)
    return approved.toLowerCase() === LOAN_CONTRACT.toLowerCase()
  }

  /**
   * Request a loan (borrower side)
   */
  async requestLoan(
    nftContract: string,
    tokenId: number,
    loanAmount: string,
    interestRate: number,
    duration: number
  ): Promise<{ txHash: string; loanId: number }> {
    if (!this.loanContract) throw new Error("Contract not initialized")

    const loanAmountWei = parseUnits(loanAmount, 6)
    const tx = await this.loanContract.requestLoan(
      nftContract,
      tokenId,
      loanAmountWei,
      interestRate,
      duration
    )

    const receipt = await tx.wait()

    // Extract loanId from event
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = this.loanContract!.interface.parseLog(log)
        return parsed?.name === "LoanRequested"
      } catch {
        return false
      }
    })

    let loanId = 0
    if (event) {
      const parsed = this.loanContract.interface.parseLog(event)
      loanId = Number(parsed?.args[0])
    }

    return { txHash: tx.hash, loanId }
  }

  /**
   * Match a loan (lender side)
   */
  async matchLoan(loanId: number): Promise<string> {
    if (!this.loanContract) throw new Error("Contract not initialized")
    const tx = await this.loanContract.matchLoan(loanId)
    await tx.wait()
    return tx.hash
  }

  /**
   * Repay a loan (borrower side)
   */
  async repayLoan(loanId: number): Promise<string> {
    if (!this.loanContract) throw new Error("Contract not initialized")
    const tx = await this.loanContract.repayLoan(loanId)
    await tx.wait()
    return tx.hash
  }

  /**
   * Liquidate a loan (lender side, after expiry)
   */
  async liquidateLoan(loanId: number): Promise<string> {
    if (!this.loanContract) throw new Error("Contract not initialized")
    const tx = await this.loanContract.liquidateLoan(loanId)
    await tx.wait()
    return tx.hash
  }

  /**
   * Cancel a loan request (borrower side, only PENDING)
   */
  async cancelLoan(loanId: number): Promise<string> {
    if (!this.loanContract) throw new Error("Contract not initialized")
    const tx = await this.loanContract.cancelLoan(loanId)
    await tx.wait()
    return tx.hash
  }

  /**
   * Get loan details by ID
   */
  async getLoan(loanId: number): Promise<LoanRequest> {
    if (!this.loanContract) throw new Error("Contract not initialized")
    const loan = await this.loanContract.loans(loanId)

    return {
      loanId,
      borrower: loan.borrower,
      lender: loan.lender,
      nftContract: loan.nftContract,
      tokenId: Number(loan.tokenId),
      loanAmount: loan.loanAmount,
      interestRate: Number(loan.interestRate),
      duration: Number(loan.duration),
      platformFee: loan.platformFee,
      startTime: Number(loan.startTime),
      endTime: Number(loan.endTime),
      status: Number(loan.status),
    }
  }

  /**
   * Get total loan count
   */
  async getLoanCount(): Promise<number> {
    if (!this.loanContract) throw new Error("Contract not initialized")
    const count = await this.loanContract.loanIdCounter()
    return Number(count)
  }

  /**
   * Get platform fee in basis points (e.g., 10 = 0.1%)
   */
  async getPlatformFee(): Promise<number> {
    if (!this.loanContract) throw new Error("Contract not initialized")
    const fee = await this.loanContract.platformFeeBps()
    return Number(fee)
  }

  /**
   * Calculate total repayment amount (principal + interest + platform fee)
   */
  calculateRepaymentAmount(
    loanAmount: bigint,
    interestRate: number,
    platformFeeBps: number
  ): bigint {
    const interest = (loanAmount * BigInt(interestRate)) / BigInt(10000)
    const fee = (loanAmount * BigInt(platformFeeBps)) / BigInt(10000)
    return loanAmount + interest + fee
  }

  /**
   * Format USDT amount (6 decimals)
   */
  formatUSDT(amount: bigint): string {
    return formatUnits(amount, 6)
  }

  /**
   * Parse USDT amount (6 decimals)
   */
  parseUSDT(amount: string): bigint {
    return parseUnits(amount, 6)
  }

  /**
   * Get contract addresses
   */
  getAddresses() {
    return {
      loan: LOAN_CONTRACT,
      usdt: USDT_CONTRACT,
      nft: NFT_CONTRACT,
    }
  }
}

// Singleton instance
export const contractService = new ContractService()
