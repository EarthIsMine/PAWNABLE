"use client";

import { useEffect, useMemo, useState } from "react";
import styled from "@emotion/styled";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { ko, enUS } from "date-fns/locale";
import { Calendar, Coins, Loader2, TrendingUp } from "lucide-react";

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
import { loanAPI, assetAPI } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { getLocale } from "@/lib/locale";

interface Loan {
  loan_id: string;
  borrower_id: string;
  loan_asset_id: string;
  loan_amount: number;
  interest_rate_pct: number;
  total_repay_amount: number;
  repay_due_at: string;
  status: string;
  created_at: string;
  collaterals?: Array<{
    asset_id: string;
    amount: number;
    token_id?: string | null;
  }>;
}

interface Asset {
  asset_id: string;
  symbol: string;
  name: string;
  blockchain: string;
}

export default function MarketplacePage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [assets, setAssets] = useState<Record<string, Asset>>({});
  const [isLoading, setIsLoading] = useState(true);

  const { isConnected, user } = useAuth();
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

      const [loansData, assetsData] = await Promise.all([
        loanAPI.getMarketplace(),
        assetAPI.getAll(),
      ]);

      setLoans(loansData);

      const assetMap: Record<string, Asset> = {};
      assetsData.forEach((asset: Asset) => {
        assetMap[asset.asset_id] = asset;
      });
      setAssets(assetMap);
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

  const handleMatch = async (loanId: string) => {
    if (!user) {
      toast({
        title: t("toast.connectWallet"),
        description: t("toast.pleaseConnect"),
        variant: "destructive",
      });
      return;
    }

    try {
      await loanAPI.match(loanId, user.user_id);
      toast({
        title: common("success"),
        description: t("toast.matchSuccess"),
      });
      void loadData();
    } catch (error: any) {
      toast({
        title: common("error"),
        description: error?.message || t("toast.matchError"),
        variant: "destructive",
      });
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
        ) : loans.length === 0 ? (
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
              <CountText>{t("count", { count: loans.length })}</CountText>
            </Controls>

            <Grid>
              {loans.map((loan) => {
                const loanAsset = assets[loan.loan_asset_id];
                const dueDate = new Date(loan.repay_due_at);

                return (
                  <LoanCard key={loan.loan_id}>
                    <CardHeader>
                      <TopRow>
                        <AmountBlock>
                          <Amount>
                            {loan.loan_amount} {loanAsset?.symbol || ""}
                          </Amount>
                          <AssetName>{loanAsset?.name || "Unknown Asset"}</AssetName>
                        </AmountBlock>

                        <Badge variant="outline">{String(loan.status).toUpperCase()}</Badge>
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
                            <MetaValueAccent>{loan.interest_rate_pct.toFixed(2)}%</MetaValueAccent>
                          </MetaText>
                        </MetaItem>

                        <MetaItem>
                          <MetaIcon aria-hidden="true">
                            <Coins width={18} height={18} />
                          </MetaIcon>
                          <MetaText>
                            <MetaLabel>{t("card.totalRepay")}</MetaLabel>
                            <MetaValue>
                              {loan.total_repay_amount} {loanAsset?.symbol || ""}
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

                      {loan.collaterals && loan.collaterals.length > 0 && (
                        <CollateralBox>
                          <CollateralTitle>{t("card.collateral")}</CollateralTitle>
                          <CollateralList>
                            {loan.collaterals.map((c, idx) => {
                              const cAsset = assets[c.asset_id];
                              return (
                                <CollateralItem key={`${loan.loan_id}-${idx}`}>
                                  {c.amount} {cAsset?.symbol || ""}
                                </CollateralItem>
                              );
                            })}
                          </CollateralList>
                        </CollateralBox>
                      )}
                    </CardContent>

                    <CardFooter>
                      <Button
                        size="lg"
                        tone="accent"
                        fullWidth
                        onClick={() => void handleMatch(loan.loan_id)}
                        disabled={!isConnected}
                      >
                        {isConnected ? t("card.lendNow") : t("card.walletRequired")}
                      </Button>
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
