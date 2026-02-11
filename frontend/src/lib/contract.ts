import { BrowserProvider, Contract } from "ethers"

const LOAN_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_LOAN_CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_LOAN_CONTRACT || ""
const NATIVE_TOKEN = "0x0000000000000000000000000000000000000000"

const LOAN_ABI = [
  "function createLoanRequest(address collateralToken, uint256 collateralAmount, address principalToken, uint256 principalAmount, uint256 interestBps, uint256 duration) external payable returns (uint256 requestId)",
  "function cancelLoanRequest(uint256 requestId) external",
  "function fundLoan(uint256 requestId) external payable returns (uint256 loanId)",
  "function repayLoan(uint256 loanId) external payable",
  "function claimCollateral(uint256 loanId) external",
  "function getLoanRequest(uint256 requestId) external view returns (tuple(address borrower, address collateralToken, uint256 collateralAmount, address principalToken, uint256 principalAmount, uint256 interestBps, uint256 duration, uint8 status))",
  "function getLoan(uint256 loanId) external view returns (tuple(uint256 requestId, address borrower, address lender, address collateralToken, uint256 collateralAmount, address principalToken, uint256 principalAmount, uint256 interestBps, uint256 startTimestamp, uint256 dueTimestamp, uint8 status))",
  "function getRepayAmount(uint256 loanId) external view returns (uint256)",
  "function nextRequestId() external view returns (uint256)",
  "function nextLoanId() external view returns (uint256)",
  "event LoanRequestCreated(uint256 indexed requestId, address indexed borrower, address collateralToken, uint256 collateralAmount, address principalToken, uint256 principalAmount, uint256 interestBps, uint256 duration)",
  "event LoanRequestCancelled(uint256 indexed requestId, address indexed borrower)",
  "event LoanFunded(uint256 indexed loanId, uint256 indexed requestId, address indexed lender, address borrower, uint256 startTimestamp, uint256 dueTimestamp)",
  "event LoanRepaid(uint256 indexed loanId, address indexed borrower, uint256 repayAmount)",
  "event CollateralClaimed(uint256 indexed loanId, address indexed lender, uint256 collateralAmount)",
]

const TOKEN_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
]

export interface TransactionResult {
  hash: string
  success: boolean
  blockNumber?: number
}

export interface CreateLoanRequestResult extends TransactionResult {
  requestId: string
}

export interface FundLoanResult extends TransactionResult {
  loanId: string
}

export class ContractService {
  private provider: BrowserProvider | null = null
  private loanContract: Contract | null = null

  async initialize() {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("MetaMask is not installed")
    }

