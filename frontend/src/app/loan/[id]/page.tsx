"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { loanAPI, assetAPI } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Loader2, ArrowLeft, Calendar, TrendingUp, Coins, Shield, AlertCircle } from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function LoanDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isConnected } = useAuth()
  const { toast } = useToast()

  const [loan, setLoan] = useState<any>(null)
  const [assets, setAssets] = useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [actionType, setActionType] = useState<"activate" | "repay" | "liquidate" | "cancel" | null>(null)

  useEffect(() => {
    loadData()
  }, [params.id])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [loanData, assetsData] = await Promise.all([loanAPI.getById(params.id as string), assetAPI.getAll()])

      setLoan(loanData)

      const assetMap: Record<string, any> = {}
      assetsData.forEach((asset: any) => {
        assetMap[asset.asset_id] = asset
      })
      setAssets(assetMap)
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load loan details",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAction = async () => {
    if (!actionType) return

    setIsProcessing(true)
    setShowConfirmDialog(false)

    try {
      switch (actionType) {
        case "activate":
          await loanAPI.activate(loan.loan_id)
          toast({ title: "Success", description: "Loan activated successfully" })
          break
        case "repay":
          await loanAPI.repay(loan.loan_id)
          toast({ title: "Success", description: "Loan repaid successfully" })
          break
        case "liquidate":
          await loanAPI.liquidate(loan.loan_id)
          toast({ title: "Success", description: "Loan liquidated successfully" })
          break
        case "cancel":
          await loanAPI.cancel(loan.loan_id)
          toast({ title: "Success", description: "Loan cancelled successfully" })
          router.push("/dashboard")
          return
      }
      loadData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${actionType} loan`,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setActionType(null)
    }
  }

  const confirmAction = (type: typeof actionType) => {
    setActionType(type)
    setShowConfirmDialog(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (!loan) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p>Loan not found</p>
        </div>
      </div>
    )
  }

  const loanAsset = assets[loan.loan_asset_id]
  const dueDate = new Date(loan.repay_due_at)
  const isOverdue = dueDate < new Date()
  const isBorrower = user?.user_id === loan.borrower_id
  const isLender = user?.user_id === loan.lender_id

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "secondary"
      case "matched":
        return "default"
      case "active":
        return "default"
      case "repaid":
        return "default"
      case "liquidated":
        return "destructive"
      default:
        return "secondary"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto max-w-5xl px-4 py-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-balance">Loan Details</h1>
            <p className="text-muted-foreground">ID: {loan.loan_id}</p>
          </div>
          <Badge variant={getStatusColor(loan.status)}>{loan.status.toUpperCase()}</Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Loan Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Loan Amount</span>
                  </div>
                  <span className="text-lg font-semibold">
                    {loan.loan_amount} {loanAsset?.symbol || ""}
                  </span>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Interest Rate</span>
                  </div>
                  <span className="text-lg font-semibold text-primary">{loan.interest_rate_pct.toFixed(2)}%</span>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Total Repayment</span>
                  </div>
                  <span className="text-lg font-semibold">
                    {loan.total_repay_amount} {loanAsset?.symbol || ""}
                  </span>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Due Date</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{format(dueDate, "PPP")}</div>
                    <div className={`text-sm ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                      {formatDistanceToNow(dueDate, { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Collateral
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loan.collaterals && loan.collaterals.length > 0 ? (
                  <div className="space-y-3">
                    {loan.collaterals.map((collateral: any, idx: number) => {
                      const collateralAsset = assets[collateral.asset_id]
                      return (
                        <div key={idx} className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                          <div>
                            <div className="font-semibold">{collateralAsset?.name || "Unknown"}</div>
                            <div className="text-sm text-muted-foreground">{collateralAsset?.blockchain}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">
                              {collateral.amount} {collateralAsset?.symbol || ""}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No collateral information available</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loan.status === "pending" && isBorrower && (
                  <Button variant="destructive" className="w-full" onClick={() => confirmAction("cancel")}>
                    Cancel Loan
                  </Button>
                )}

                {loan.status === "matched" && isLender && (
                  <Button className="w-full" onClick={() => confirmAction("activate")}>
                    Activate Loan
                  </Button>
                )}

                {loan.status === "active" && isBorrower && (
                  <Button className="w-full" onClick={() => confirmAction("repay")}>
                    Repay Loan
                  </Button>
                )}

                {loan.status === "active" && isLender && isOverdue && (
                  <Button variant="destructive" className="w-full" onClick={() => confirmAction("liquidate")}>
                    Liquidate Loan
                  </Button>
                )}

                {!isConnected && (
                  <div className="rounded-lg bg-muted/50 p-4">
                    <div className="flex gap-2">
                      <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-muted-foreground">Connect your wallet to perform actions</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <div className="font-medium">Created</div>
                  <div className="text-muted-foreground">{format(new Date(loan.created_at), "PPp")}</div>
                </div>

                {loan.matched_at && (
                  <div className="text-sm">
                    <div className="font-medium">Matched</div>
                    <div className="text-muted-foreground">{format(new Date(loan.matched_at), "PPp")}</div>
                  </div>
                )}

                {loan.closed_at && (
                  <div className="text-sm">
                    <div className="font-medium">Closed</div>
                    <div className="text-muted-foreground">{format(new Date(loan.closed_at), "PPp")}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "cancel" && "This will cancel the loan request. This action cannot be undone."}
              {actionType === "activate" && "This will activate the loan and transfer funds to the borrower."}
              {actionType === "repay" && "This will repay the loan and return the collateral to you."}
              {actionType === "liquidate" && "This will liquidate the loan and transfer collateral to you."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
