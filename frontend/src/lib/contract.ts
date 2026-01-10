import { ethers, BrowserProvider, Contract } from "ethers"

// 컨트랙트 주소 (환경변수로 관리)
const LOAN_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_LOAN_CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_LOAN_CONTRACT || "0x68B1D87F95878fE05B998F19b66F4baba5De1aed"
const USDT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_USDT_CONTRACT || "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1"
const COLLATERAL_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_NFT_CONTRACT || "0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE"
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8085/api"

// ABI 정의
const LOAN_ABI = [
  "function requestLoanWithToken(string loanId, address loanToken, uint256 loanAmount, uint256 repayAmount, address collateralToken, uint256 collateralAmount, uint256 dueTimestamp) external",
  "function requestLoanWithETH(string loanId, address loanToken, uint256 loanAmount, uint256 repayAmount, uint256 dueTimestamp) external payable",
  "function matchLoan(string loanId) external",
  "function repayLoan(string loanId) external",
  "function liquidateLoan(string loanId) external",
  "function cancelLoan(string loanId) external",
  "function getLoan(string loanId) external view returns (tuple(string loanId, address borrower, address lender, address loanToken, uint256 loanAmount, uint256 repayAmount, uint8 collateralType, address collateralToken, uint256 collateralAmount, uint256 dueTimestamp, uint8 status, uint256 createdAt, uint256 matchedAt, uint256 closedAt))",
  "event LoanRequested(string indexed loanId, address indexed borrower, address loanToken, uint256 loanAmount, uint256 repayAmount, uint8 collateralType, address collateralToken, uint256 collateralAmount, uint256 dueTimestamp)",
  "event LoanMatched(string indexed loanId, address indexed borrower, address indexed lender, uint256 loanAmount)",
  "event LoanRepaid(string indexed loanId, address indexed borrower, uint256 repayAmount)",
  "event LoanLiquidated(string indexed loanId, address indexed lender, uint256 collateralAmount)",
]

const TOKEN_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
]

export interface TransactionResult {
  hash: string
  success: boolean
  blockNumber?: number
}

export class ContractService {
  private provider: BrowserProvider | null = null
  private loanContract: Contract | null = null
  private usdtContract: Contract | null = null
  private collateralContract: Contract | null = null

  async initialize() {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("MetaMask is not installed")
    }

    this.provider = new BrowserProvider(window.ethereum)
    const signer = await this.provider.getSigner()

