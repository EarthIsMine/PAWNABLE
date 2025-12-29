"use client";

import Link from "next/link";
import styled from "@emotion/styled";
import { useTranslations } from "next-intl";
import { Languages, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const t = useTranslations("navbar");

  return (
    <Bar>
      <Container>
        <Left>
          <Brand href="/">PAWNABLE</Brand>

          <NavLinks>
            <NavLink href="/marketplace">{t("marketplace")}</NavLink>
          </NavLinks>
        </Left>

        <Right>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <GhostButton type="button" aria-label={t("changeLanguage")}>
                <IconBox>
                  <Languages width={18} height={18} />
                </IconBox>
                <GhostText>{t("changeLanguage")}</GhostText>
              </GhostButton>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              {/* TODO: 실제 로케일 라우팅/핸들러에 맞게 onSelect/Link로 수정 */}
              <DropdownMenuItem
                onSelect={() => {
                  /* set locale: ko */
                }}
              >
                한국어
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  /* set locale: en */
                }}
              >
                English
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="lg"
            tone="neutral"
            onClick={() => {
              /* connect wallet */
            }}
          >
            <Wallet width={18} height={18} />
            {t("connectWallet")}
          </Button>
        </Right>
      </Container>
    </Bar>
  );
}

/* styles (Navbar는 feature component이므로 JSX 아래 배치) */

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

const GhostButton = styled.button`
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
  font-weight: 600;

  transition:
    background 140ms ease,
    opacity 140ms ease;

  &:hover {
    background: color-mix(in oklab, var(--card) 70%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }
`;

const IconBox = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--muted-foreground);
`;

const GhostText = styled.span`
  @media (max-width: 480px) {
    display: none; /* 모바일에서는 아이콘만 */
  }
`;
