"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import styled from "@emotion/styled";
import { useTranslations } from "next-intl";
import { ChevronDown, LayoutDashboard, LogOut } from "lucide-react";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const t = useTranslations("navbar");
  const tCommon = useTranslations("common");
  const tWallet = useTranslations("wallet");

  const router = useRouter();
  const { user, isConnected, connect, disconnect, isLoading } = useAuth();
  const { toast } = useToast();

  const displayName = user?.nickname?.trim()
    ? user.nickname.trim()
    : user?.wallet_address
      ? `${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}`
      : "";

  const subLabel =
    user?.nickname?.trim() && user?.wallet_address
      ? `${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}`
      : undefined;

  const handleConnect = async () => {
    try {
      await connect();
      toast({ title: tWallet("connected"), description: tWallet("connected") });
    } catch (e: unknown) {
      toast({
        title: tWallet("error"),
        description: tWallet("authError"),
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = () => {
    disconnect();
    toast({ title: tWallet("disconnect"), description: tWallet("disconnect") });
  };

  return (
    <Bar>
      <Container>
        <Left>
          <Brand href="/">PAWNABLE</Brand>

          <NavLinks>
            <NavLink href="/marketplace">{t("marketplace")}</NavLink>
            <NavLink href="/dashboard">{t("dashboard")}</NavLink>
          </NavLinks>
        </Left>

        <Right>
          <LocaleSwitcher />

          {isConnected && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <UserTrigger type="button" aria-label={t("dashboard")}>
                  <UserText>
                    <UserPrimary>{displayName}</UserPrimary>
                    {subLabel ? <UserSecondary>{subLabel}</UserSecondary> : null}
                  </UserText>
                  <ChevronDown width={16} height={16} />
                </UserTrigger>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                  <ItemRow>
                    <LayoutDashboard width={16} height={16} />
                    <span>{t("dashboard")}</span>
                  </ItemRow>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={handleDisconnect}>
                  <ItemRow>
                    <LogOut width={16} height={16} />
                    <span>
                      {tCommon("disconnect", { ns: "wallet" } as any) ?? tWallet("disconnect")}
                    </span>
                  </ItemRow>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={handleConnect} disabled={isLoading}>
              {isLoading ? tWallet("connecting") : tWallet("connect")}
            </Button>
          )}
        </Right>
      </Container>
    </Bar>
  );
}

/* styles */

const Bar = styled.header`
  position: sticky;
  top: 0;
  z-index: 50;

  border-bottom: 1px solid var(--border);
  background: color-mix(in oklab, var(--background) 78%, transparent);
  backdrop-filter: blur(10px);
`;

const Container = styled.div`
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 14px 16px;

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
`;

const Left = styled.div`
  display: flex;
  align-items: center;
  gap: 18px;
  min-width: 0;
`;

const Brand = styled(Link)`
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--foreground);
  text-decoration: none;
`;

const NavLinks = styled.nav`
  display: flex;
  align-items: center;
  gap: 10px;

  @media (max-width: 480px) {
    display: none;
  }
`;

const NavLink = styled(Link)`
  font-size: 14px;
  font-weight: 600;
  color: var(--foreground);
  text-decoration: none;
  opacity: 0.9;

  &:hover {
    opacity: 1;
  }
`;

const Right = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const UserTrigger = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 10px;

  height: 44px;
  padding: 0 12px;

  border-radius: calc(var(--radius) - 3px);
  border: 1px solid var(--border);
  background: color-mix(in oklab, var(--card) 55%, transparent);
  color: var(--foreground);

  font-size: 14px;
  font-weight: 700;

  transition: background 140ms ease;

  &:hover {
    background: color-mix(in oklab, var(--card) 70%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }
`;

const UserText = styled.span`
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.2;
`;

const UserPrimary = styled.span`
  font-size: 13px;
  font-weight: 800;
`;

const UserSecondary = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: var(--muted-foreground);
  margin-top: 2px;
`;

const ItemRow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 10px;
`;
