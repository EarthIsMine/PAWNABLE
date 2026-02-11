import { useState } from "react"
import { contractService } from "@/lib/contract"
import type { TransactionResult, CreateLoanRequestResult, FundLoanResult } from "@/lib/contract"
import { useToast } from "@/hooks/use-toast"

export function useContract() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

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

  const createLoanRequest = async (args: {
    collateralToken: string
    collateralAmount: string
    principalToken: string
    principalAmount: string
    interestBps: number
    durationSeconds: number
  }): Promise<CreateLoanRequestResult | null> => {
    try {
      setIsLoading(true)
      const result = await contractService.createLoanRequest(args)
      toast({
        title: "Loan request created",
        description: `Request ID: ${result.requestId}`,
      })
      return result
    } catch (error: any) {
      toast({
        title: "Loan request failed",
        description: error.message,
        variant: "destructive",
      })
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const cancelLoanRequest = async (requestId: number | string): Promise<TransactionResult | null> => {
    try {
      setIsLoading(true)
      const result = await contractService.cancelLoanRequest(requestId)
      toast({
        title: "Loan request cancelled",
        description: `Tx: ${result.hash.slice(0, 10)}...`,
      })
      return result
    } catch (error: any) {
      toast({
        title: "Cancellation failed",
        description: error.message,
        variant: "destructive",
      })
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const fundLoan = async (args: {
    requestId: number | string
    principalToken: string
    principalAmount: string
  }): Promise<FundLoanResult | null> => {
    try {
      setIsLoading(true)
      const result = await contractService.fundLoan(args)
      toast({
        title: "Loan funded",
        description: `Loan ID: ${result.loanId}`,
      })
      return result
    } catch (error: any) {
      toast({
        title: "Funding failed",
        description: error.message,
        variant: "destructive",
      })
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const repayLoan = async (args: {
    loanId: number | string
    principalToken: string
    repayAmount: string
  }): Promise<TransactionResult | null> => {
    try {
      setIsLoading(true)
      const result = await contractService.repayLoan(args)
      toast({
        title: "Loan repaid",
        description: `Tx: ${result.hash.slice(0, 10)}...`,
      })
      return result
    } catch (error: any) {
      toast({
        title: "Repayment failed",
        description: error.message,
        variant: "destructive",
      })
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const claimCollateral = async (loanId: number | string): Promise<TransactionResult | null> => {
    try {
      setIsLoading(true)
      const result = await contractService.claimCollateral(loanId)
      toast({
        title: "Collateral claimed",
        description: `Tx: ${result.hash.slice(0, 10)}...`,
      })
      return result
    } catch (error: any) {
      toast({
        title: "Claim failed",
        description: error.message,
        variant: "destructive",
      })
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const getRepayAmount = async (loanId: number | string): Promise<string> => {
    try {
      return await contractService.getRepayAmount(loanId)
    } catch (error: any) {
      toast({
        title: "Failed to get repay amount",
        description: error.message,
        variant: "destructive",
      })
      return "0"
    }
  }

  return {
    isInitialized,
    isLoading,
    initialize,
    createLoanRequest,
    cancelLoanRequest,
    fundLoan,
    repayLoan,
    claimCollateral,
    getRepayAmount,
    contractService,
  }
}
