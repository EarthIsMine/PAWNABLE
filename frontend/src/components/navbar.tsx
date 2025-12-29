"use client";

import Link from "next/link";
import styled from "@emotion/styled";
import { useTranslations } from "next-intl";

import { WalletConnectButton } from "@/components/wallet-connect-button";
import { LocaleSwitcher } from "@/components/locale-switcher";

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
          <LocaleSwitcher />
          <WalletConnectButton />
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
