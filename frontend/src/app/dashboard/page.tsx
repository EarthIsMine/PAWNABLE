"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { loanAPI, assetAPI } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Loader2, TrendingUp, TrendingDown, Calendar, Plus, ExternalLink } from "lucide-react"
import { format } from "date-fns"

interface Loan {
  loan_id: string
  borrower_id: string
  lender_id: string | null
  loan_asset_id: string
  loan_amount: number
  interest_rate_pct: number
  total_repay_amount: number
  repay_due_at: string
  status: string
  created_at: string
  collaterals?: any[]
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, isConnected } = useAuth()
  const { toast } = useToast()

  const [borrowedLoans, setBorrowedLoans] = useState<Loan[]>([])
  const [lentLoans, setLentLoans] = useState<Loan[]>([])
  const [assets, setAssets] = useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isConnected || !user) {
      router.push("/")
      return
    }
    loadData()
  }, [isConnected, user, router])

  const loadData = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const [borrowedData, lentData, assetsData] = await Promise.all([
        loanAPI.getByBorrower(user.user_id),
        loanAPI.getByLender(user.user_id),
        assetAPI.getAll(),
      ])

      setBorrowedLoans(borrowedData)
      setLentLoans(lentData)

      const assetMap: Record<string, any> = {}
      assetsData.forEach((asset: any) => {
        assetMap[asset.asset_id] = asset
      })
      setAssets(assetMap)
    } catch (error: any) {
      console.error("Failed to load dashboard:", error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
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

  const calculateStats = (loans: Loan[], isBorrowing: boolean) => {
    const active = loans.filter((l) => l.status === "active").length
    const pending = loans.filter((l) => l.status === "pending" || l.status === "matched").length
    const completed = loans.filter((l) => l.status === "repaid" || l.status === "liquidated").length

    const totalAmount = loans
      .filter((l) => l.status === "active")
      .reduce((sum, l) => sum + (isBorrowing ? l.loan_amount : l.total_repay_amount), 0)

    return { active, pending, completed, totalAmount }
  }

  const borrowStats = calculateStats(borrowedLoans, true)
  const lendStats = calculateStats(lentLoans, false)

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

  const LoanCard = ({ loan, isBorrowing }: { loan: Loan; isBorrowing: boolean }) => {
    const loanAsset = assets[loan.loan_asset_id]
    const dueDate = new Date(loan.repay_due_at)

    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-2xl font-bold">
                {loan.loan_amount} {loanAsset?.symbol || ""}
              </div>
              <div className="text-sm text-muted-foreground">{loanAsset?.name || "Unknown"}</div>
            </div>
            <Badge variant={getStatusColor(loan.status)}>{loan.status.toUpperCase()}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Interest Rate</span>
            <span className="font-semibold text-primary">{loan.interest_rate_pct.toFixed(2)}%</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Repayment</span>
            <span className="font-semibold">
              {loan.total_repay_amount} {loanAsset?.symbol || ""}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Due Date</span>
            <span className="font-semibold">{format(dueDate, "MMM d, yyyy")}</span>
          </div>

          {loan.collaterals && loan.collaterals.length > 0 && (
            <div className="rounded-lg bg-muted/50 p-2 text-sm">
              <div className="text-xs text-muted-foreground mb-1">COLLATERAL</div>
              {loan.collaterals.map((collateral: any, idx: number) => {
                const collateralAsset = assets[collateral.asset_id]
                return (
                  <div key={idx} className="font-medium">
                    {collateral.amount} {collateralAsset?.symbol || ""}
                  </div>
                )
              })}
            </div>
          )}

          <Link href={`/loan/${loan.loan_id}`}>
            <Button variant="outline" className="w-full mt-2 bg-transparent">
              View Details
              <ExternalLink className="ml-2 h-3 w-3" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-balance">Dashboard</h1>
            <p className="text-muted-foreground text-pretty">
              Welcome back, {user?.wallet_address.slice(0, 6)}...{user?.wallet_address.slice(-4)}
            </p>
          </div>
          <Link href="/create-loan">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Loan Request
            </Button>
          </Link>
        </div>

        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Borrowed (Active)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
                <div className="text-2xl font-bold">{borrowStats.active}</div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{borrowStats.pending} pending</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Lent (Active)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <div className="text-2xl font-bold">{lendStats.active}</div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{lendStats.pending} pending</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Borrowed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{borrowStats.totalAmount.toFixed(2)}</div>
              <p className="mt-1 text-xs text-muted-foreground">USDT equivalent</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Lent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lendStats.totalAmount.toFixed(2)}</div>
              <p className="mt-1 text-xs text-muted-foreground">USDT equivalent</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="borrowed" className="space-y-6">
          <TabsList>
            <TabsTrigger value="borrowed">Borrowed ({borrowedLoans.length})</TabsTrigger>
            <TabsTrigger value="lent">Lent ({lentLoans.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="borrowed" className="space-y-4">
            {borrowedLoans.length === 0 ? (
              <Card>
                <CardContent className="flex min-h-[30vh] flex-col items-center justify-center p-8 text-center">
                  <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-semibold">No borrowed loans</h3>
                  <p className="mb-4 text-sm text-muted-foreground">Create a loan request to get started</p>
                  <Link href="/create-loan">
                    <Button>Create Loan Request</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {borrowedLoans.map((loan) => (
                  <LoanCard key={loan.loan_id} loan={loan} isBorrowing={true} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="lent" className="space-y-4">
            {lentLoans.length === 0 ? (
              <Card>
                <CardContent className="flex min-h-[30vh] flex-col items-center justify-center p-8 text-center">
                  <TrendingUp className="mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-semibold">No lent loans</h3>
                  <p className="mb-4 text-sm text-muted-foreground">Browse the marketplace to start lending</p>
                  <Link href="/marketplace">
                    <Button>Browse Marketplace</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {lentLoans.map((loan) => (
                  <LoanCard key={loan.loan_id} loan={loan} isBorrowing={false} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
