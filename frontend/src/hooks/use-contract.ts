import { useState, useEffect } from "react"
import { contractService, type LoanRequest } from "@/lib/contracts"
import { useToast } from "@/hooks/use-toast"

/**
 * Hook for interacting with PAWNABLE smart contracts
 */
export function useContract() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  /**
   * Initialize contracts
   */
  const initialize = async () => {
    try {
      setIsLoading(true)
      await contractService.initialize()
      setIsInitialized(true)
      return true
    } catch (error: any) {
      toast({
        title: "Contract initialization failed",
        description: error.message,
        variant: "destructive",
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Get USDT balance
   */
  const getUSDTBalance = async (address: string) => {
    try {
      return await contractService.getUSDTBalance(address)
    } catch (error: any) {
      toast({
        title: "Failed to get balance",
        description: error.message,
        variant: "destructive",
      })
      return "0"
    }
  }

  /**
   * Approve USDT spending
   */
  const approveUSDT = async (amount: string) => {
    try {
      setIsLoading(true)
      const txHash = await contractService.approveUSDT(amount)
      toast({
        title: "USDT Approved",
        description: `Transaction: ${txHash.slice(0, 10)}...`,
      })
      return txHash
    } catch (error: any) {
      toast({
        title: "Approval failed",
        description: error.message,
        variant: "destructive",
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Approve NFT
   */
  const approveNFT = async (tokenId: number) => {
    try {
      setIsLoading(true)
      const txHash = await contractService.approveNFT(tokenId)
      toast({
        title: "NFT Approved",
        description: `Transaction: ${txHash.slice(0, 10)}...`,
      })
      return txHash
    } catch (error: any) {
      toast({
        title: "NFT approval failed",
        description: error.message,
        variant: "destructive",
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Request a loan
   */
  const requestLoan = async (
    nftContract: string,
    tokenId: number,
    loanAmount: string,
    interestRate: number,
    duration: number
  ) => {
    try {
      setIsLoading(true)
      const result = await contractService.requestLoan(
        nftContract,
        tokenId,
        loanAmount,
        interestRate,
        duration
      )
      toast({
        title: "Loan Requested",
        description: `Loan ID: ${result.loanId}`,
      })
      return result
    } catch (error: any) {
      toast({
        title: "Loan request failed",
        description: error.message,
        variant: "destructive",
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Match a loan (lender provides funds)
   */
  const matchLoan = async (loanId: number) => {
    try {
      setIsLoading(true)
      const txHash = await contractService.matchLoan(loanId)
      toast({
        title: "Loan Matched",
        description: `Transaction: ${txHash.slice(0, 10)}...`,
      })
      return txHash
    } catch (error: any) {
      toast({
        title: "Loan matching failed",
        description: error.message,
        variant: "destructive",
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Repay a loan
   */
  const repayLoan = async (loanId: number) => {
    try {
      setIsLoading(true)
      const txHash = await contractService.repayLoan(loanId)
      toast({
        title: "Loan Repaid",
        description: `Transaction: ${txHash.slice(0, 10)}...`,
      })
      return txHash
    } catch (error: any) {
      toast({
        title: "Loan repayment failed",
        description: error.message,
        variant: "destructive",
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Liquidate a loan
   */
  const liquidateLoan = async (loanId: number) => {
    try {
      setIsLoading(true)
      const txHash = await contractService.liquidateLoan(loanId)
      toast({
        title: "Loan Liquidated",
        description: `Transaction: ${txHash.slice(0, 10)}...`,
      })
      return txHash
    } catch (error: any) {
      toast({
        title: "Liquidation failed",
        description: error.message,
        variant: "destructive",
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Cancel a loan request
   */
  const cancelLoan = async (loanId: number) => {
    try {
      setIsLoading(true)
      const txHash = await contractService.cancelLoan(loanId)
      toast({
        title: "Loan Cancelled",
        description: `Transaction: ${txHash.slice(0, 10)}...`,
      })
      return txHash
    } catch (error: any) {
      toast({
        title: "Cancellation failed",
        description: error.message,
        variant: "destructive",
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Get loan details
   */
  const getLoan = async (loanId: number): Promise<LoanRequest | null> => {
    try {
      return await contractService.getLoan(loanId)
    } catch (error: any) {
      toast({
        title: "Failed to get loan",
        description: error.message,
        variant: "destructive",
      })
      return null
    }
  }

  /**
   * Get all loans
   */
  const getAllLoans = async (): Promise<LoanRequest[]> => {
    try {
      const count = await contractService.getLoanCount()
      const loans: LoanRequest[] = []

      for (let i = 0; i < count; i++) {
        const loan = await contractService.getLoan(i)
        loans.push(loan)
      }

      return loans
    } catch (error: any) {
      toast({
        title: "Failed to get loans",
        description: error.message,
        variant: "destructive",
      })
      return []
    }
  }

  return {
    isInitialized,
    isLoading,
    initialize,
    getUSDTBalance,
    approveUSDT,
    approveNFT,
    requestLoan,
    matchLoan,
    repayLoan,
    liquidateLoan,
    cancelLoan,
    getLoan,
    getAllLoans,
    contractService,
  }
}
