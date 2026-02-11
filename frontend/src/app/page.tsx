"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import styled from "@emotion/styled";
import { useTranslations } from "next-intl";
import { ArrowRight, Shield, TrendingUp, Users, Clock } from "lucide-react";

import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

const Page = styled.div`
  min-height: 100dvh;
`;

const Section = styled.section<{
  variant?: "hero" | "stats" | "plain" | "cta";
}>`
  ${({ variant }) => {
    if (variant === "hero") {
      return `
        border-bottom: 1px solid var(--border);
        background: color-mix(in oklab, var(--secondary) 60%, transparent);
      `;
    }
    if (variant === "stats") {
      return `
        border-top: 1px solid var(--border);
        border-bottom: 1px solid var(--border);
        background: var(--card);
      `;
    }
    if (variant === "cta") {
      return `
        border-top: 1px solid var(--border);
        background: color-mix(in oklab, var(--secondary) 60%, transparent);
      `;
    }
    return `
      background: transparent;
    `;
  }}
`;

const Container = styled.div`
  width: 100%;
  max-width: 1280px; /* xl */
  margin: 0 auto;
  padding: 0 16px;
`;

const HeroWrap = styled.div`
  padding: 80px 0;

  @media (min-width: 768px) {
    padding: 128px 0;
  }
`;

const Center = styled.div`
  margin: 0 auto;
  max-width: 56rem; /* ~896px */
  text-align: center;
`;

const Badge = styled.div`
  display: inline-block;
  margin-bottom: 24px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: color-mix(in oklab, var(--card) 60%, transparent);
  padding: 6px 16px;
`;

const BadgeText = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
`;

const H1 = styled.h1`
  margin: 0 0 24px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.08;

  font-size: 40px;
  @media (min-width: 480px) {
    font-size: 48px;
  }
  @media (min-width: 768px) {
    font-size: 56px;
  }
  @media (min-width: 1024px) {
    font-size: 64px;
  }
