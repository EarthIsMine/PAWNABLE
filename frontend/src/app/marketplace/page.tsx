"use client"

import { useEffect, useState } from "react"
import { Navbar } from "@/components/navbar"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { loanAPI, assetAPI } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { Loader2, TrendingUp, Calendar, Coins } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatDistanceToNow } from "date-fns"
import { ko, enUS } from "date-fns/locale"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { getLocale } from "@/lib/locale"

interface Loan {
  loan_id: string
  borrower_id: string
  loan_asset_id: string
  loan_amount: number
  interest_rate_pct: number
  total_repay_amount: number
  repay_due_at: string
  status: string
  created_at: string
  collaterals?: any[]
}

interface Asset {
  asset_id: string
  symbol: string
  name: string
  blockchain: string
}

export default function MarketplacePage() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [assets, setAssets] = useState<Record<string, Asset>>({})
  const [isLoading, setIsLoading] = useState(true)
  const { isConnected, user } = useAuth()
  const { toast } = useToast()
  const t = useTranslations("marketplace")
  const locale = getLocale()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [loansData, assetsData] = await Promise.all([loanAPI.getMarketplace(), assetAPI.getAll()])

      setLoans(loansData)

      const assetMap: Record<string, Asset> = {}
      assetsData.forEach((asset: Asset) => {
        assetMap[asset.asset_id] = asset
      })
      setAssets(assetMap)
    } catch (error: any) {
      console.error("Failed to load marketplace:", error)
      toast({
        title: t("toast.loadError"),
        description: t("toast.loadError"),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleMatch = async (loanId: string) => {
    if (!user) {
      toast({
        title: t("toast.connectWallet"),
        description: t("toast.pleaseConnect"),
        variant: "destructive",
      })
      return
    }

    try {
      await loanAPI.match(loanId, user.user_id)
      toast({
        title: t("common.success", { ns: "common" }),
        description: t("toast.matchSuccess"),
      })
      loadData()
    } catch (error: any) {
      toast({
        title: t("common.error", { ns: "common" }),
        description: error.message || t("toast.matchError"),
        variant: "destructive",
      })
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

  const dateLocale = locale === "ko" ? ko : enUS

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-balance">{t("title")}</h1>
          <p className="text-muted-foreground text-pretty">{t("subtitle")}</p>
        </div>

        {loans.length === 0 ? (
          <Card>
            <CardContent className="flex min-h-[40vh] flex-col items-center justify-center p-8 text-center">
              <Coins className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">{t("noLoans.title")}</h3>
              <p className="mb-4 text-sm text-muted-foreground">{t("noLoans.description")}</p>
              <Link href="/create-loan">
                <Button>{t("noLoans.button")}</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {loans.map((loan) => {
              const loanAsset = assets[loan.loan_asset_id]
              const dueDate = new Date(loan.repay_due_at)

              return (
                <Card key={loan.loan_id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="mb-1 text-2xl font-bold">
                          {loan.loan_amount} {loanAsset?.symbol || ""}
                        </div>
                        <div className="text-sm text-muted-foreground">{loanAsset?.name || "Unknown Asset"}</div>
                      </div>
                      <Badge variant="secondary">{loan.status.toUpperCase()}</Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <div className="text-sm">
                          <span className="text-muted-foreground">{t("card.interest")}: </span>
                          <span className="font-semibold text-primary">{loan.interest_rate_pct.toFixed(2)}%</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-muted-foreground" />
                        <div className="text-sm">
                          <span className="text-muted-foreground">{t("card.totalRepayment")}: </span>
                          <span className="font-semibold">
                            {loan.total_repay_amount} {loanAsset?.symbol || ""}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div className="text-sm">
                          <span className="text-muted-foreground">{t("card.due")}: </span>
                          <span className="font-semibold">
                            {formatDistanceToNow(dueDate, { addSuffix: true, locale: dateLocale })}
                          </span>
                        </div>
                      </div>

                      {loan.collaterals && loan.collaterals.length > 0 && (
                        <div className="mt-4 rounded-lg bg-muted/50 p-3">
                          <div className="mb-1 text-xs font-medium text-muted-foreground">{t("card.collateral")}</div>
                          {loan.collaterals.map((collateral: any, idx: number) => {
                            const collateralAsset = assets[collateral.asset_id]
                            return (
                              <div key={idx} className="text-sm font-semibold">
                                {collateral.amount} {collateralAsset?.symbol || ""}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter>
                    <Button className="w-full" onClick={() => handleMatch(loan.loan_id)} disabled={!isConnected}>
                      {isConnected ? t("card.lendNow") : t("card.connectToLend")}
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
