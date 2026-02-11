"use client";

import { useEffect, useMemo, useState } from "react";
import styled from "@emotion/styled";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { ko, enUS } from "date-fns/locale";
import { Calendar, Coins, Loader2, TrendingUp } from "lucide-react";
import { formatUnits } from "ethers";

import { Navbar } from "@/components/navbar";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { intentAPI, type Intent } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { getLocale } from "@/lib/locale";

export default function MarketplacePage() {
  const [intents, setIntents] = useState<Intent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { isConnected } = useAuth();
  const { toast } = useToast();

  const t = useTranslations("marketplace");
  const common = useTranslations("common");

  const locale = getLocale();
  const dateLocale = useMemo(() => (locale === "ko" ? ko : enUS), [locale]);

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);

      const res = await intentAPI.getAll({ status: "ACTIVE", limit: 50 });
      setIntents(res.intents ?? []);
    } catch (error: any) {
      console.error("Failed to load marketplace:", error);
      toast({
        title: t("toast.loadError"),
        description: t("toast.loadError"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Page>
      <Navbar />

      <Container>
        <Header>
          <Title>{t("title")}</Title>
          <Subtitle>{t("subtitle")}</Subtitle>
        </Header>

        {isLoading ? (
          <LoadingWrap>
            <SpinIcon aria-hidden="true" />
          </LoadingWrap>
        ) : intents.length === 0 ? (
          <Card>
            <EmptyState>
              <EmptyIcon aria-hidden="true" />
              <CardTitle>{t("noLoans.title")}</CardTitle>
              <CardDescription>{t("noLoans.description")}</CardDescription>

              <Link href="/create-loan">
                <Button size="lg" tone="accent">
                  {t("noLoans.button")}
                </Button>
              </Link>
            </EmptyState>
          </Card>
        ) : (
          <>
            <Controls>
              <CountText>{t("count", { count: intents.length })}</CountText>
            </Controls>

            <Grid>
              {intents.map((intent) => {
                const principalToken = intent.principalToken;
                const collateralToken = intent.collateralToken;
                const principalAmount = principalToken
                  ? formatUnits(BigInt(intent.principalAmount), principalToken.decimals)
                  : intent.principalAmount;
                const totalRepayRaw =
                  BigInt(intent.principalAmount) +
                  (BigInt(intent.principalAmount) * BigInt(intent.interestBps)) / 10000n;
                const totalRepay = principalToken
                  ? formatUnits(totalRepayRaw, principalToken.decimals)
                  : totalRepayRaw.toString();
                const dueDate = new Date(Number(intent.deadlineTimestamp) * 1000);

                return (
                  <LoanCard key={intent.id}>
                    <CardHeader>
                      <TopRow>
                        <AmountBlock>
                          <Amount>
                            {principalAmount} {principalToken?.symbol || ""}
                          </Amount>
                          <AssetName>{principalToken?.symbol || t("card.principal")}</AssetName>
                        </AmountBlock>

                        <Badge variant="outline">{String(intent.status).toUpperCase()}</Badge>
                      </TopRow>

                      <CardDescription>{t("card.borrowerSetsRate")}</CardDescription>
                    </CardHeader>

                    <CardContent>
                      <MetaList>
                        <MetaItem>
                          <MetaIcon aria-hidden="true">
                            <TrendingUp width={18} height={18} />
                          </MetaIcon>
                          <MetaText>
                            <MetaLabel>{t("card.apr")}</MetaLabel>
                            <MetaValueAccent>{(intent.interestBps / 100).toFixed(2)}%</MetaValueAccent>
                          </MetaText>
                        </MetaItem>

                        <MetaItem>
                          <MetaIcon aria-hidden="true">
                            <Coins width={18} height={18} />
                          </MetaIcon>
                          <MetaText>
                            <MetaLabel>{t("card.totalRepay")}</MetaLabel>
                            <MetaValue>
                              {totalRepay} {principalToken?.symbol || ""}
                            </MetaValue>
                          </MetaText>
                        </MetaItem>

                        <MetaItem>
                          <MetaIcon aria-hidden="true">
                            <Calendar width={18} height={18} />
                          </MetaIcon>
                          <MetaText>
                            <MetaLabel>{t("card.due")}</MetaLabel>
                            <MetaValue>
                              {formatDistanceToNow(dueDate, {
                                addSuffix: true,
                                locale: dateLocale,
                              })}
                            </MetaValue>
                          </MetaText>
                        </MetaItem>
                      </MetaList>

                      {collateralToken && (
                        <CollateralBox>
                          <CollateralTitle>{t("card.collateral")}</CollateralTitle>
                          <CollateralList>
                            <CollateralItem key={intent.id}>
                              {formatUnits(BigInt(intent.collateralAmount), collateralToken.decimals)}{" "}
                              {collateralToken.symbol || ""}
                            </CollateralItem>
                          </CollateralList>
                        </CollateralBox>
                      )}
                    </CardContent>

                    <CardFooter>
                      <Link href={`/loan/${intent.id}`} style={{ width: "100%" }}>
                        <Button size="lg" tone="accent" fullWidth disabled={!isConnected}>
                          {isConnected ? t("card.lendNow") : t("card.walletRequired")}
                        </Button>
                      </Link>
                    </CardFooter>
                  </LoanCard>
                );
              })}
            </Grid>
          </>
        )}
      </Container>
    </Page>
  );
}

/* styles */

const Page = styled.div`
  min-height: 100dvh;
`;

const Container = styled.div`
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 28px 16px 64px;
`;

const Header = styled.div`
  margin-bottom: 18px;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 32px;
  line-height: 1.2;
  letter-spacing: -0.01em;
  font-weight: 900;
`;

const Subtitle = styled.p`
  margin: 10px 0 0;
  color: color-mix(in oklab, var(--foreground) 70%, transparent);
  font-size: 15px;
  line-height: 1.5;
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 12px 0 16px;
  border-bottom: 1px solid var(--border);
`;

const CountText = styled.div`
  font-size: 13px;
  color: var(--muted-foreground);
`;

const Grid = styled.div`
  padding-top: 18px;

  display: grid;
  gap: 14px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  @media (min-width: 1280px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const LoanCard = styled(Card)`
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const TopRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`;

const AmountBlock = styled.div`
  min-width: 0;
`;

const Amount = styled.div`
  font-size: 18px;
  font-weight: 900;
  letter-spacing: -0.01em;
`;

const AssetName = styled.div`
  margin-top: 6px;
  font-size: 13px;
  color: var(--muted-foreground);
`;

const MetaList = styled.div`
  display: grid;
  gap: 10px;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  border-radius: calc(var(--radius) - 6px);
  border: 1px solid var(--border);
  background: color-mix(in oklab, var(--background) 28%, transparent);
  padding: 10px 12px;
`;

const MetaIcon = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in oklab, var(--card) 70%, transparent);
  color: var(--muted-foreground);
`;

const MetaText = styled.div`
  display: grid;
  gap: 2px;
`;

const MetaLabel = styled.div`
  font-size: 12px;
  color: var(--muted-foreground);
`;

const MetaValue = styled.div`
  font-size: 14px;
  font-weight: 800;
`;

const MetaValueAccent = styled(MetaValue)`
  color: var(--accent);
`;

const CollateralBox = styled.div`
  margin-top: 12px;
  border-radius: calc(var(--radius) - 6px);
  border: 1px solid var(--border);
  background: color-mix(in oklab, var(--background) 24%, transparent);
  padding: 12px;
`;

const CollateralTitle = styled.div`
  font-size: 12px;
  color: var(--muted-foreground);
  margin-bottom: 8px;
  font-weight: 700;
`;

const CollateralList = styled.div`
  display: grid;
  gap: 6px;
`;

const CollateralItem = styled.div`
  font-size: 14px;
  font-weight: 800;
`;

const LoadingWrap = styled.div`
  min-height: 60vh;
  display: grid;
  place-items: center;
`;

const SpinIcon = styled(Loader2)`
  width: 32px;
  height: 32px;
  color: var(--foreground);
  opacity: 0.8;
  animation: spin 900ms linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const EmptyState = styled(CardContent)`
  min-height: 40vh;
  display: grid;
  place-items: center;
  text-align: center;
  gap: 10px;
  padding: 32px;
`;

const EmptyIcon = styled(Coins)`
  width: 48px;
  height: 48px;
  color: var(--muted-foreground);
`;