`;

const Subtitle = styled.p`
  margin: 0 0 32px;
  font-size: 16px;
  line-height: 1.5;
  color: color-mix(in oklab, var(--foreground) 70%, transparent);

  @media (min-width: 768px) {
    font-size: 18px;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  justify-content: center;

  @media (min-width: 480px) {
    flex-direction: row;
  }
`;

const Icon16 = styled(ArrowRight)`
  width: 16px;
  height: 16px;
`;

const StatsWrap = styled.div`
  padding: 48px 0;
`;

const StatsGrid = styled.div`
  display: grid;
  gap: 16px;

  @media (min-width: 480px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`;

const StatCard = styled.div`
  border-radius: calc(var(--radius) + 2px);
  border: 1px solid var(--border);
  background: color-mix(in oklab, var(--background) 30%, transparent);
  padding: 20px 24px;
  text-align: center;
`;

const StatValue = styled.div`
  margin-bottom: 8px;
  font-size: 28px;
  font-weight: 800;
  color: var(--accent);
`;

const StatLabel = styled.div`
  font-size: 13px;
  color: var(--muted-foreground);
`;

const FeaturesWrap = styled.div`
  padding: 80px 0;
`;

const SectionHeader = styled.div`
  margin: 0 auto 64px;
  max-width: 42rem;
  text-align: center;
`;

const H2 = styled.h2`
  margin: 0 0 16px;
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.01em;

  @media (min-width: 768px) {
    font-size: 36px;
  }
`;

const Subtext = styled.p`
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  color: color-mix(in oklab, var(--foreground) 70%, transparent);
`;

const FeaturesGrid = styled.div`
  display: grid;
  gap: 24px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`;

const FeatureIconBox = styled.div`
  display: inline-flex;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  align-items: center;
  justify-content: center;
  background: color-mix(in oklab, var(--accent) 15%, transparent);
  margin-bottom: 16px;
`;

const FeatureTitle = styled.h3`
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 700;
`;

const FeatureDesc = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--muted-foreground);
`;

const CTAWrap = styled.div`
  padding: 80px 0;
`;

const Footer = styled.footer`
  border-top: 1px solid var(--border);
`;

const FooterWrap = styled.div`
  padding: 32px 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  justify-content: space-between;

  @media (min-width: 480px) {
    flex-direction: row;
  }
`;

const FooterText = styled.p`
  margin: 0;
  font-size: 13px;
  color: var(--muted-foreground);
`;

const FooterLinks = styled.div`
  display: flex;
  gap: 24px;
`;

const FooterLink = styled(Link)`
  font-size: 13px;
  color: var(--muted-foreground);
  text-decoration: none;

  &:hover {
    color: var(--foreground);
  }
`;

export default function HomePage() {
  const router = useRouter();
  const { isConnected } = useAuth();
  const { toast } = useToast();
  const t = useTranslations("home");

  const handleCreateLoan = () => {
    if (!isConnected) {
      toast({
        title: t("toast.connectWalletTitle"),
        description: t("toast.connectWalletDesc"),
        variant: "destructive",
      });
      return;
    }

    router.push("/create-loan");
  };

  return (
    <Page>
      <Navbar />

      {/* Hero */}
      <Section variant="hero">
        <Container>
          <HeroWrap>
            <Center>
              <Badge>
                <BadgeText>{t("badge")}</BadgeText>
              </Badge>

              <H1>{t("title")}</H1>
              <Subtitle>{t("subtitle")}</Subtitle>

              <ButtonRow>
                <Link href="/marketplace">
                  <Button size="lg" tone="accent">
                    {t("exploreMarketplace")}
                    <Icon16 />
                  </Button>
                </Link>

                <Button size="lg" variant="outline" onClick={handleCreateLoan}>
                  {t("createLoanRequest")}
                </Button>
              </ButtonRow>
            </Center>
          </HeroWrap>
        </Container>
      </Section>

      {/* Stats */}
      <Section variant="stats">
        <Container>
          <StatsWrap>
            <StatsGrid>
              {[
                { value: "0.5%", label: t("stats.platformFee") },
                { value: "P2P", label: t("stats.directMatching") },
                { value: t("stats.flexible"), label: t("stats.yourRates") },
                { value: t("stats.secure"), label: t("stats.smartContracts") },
              ].map((item) => (
                <StatCard key={item.label}>
                  <StatValue>{item.value}</StatValue>
                  <StatLabel>{item.label}</StatLabel>
                </StatCard>
              ))}
            </StatsGrid>
          </StatsWrap>
        </Container>
      </Section>

      {/* Features */}
      <Section>
        <Container>
          <FeaturesWrap>
            <SectionHeader>
              <H2>{t("howItWorks.title")}</H2>
              <Subtext>{t("howItWorks.subtitle")}</Subtext>
            </SectionHeader>

            <FeaturesGrid>
              {[
                {
                  Icon: Users,
                  title: t("howItWorks.features.setTerms.title"),
                  desc: t("howItWorks.features.setTerms.description"),
                },
                {
                  Icon: Shield,
                  title: t("howItWorks.features.collateral.title"),
                  desc: t("howItWorks.features.collateral.description"),
                },
                {
                  Icon: TrendingUp,
                  title: t("howItWorks.features.deadlines.title"),
                  desc: t("howItWorks.features.deadlines.description"),
                },
                {
                  Icon: Clock,
                  title: t("howItWorks.features.matching.title"),
                  desc: t("howItWorks.features.matching.description"),
                },
              ].map(({ Icon, title, desc }) => (
                <Card key={title}>
                  <CardContent>
                    <FeatureIconBox>
                      <Icon width={24} height={24} color="var(--accent)" />
                    </FeatureIconBox>
                    <FeatureTitle>{title}</FeatureTitle>
                    <FeatureDesc>{desc}</FeatureDesc>
                  </CardContent>
                </Card>
              ))}
            </FeaturesGrid>
          </FeaturesWrap>
        </Container>
      </Section>

      {/* CTA */}
      <Section variant="cta">
        <Container>
          <CTAWrap>
            <Center style={{ maxWidth: "48rem" }}>
              <H2>{t("cta.title")}</H2>
              <Subtext style={{ marginTop: 0, marginBottom: 32 }}>{t("cta.subtitle")}</Subtext>

              <Link href="/marketplace">
                <Button size="lg" tone="accent">
                  {t("cta.viewMarketplace")}
                  <Icon16 />
                </Button>
              </Link>
            </Center>
          </CTAWrap>
        </Container>
      </Section>

      {/* Footer */}
      <Footer>
        <Container>
          <FooterWrap>
            <FooterText>{t("footer.testnet")}</FooterText>
            <FooterLinks>
              <FooterLink href="#">{t("footer.docs")}</FooterLink>
              <FooterLink href="#">{t("footer.github")}</FooterLink>
              <FooterLink href="#">{t("footer.discord")}</FooterLink>
            </FooterLinks>
          </FooterWrap>
        </Container>
      </Footer>
    </Page>
  );
}
