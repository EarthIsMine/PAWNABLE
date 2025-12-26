"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/contexts/auth-context"
import { loanAPI, assetAPI } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, X } from "lucide-react"

interface Asset {
  asset_id: string
  symbol: string
  name: string
  blockchain: string
  asset_type: string
}

interface CollateralInput {
  asset_id: string
  amount: string
}

export default function CreateLoanPage() {
  const router = useRouter()
  const { user, isConnected } = useAuth()
  const { toast } = useToast()

  const [assets, setAssets] = useState<Asset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [loanAssetId, setLoanAssetId] = useState("")
  const [loanAmount, setLoanAmount] = useState("")
  const [interestRate, setInterestRate] = useState("")
  const [durationDays, setDurationDays] = useState("")
  const [collaterals, setCollaterals] = useState<CollateralInput[]>([{ asset_id: "", amount: "" }])

  useEffect(() => {
    if (!isConnected) {
      router.push("/")
      return
    }
    loadAssets()
  }, [isConnected, router])

  const loadAssets = async () => {
    try {
      const assetsData = await assetAPI.getAll()
      setAssets(assetsData)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load assets",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addCollateral = () => {
    setCollaterals([...collaterals, { asset_id: "", amount: "" }])
  }

  const removeCollateral = (index: number) => {
    setCollaterals(collaterals.filter((_, i) => i !== index))
  }

  const updateCollateral = (index: number, field: keyof CollateralInput, value: string) => {
    const updated = [...collaterals]
    updated[index][field] = value
    setCollaterals(updated)
  }

  const calculateTotalRepayment = () => {
    const principal = Number.parseFloat(loanAmount) || 0
    const rate = Number.parseFloat(interestRate) || 0
    return principal * (1 + rate / 100)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast({
        title: "Error",
        description: "Please connect your wallet",
        variant: "destructive",
      })
      return
    }

    // Validation
    if (!loanAssetId || !loanAmount || !interestRate || !durationDays) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    if (collaterals.some((c) => !c.asset_id || !c.amount)) {
      toast({
        title: "Error",
        description: "Please complete all collateral fields",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const repayDueAt = new Date()
      repayDueAt.setDate(repayDueAt.getDate() + Number.parseInt(durationDays))

      await loanAPI.create({
        borrower_id: user.user_id,
        loan_asset_id: loanAssetId,
        loan_amount: Number.parseFloat(loanAmount),
        interest_rate_pct: Number.parseFloat(interestRate),
        total_repay_amount: calculateTotalRepayment(),
        repay_due_at: repayDueAt.toISOString(),
        collaterals: collaterals.map((c) => ({
          asset_id: c.asset_id,
          amount: Number.parseFloat(c.amount),
        })),
      })

      toast({
        title: "Success",
        description: "Loan request created successfully",
      })

      router.push("/dashboard")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create loan",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
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

  const loanAssets = assets.filter((a) => a.asset_type === "token" || a.asset_type === "stablecoin")
  const collateralAssets = assets.filter((a) => a.asset_type === "token" || a.asset_type === "nft")

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-balance">Create Loan Request</h1>
          <p className="text-muted-foreground text-pretty">Set your own terms and find a lender in the marketplace</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Loan Details</CardTitle>
              <CardDescription>Specify how much you want to borrow and at what rate</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="loan-asset">Loan Asset</Label>
                  <Select value={loanAssetId} onValueChange={setLoanAssetId}>
                    <SelectTrigger id="loan-asset">
                      <SelectValue placeholder="Select asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {loanAssets.map((asset) => (
                        <SelectItem key={asset.asset_id} value={asset.asset_id}>
                          {asset.symbol} - {asset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loan-amount">Loan Amount</Label>
                  <Input
                    id="loan-amount"
                    type="number"
                    step="0.01"
                    placeholder="1000"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interest-rate">Interest Rate (%)</Label>
                  <Input
                    id="interest-rate"
                    type="number"
                    step="0.01"
                    placeholder="5.00"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (Days)</Label>
                  <Input
                    id="duration"
                    type="number"
                    placeholder="30"
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                  />
                </div>
              </div>

              {loanAmount && interestRate && (
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="text-sm text-muted-foreground">Total Repayment Amount</div>
                  <div className="text-2xl font-bold text-primary">{calculateTotalRepayment().toFixed(2)}</div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Collateral</CardTitle>
              <CardDescription>Add assets you'll use as collateral for this loan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {collaterals.map((collateral, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor={`collateral-asset-${index}`}>Asset</Label>
                    <Select
                      value={collateral.asset_id}
                      onValueChange={(value) => updateCollateral(index, "asset_id", value)}
                    >
                      <SelectTrigger id={`collateral-asset-${index}`}>
                        <SelectValue placeholder="Select asset" />
                      </SelectTrigger>
                      <SelectContent>
                        {collateralAssets.map((asset) => (
                          <SelectItem key={asset.asset_id} value={asset.asset_id}>
                            {asset.symbol} - {asset.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1 space-y-2">
                    <Label htmlFor={`collateral-amount-${index}`}>Amount</Label>
                    <Input
                      id={`collateral-amount-${index}`}
                      type="number"
                      step="0.01"
                      placeholder="1.0"
                      value={collateral.amount}
                      onChange={(e) => updateCollateral(index, "amount", e.target.value)}
                    />
                  </div>

                  {collaterals.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-8"
                      onClick={() => removeCollateral(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}

              <Button type="button" variant="outline" onClick={addCollateral} className="w-full bg-transparent">
                <Plus className="mr-2 h-4 w-4" />
                Add Collateral
              </Button>
            </CardContent>
          </Card>

          <div className="mt-6 flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Loan Request"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