    this.loanContract = new Contract(LOAN_CONTRACT_ADDRESS, LOAN_ABI, signer)
    this.usdtContract = new Contract(USDT_CONTRACT_ADDRESS, TOKEN_ABI, signer)
    this.collateralContract = new Contract(COLLATERAL_TOKEN_ADDRESS, TOKEN_ABI, signer)
  }

  /**
   * 대출 요청 생성 (차입자) - ETH를 담보로 사용
   * ETH를 msg.value로 전송
   */
  async requestLoan(
    loanId: string,
    loanAmount: string,
    repayAmount: string,
    collateralAmount: string,
    dueTimestamp: number
  ): Promise<TransactionResult> {
    if (!this.loanContract) {
      await this.initialize()
    }

    try {
      console.log("Requesting loan with ETH collateral...")
      const loanAmountFixed = Number(loanAmount).toFixed(6)
      const repayAmountFixed = Number(repayAmount).toFixed(6)
      const collateralAmountFixed = Number(collateralAmount).toFixed(6)

      const loanAmountWei = ethers.parseUnits(loanAmountFixed, 6) // USDT 6 decimals
      const repayAmountWei = ethers.parseUnits(repayAmountFixed, 6)
      const collateralAmountWei = ethers.parseEther(collateralAmountFixed) // ETH 18 decimals

      // ETH를 담보로 대출 요청 (msg.value로 ETH 전송)
      const tx = await this.loanContract!.requestLoanWithETH(
        loanId,
        USDT_CONTRACT_ADDRESS,
        loanAmountWei,
        repayAmountWei,
        dueTimestamp,
        { value: collateralAmountWei } // ETH를 msg.value로 전송
      )

      const receipt = await tx.wait()
      console.log("Loan requested:", receipt.hash)

      return {
        hash: receipt.hash,
        success: receipt.status === 1,
        blockNumber: receipt.blockNumber,
      }
    } catch (error: any) {
      console.error("Error requesting loan:", error)
      throw new Error(error.message || "Failed to request loan")
    }
  }

  /**
   * 대출 매칭 (대출자)
   * 1. USDT approve
   * 2. matchLoan 호출
   */
  async matchLoan(loanId: string, loanAmount: string): Promise<TransactionResult> {
    if (!this.usdtContract || !this.loanContract) {
      await this.initialize()
    }

    try {
      const signer = await this.provider!.getSigner()
      const signerAddress = await signer.getAddress()

      // 대출자의 USDT 잔액 확인
      const balanceBefore = await this.usdtContract!.balanceOf(signerAddress)
      console.log("Lender USDT balance before:", ethers.formatUnits(balanceBefore, 6))

      // 1. USDT를 대출 컨트랙트에 approve
      console.log("Approving USDT...")
      const loanAmountFixed = Number(loanAmount).toFixed(6)
      const loanAmountWei = ethers.parseUnits(loanAmountFixed, 6)
      console.log("Approving amount:", ethers.formatUnits(loanAmountWei, 6), "USDT")

      const approveTx = await this.usdtContract!.approve(LOAN_CONTRACT_ADDRESS, loanAmountWei)
      await approveTx.wait()
      console.log("USDT approved:", approveTx.hash)

      // Allowance 확인
      const allowance = await this.usdtContract!.allowance(signerAddress, LOAN_CONTRACT_ADDRESS)
      console.log("Allowance after approve:", ethers.formatUnits(allowance, 6), "USDT")

      // 2. matchLoan 호출
      console.log("Matching loan with ID:", loanId)
      const tx = await this.loanContract!.matchLoan(loanId)
      console.log("Transaction sent:", tx.hash)

      const receipt = await tx.wait()
      console.log("Loan matched! Receipt:", receipt.hash)
      console.log("Transaction status:", receipt.status === 1 ? "SUCCESS" : "FAILED")

      // 대출자의 USDT 잔액 확인 (after)
      const balanceAfter = await this.usdtContract!.balanceOf(signerAddress)
      console.log("Lender USDT balance after:", ethers.formatUnits(balanceAfter, 6))
      console.log("USDT transferred:", ethers.formatUnits(balanceBefore - balanceAfter, 6))

      return {
        hash: receipt.hash,
        success: receipt.status === 1,
        blockNumber: receipt.blockNumber,
      }
    } catch (error: any) {
      console.error("Error matching loan:", error)
      throw new Error(error.message || "Failed to match loan")
    }
  }

  /**
   * 대출 상환 (차입자)
   * 1. USDT approve
   * 2. repayLoan 호출
   */
  async repayLoan(loanId: string, repayAmount: string): Promise<TransactionResult> {
    if (!this.usdtContract || !this.loanContract) {
      await this.initialize()
    }

    try {
      // 1. USDT를 대출 컨트랙트에 approve
      console.log("Approving USDT for repayment...")
      const repayAmountFixed = Number(repayAmount).toFixed(6)
      const repayAmountWei = ethers.parseUnits(repayAmountFixed, 6)

      const approveTx = await this.usdtContract!.approve(LOAN_CONTRACT_ADDRESS, repayAmountWei)
      await approveTx.wait()
      console.log("USDT approved:", approveTx.hash)

      // 2. repayLoan 호출
      console.log("Repaying loan...")
      const tx = await this.loanContract!.repayLoan(loanId)

      const receipt = await tx.wait()
      console.log("Loan repaid:", receipt.hash)

      return {
        hash: receipt.hash,
        success: receipt.status === 1,
        blockNumber: receipt.blockNumber,
      }
    } catch (error: any) {
      console.error("Error repaying loan:", error)
      throw new Error(error.message || "Failed to repay loan")
    }
  }

  /**
   * 대출 청산
   */
  async liquidateLoan(loanId: string): Promise<TransactionResult> {
    if (!this.loanContract) {
      await this.initialize()
    }

    try {
      console.log("Liquidating loan...")
      const tx = await this.loanContract!.liquidateLoan(loanId)

      const receipt = await tx.wait()
      console.log("Loan liquidated:", receipt.hash)

      return {
        hash: receipt.hash,
        success: receipt.status === 1,
        blockNumber: receipt.blockNumber,
      }
    } catch (error: any) {
      console.error("Error liquidating loan:", error)
      throw new Error(error.message || "Failed to liquidate loan")
    }
  }

  /**
   * 대출 취소 (차입자)
   */
  async cancelLoan(loanId: string): Promise<TransactionResult> {
    if (!this.loanContract) {
      await this.initialize()
    }

    try {
      console.log("Cancelling loan...")
      const tx = await this.loanContract!.cancelLoan(loanId)

      const receipt = await tx.wait()
      console.log("Loan cancelled:", receipt.hash)

      return {
        hash: receipt.hash,
        success: receipt.status === 1,
        blockNumber: receipt.blockNumber,
      }
    } catch (error: any) {
      console.error("Error cancelling loan:", error)
      throw new Error(error.message || "Failed to cancel loan")
    }
  }

  /**
   * USDT 잔액 확인
   */
  async getUSDTBalance(address: string): Promise<string> {
    if (!this.usdtContract) {
      await this.initialize()
    }

    try {
      const balance = await this.usdtContract!.balanceOf(address)
      return ethers.formatUnits(balance, 6) // USDT 6 decimals
    } catch (error: any) {
      console.error("Error getting USDT balance:", error)
      throw new Error(error.message || "Failed to get USDT balance")
    }
  }

  /**
   * 담보 토큰 잔액 확인
   */
  async getCollateralBalance(address: string): Promise<string> {
    if (!this.collateralContract) {
      await this.initialize()
    }

    try {
      const balance = await this.collateralContract!.balanceOf(address)
      return ethers.formatUnits(balance, 18) // 일반적으로 18 decimals
    } catch (error: any) {
      console.error("Error getting collateral balance:", error)
      throw new Error(error.message || "Failed to get collateral balance")
    }
  }

  /**
   * 대출 매칭 완료 후 백엔드에 알림
   */
  async notifyBackendMatchLoan(loanId: string, txHash: string): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/loans/${loanId}/activate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ txHash }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to notify backend")
      }
    } catch (error: any) {
      console.error("Error notifying backend:", error)
      throw new Error(error.message || "Failed to notify backend")
    }
  }

  /**
   * 대출 상환 완료 후 백엔드에 알림
   */
  async notifyBackendRepayLoan(loanId: string, txHash: string): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/loans/${loanId}/repay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ txHash }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to notify backend")
      }
    } catch (error: any) {
      console.error("Error notifying backend:", error)
      throw new Error(error.message || "Failed to notify backend")
    }
  }

  /**
   * 대출 청산 완료 후 백엔드에 알림
   */
  async notifyBackendLiquidateLoan(loanId: string, txHash: string): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/loans/${loanId}/liquidate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ txHash }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to notify backend")
      }
    } catch (error: any) {
      console.error("Error notifying backend:", error)
      throw new Error(error.message || "Failed to notify backend")
    }
  }

  /**
   * 대출 매칭 (블록체인 + 백엔드 통합)
   */
  async matchLoanWithBackend(loanId: string, loanAmount: string): Promise<TransactionResult> {
    const result = await this.matchLoan(loanId, loanAmount)
    await this.notifyBackendMatchLoan(loanId, result.hash)
    return result
  }

  /**
   * 대출 상환 (블록체인 + 백엔드 통합)
   */
  async repayLoanWithBackend(loanId: string, repayAmount: string): Promise<TransactionResult> {
    const result = await this.repayLoan(loanId, repayAmount)
    await this.notifyBackendRepayLoan(loanId, result.hash)
    return result
  }

  /**
   * 대출 청산 (블록체인 + 백엔드 통합)
   */
  async liquidateLoanWithBackend(loanId: string): Promise<TransactionResult> {
    const result = await this.liquidateLoan(loanId)
    await this.notifyBackendLiquidateLoan(loanId, result.hash)
    return result
  }
}

export const contractService = new ContractService()
