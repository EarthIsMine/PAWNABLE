"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { Wallet, Copy, LogOut } from "lucide-react";
import { useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import styled from "@emotion/styled";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ---------------- utils ---------------- */

function getErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return undefined;
}

function formatAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/* ---------------- component ---------------- */

export function WalletConnectButton() {
  const { isConnected, user, connect, disconnect } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const tWallet = useTranslations("wallet");
  const tCommon = useTranslations("common");

  const walletAddress = user?.wallet_address ?? "";
  const nickname = user?.nickname?.trim() ?? "";

  const primaryLabel = useMemo(() => {
    if (nickname) return nickname;
    if (walletAddress) return formatAddress(walletAddress);
    return "";
  }, [nickname, walletAddress]);

  const secondaryLabel = useMemo(() => {
    if (!nickname || !walletAddress) return "";
    return formatAddress(walletAddress);
  }, [nickname, walletAddress]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await connect();
      toast({
        title: tWallet("connected"),
        description: tWallet("connectedDesc"),
      });
    } catch (error: unknown) {
      toast({
        title: tWallet("error"),
        description: getErrorMessage(error) ?? tWallet("authError"),
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    toast({
      title: tWallet("disconnect"),
      description: tWallet("disconnectDesc"),
    });
  };

  const handleCopyAddress = async () => {
    if (!walletAddress) return;

    try {
      await navigator.clipboard.writeText(walletAddress);
      toast({
        title: tCommon("success"),
        description: tWallet("copied"),
      });
    } catch {
      toast({
        title: tCommon("error"),
        description: tWallet("copyError"),
        variant: "destructive",
      });
    }
  };

  /* -------- not connected -------- */

  if (!isConnected || !user) {
    return (
      <Button onClick={handleConnect} disabled={isConnecting}>
        <Wallet className="mr-2 h-4 w-4" />
        {isConnecting ? tWallet("connecting") : tWallet("connect")}
      </Button>
    );
  }

  /* -------- connected -------- */

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <AccountButton variant="outline" aria-label={tWallet("accountMenu")}>
          <WalletIcon>
            <Wallet size={16} />
          </WalletIcon>

          <TextBox>
            <PrimaryText>{primaryLabel}</PrimaryText>
            <SecondaryText>{secondaryLabel || tWallet("connected")}</SecondaryText>
          </TextBox>
        </AccountButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            void handleCopyAddress();
          }}
        >
          <Copy className="mr-2 h-4 w-4" />
          {tWallet("copyAddress")}
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            handleDisconnect();
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {tWallet("disconnect")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ---------------- styles (emotion) ---------------- */

const AccountButton = styled(Button)`
  height: auto;
  padding: 8px 12px;

  display: inline-flex;
  align-items: center;
  gap: 10px;

  text-align: left;
`;

const WalletIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;

  color: var(--muted-foreground);
`;

const TextBox = styled.span`
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.15;
`;

const PrimaryText = styled.span`
  max-width: 160px;
  font-size: 14px;
  font-weight: 600;
  color: var(--foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SecondaryText = styled.span`
  max-width: 160px;
  font-size: 12px;
  color: var(--muted-foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