    this.provider = new BrowserProvider(window.ethereum)
    const signer = await this.provider.getSigner()
    this.loanContract = new Contract(LOAN_CONTRACT_ADDRESS, LOAN_ABI, signer)
  }

  private async ensureInitialized() {
    if (!this.loanContract) {
      await this.initialize()
    }
  }

  /**
   * Borrower: 대출 요청 생성 (담보를 컨트랙트에 lock)
   */
  async createLoanRequest(args: {
    collateralToken: string
    collateralAmount: string
    principalToken: string
    principalAmount: string
    interestBps: number
    durationSeconds: number
  }): Promise<CreateLoanRequestResult> {
    await this.ensureInitialized()

    const isNativeCollateral = args.collateralToken.toLowerCase() === NATIVE_TOKEN

    // ERC20 담보인 경우 approve 먼저
    if (!isNativeCollateral) {
      const signer = await this.provider!.getSigner()
      const tokenContract = new Contract(args.collateralToken, TOKEN_ABI, signer)
      const signerAddress = await signer.getAddress()
      const allowance = await tokenContract.allowance(signerAddress, LOAN_CONTRACT_ADDRESS)
      if (BigInt(allowance) < BigInt(args.collateralAmount)) {
        const approveTx = await tokenContract.approve(LOAN_CONTRACT_ADDRESS, args.collateralAmount)
        await approveTx.wait()
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    const tx = await this.loanContract!.createLoanRequest(
      args.collateralToken,
      args.collateralAmount,
      args.principalToken,
      args.principalAmount,
      args.interestBps,
      args.durationSeconds,
      isNativeCollateral ? { value: args.collateralAmount } : {}
    )

    const receipt = await tx.wait()

    let requestId = "0"
    const event = receipt.logs.find((log: any) => {
      try {
        return this.loanContract!.interface.parseLog(log)?.name === "LoanRequestCreated"
      } catch { return false }
    })
    if (event) {
      const parsed = this.loanContract!.interface.parseLog(event)
      requestId = String(parsed?.args?.requestId ?? "0")
    }

    return {
      hash: receipt.hash,
      success: receipt.status === 1,
      blockNumber: receipt.blockNumber,
      requestId,
    }
  }

  /**
   * Borrower: 대출 요청 취소 (담보 반환)
   */
  async cancelLoanRequest(requestId: number | string): Promise<TransactionResult> {
    await this.ensureInitialized()

    const tx = await this.loanContract!.cancelLoanRequest(requestId)
    const receipt = await tx.wait()

    return {
      hash: receipt.hash,
      success: receipt.status === 1,
      blockNumber: receipt.blockNumber,
    }
  }

  /**
   * Lender: 자금 제공 (원금을 borrower에게 전송, 대출 생성)
   */
  async fundLoan(args: {
    requestId: number | string
    principalToken: string
    principalAmount: string
  }): Promise<FundLoanResult> {
    await this.ensureInitialized()

    const isNativePrincipal = args.principalToken.toLowerCase() === NATIVE_TOKEN

    // ERC20 원금인 경우 approve 먼저
    if (!isNativePrincipal) {
      const signer = await this.provider!.getSigner()
      const tokenContract = new Contract(args.principalToken, TOKEN_ABI, signer)
      const signerAddress = await signer.getAddress()
      const allowance = await tokenContract.allowance(signerAddress, LOAN_CONTRACT_ADDRESS)
      if (BigInt(allowance) < BigInt(args.principalAmount)) {
        const approveTx = await tokenContract.approve(LOAN_CONTRACT_ADDRESS, args.principalAmount)
        await approveTx.wait()
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    const tx = isNativePrincipal
      ? await this.loanContract!.fundLoan(args.requestId, { value: args.principalAmount })
      : await this.loanContract!.fundLoan(args.requestId)

    const receipt = await tx.wait()

    let loanId = "0"
    const event = receipt.logs.find((log: any) => {
      try {
        return this.loanContract!.interface.parseLog(log)?.name === "LoanFunded"
      } catch { return false }
    })
    if (event) {
      const parsed = this.loanContract!.interface.parseLog(event)
      loanId = String(parsed?.args?.loanId ?? "0")
    }

    return {
      hash: receipt.hash,
      success: receipt.status === 1,
      blockNumber: receipt.blockNumber,
      loanId,
    }
  }

  /**
   * Borrower: 상환 (원금+이자 → lender, 담보 → borrower)
   */
  async repayLoan(args: {
    loanId: number | string
    principalToken: string
    repayAmount: string
  }): Promise<TransactionResult> {
    await this.ensureInitialized()

    const isNativePrincipal = args.principalToken.toLowerCase() === NATIVE_TOKEN

    if (!isNativePrincipal) {
      const signer = await this.provider!.getSigner()
      const tokenContract = new Contract(args.principalToken, TOKEN_ABI, signer)
      const signerAddress = await signer.getAddress()
      const allowance = await tokenContract.allowance(signerAddress, LOAN_CONTRACT_ADDRESS)
      if (BigInt(allowance) < BigInt(args.repayAmount)) {
        const approveTx = await tokenContract.approve(LOAN_CONTRACT_ADDRESS, args.repayAmount)
        await approveTx.wait()
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    const tx = isNativePrincipal
      ? await this.loanContract!.repayLoan(args.loanId, { value: args.repayAmount })
      : await this.loanContract!.repayLoan(args.loanId)

    const receipt = await tx.wait()

    return {
      hash: receipt.hash,
      success: receipt.status === 1,
      blockNumber: receipt.blockNumber,
    }
  }

  /**
   * 담보 청산 (기한 초과, 누구나 호출 가능)
   */
  async claimCollateral(loanId: number | string): Promise<TransactionResult> {
    await this.ensureInitialized()

    const tx = await this.loanContract!.claimCollateral(loanId)
    const receipt = await tx.wait()

    return {
      hash: receipt.hash,
      success: receipt.status === 1,
      blockNumber: receipt.blockNumber,
    }
  }

  /**
   * 상환 금액 조회
   */
  async getRepayAmount(loanId: number | string): Promise<string> {
    await this.ensureInitialized()
    const amount = await this.loanContract!.getRepayAmount(loanId)
    return amount.toString()
  }

  /**
   * ERC20 토큰 잔액 조회
   */
  async getTokenBalance(tokenAddress: string, userAddress: string): Promise<string> {
    await this.ensureInitialized()
    const signer = await this.provider!.getSigner()
    const tokenContract = new Contract(tokenAddress, TOKEN_ABI, signer)
    const balance = await tokenContract.balanceOf(userAddress)
    return balance.toString()
  }

  /**
   * 컨트랙트 주소 반환
   */
  getContractAddress(): string {
    return LOAN_CONTRACT_ADDRESS
  }
}

export const contractService = new ContractService()
