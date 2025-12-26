"use client"

import Link from "next/link"
import { WalletConnectButton } from "./wallet-connect-button"
import { LocaleSwitcher } from "./locale-switcher"
import { Button } from "./ui/button"
import { useAuth } from "@/contexts/auth-context"
import { useTranslations } from "next-intl"

export function Navbar() {
  const { isConnected } = useAuth()
  const t = useTranslations("navbar")

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary" />
              <span className="text-xl font-bold text-balance">PAWNABLE</span>
            </Link>

            <div className="hidden items-center gap-6 md:flex">
              <Link href="/marketplace">
                <Button variant="ghost">{t("marketplace")}</Button>
              </Link>
              {isConnected && (
                <>
                  <Link href="/dashboard">
                    <Button variant="ghost">{t("dashboard")}</Button>
                  </Link>
                  <Link href="/create-loan">
                    <Button variant="ghost">{t("createLoan")}</Button>
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <WalletConnectButton />
          </div>
        </div>
      </div>
    </nav>
  )
}
