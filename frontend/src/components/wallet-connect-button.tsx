"use client"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { Wallet } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { useTranslations } from "next-intl"

export function WalletConnectButton() {
  const { isConnected, user, connect, disconnect } = useAuth()
  const [isConnecting, setIsConnecting] = useState(false)
  const { toast } = useToast()
  const t = useTranslations("wallet")

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      await connect()
      toast({
        title: t("connected"),
        description: t("connected"),
      })
    } catch (error: any) {
      toast({
        title: t("error"),
        description: error.message || t("authError"),
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = () => {
    disconnect()
    toast({
      title: t("disconnect"),
      description: t("disconnect"),
    })
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (isConnected && user) {
    return (
      <Button onClick={handleDisconnect} variant="outline">
        {formatAddress(user.wallet_address)}
      </Button>
    )
  }

  return (
    <Button onClick={handleConnect} disabled={isConnecting}>
      <Wallet className="mr-2 h-4 w-4" />
      {isConnecting ? t("connecting") : t("connect")}
    </Button>
  )
}
