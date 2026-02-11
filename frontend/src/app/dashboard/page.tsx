"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styled from "@emotion/styled";
import { format } from "date-fns";
import { formatUnits } from "ethers";
import { useTranslations } from "next-intl";
import { ExternalLink, Loader2, Plus } from "lucide-react";

import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/auth-context";
import {
  loanRequestAPI,
  loanAPI,
  type LoanRequest,
  type LoanIndex,
  type LoanListResponse,
  type LoanRequestListResponse,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isConnected, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const t = useTranslations("dashboard");
  const c = useTranslations("common");

  const [borrowedRequests, setBorrowedRequests] = useState<LoanRequest[]>([]);
  const [lentLoans, setLentLoans] = useState<LoanIndex[]>([]);
  const [cancelledRequests, setCancelledRequests] = useState<LoanRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isConnected || !user) {
      router.push("/");
      return;
    }
    void loadData(user.wallet_address);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isConnected, user?.wallet_address]);

  const loadData = async (walletAddress: string) => {
    try {
      setIsLoading(true);

      const [borrowedRes, lentRes] = await Promise.all([
        loanRequestAPI.getAll({ borrower: walletAddress, limit: 50 }),
        loanAPI.getAll({ lender: walletAddress, limit: 50 }),
      ]);

      const borrowed = (borrowedRes as LoanRequestListResponse).loanRequests ?? [];
      const lent = (lentRes as LoanListResponse).loans ?? [];

      const cancelled = borrowed.filter((r) => r.status === "CANCELLED");
      const activeBorrowed = borrowed.filter((r) => r.status !== "CANCELLED");

      setBorrowedRequests(activeBorrowed);
      setCancelledRequests(cancelled);
      setLentLoans(lent);
    } catch (err: unknown) {
      console.error("Failed to load dashboard:", err);
      toast({
        title: c("error"),
        description: t("toast.loadError"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const displayName = useMemo(() => {
    if (!user) return "";
    return user.nickname?.trim() ? user.nickname : `User_${user.wallet_address.slice(2, 8)}`;
  }, [user]);

  const shortWallet = useMemo(() => {
    if (!user) return "";
    return `${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}`;
  }, [user]);

  const statsBorrow = useMemo(() => calcRequestStats(borrowedRequests), [borrowedRequests]);
  const statsLend = useMemo(() => calcLoanStats(lentLoans), [lentLoans]);

  if (authLoading || isLoading) {
    return (
      <Page>
        <Navbar />
        <Main>
          <Center>
            <Loader2 aria-label="loading" className="h-8 w-8 animate-spin" />
          </Center>
        </Main>
      </Page>
    );
  }

  return (
    <Page>
      <Navbar />

      <Main>
        <HeaderRow>
          <TitleBox>
            <Title>{t("title")}</Title>
            <Subtitle>
              {t("welcome", { name: displayName })} <MutedInline>({shortWallet})</MutedInline>
            </Subtitle>
          </TitleBox>

          <Actions>
            <Link href="/create-loan">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t("cta.newLoan")}
              </Button>
            </Link>
          </Actions>
        </HeaderRow>

        <KpiGrid>
          <Card>
            <CardHeader>
              <CardTitle>{t("kpi.borrowedActive.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <KpiValue>{statsBorrow.active}</KpiValue>
              <KpiMeta>{t("kpi.pending", { count: statsBorrow.pending })}</KpiMeta>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("kpi.lentActive.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <KpiValue>{statsLend.active}</KpiValue>
              <KpiMeta>{t("kpi.pending", { count: statsLend.pending })}</KpiMeta>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("kpi.totalBorrowed.title")}</CardTitle>
            </CardHeader>
          <CardContent>
              <KpiValue>{statsBorrow.totalAmountDisplay}</KpiValue>
              <KpiMeta>{t("kpi.totalBorrowed.hint")}</KpiMeta>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("kpi.totalLent.title")}</CardTitle>
            </CardHeader>
          <CardContent>
              <KpiValue>{statsLend.totalAmountDisplay}</KpiValue>
              <KpiMeta>{t("kpi.totalLent.hint")}</KpiMeta>
            </CardContent>
          </Card>
        </KpiGrid>

        <Section>
          <SectionHeader>
            <SectionTitle>{t("section.loans")}</SectionTitle>
          </SectionHeader>

          <Separator />

          <TabsWrap>
            <Tabs defaultValue="borrowed">
              <TabsList>
                <TabsTrigger value="borrowed">
                  {t("tabs.borrowed")} ({borrowedRequests.length})
                </TabsTrigger>
                <TabsTrigger value="lent">
                  {t("tabs.lent")} ({lentLoans.length})
                </TabsTrigger>
                <TabsTrigger value="cancelled">
                  {t("tabs.cancelled")} ({cancelledRequests.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="borrowed">
                {borrowedRequests.length === 0 ? (
                  <EmptyCard>
                    <EmptyTitle>{t("empty.borrowed.title")}</EmptyTitle>
                    <EmptyDesc>{t("empty.borrowed.description")}</EmptyDesc>
                    <Link href="/create-loan">
                      <Button>{t("empty.borrowed.button")}</Button>
                    </Link>
                  </EmptyCard>
                ) : (
                  <ListGrid>
                    {borrowedRequests.map((request) => (
                      <RequestCard key={request.id} request={request} />
                    ))}
                  </ListGrid>
                )}
              </TabsContent>

              <TabsContent value="lent">
                {lentLoans.length === 0 ? (
                  <EmptyCard>
                    <EmptyTitle>{t("empty.lent.title")}</EmptyTitle>
                    <EmptyDesc>{t("empty.lent.description")}</EmptyDesc>
                    <Link href="/marketplace">
                      <Button>{t("empty.lent.button")}</Button>
                    </Link>
                  </EmptyCard>
                ) : (
                  <ListGrid>
                    {lentLoans.map((loan) => (
                      <LoanCard key={loan.id} loan={loan} />
                    ))}
                  </ListGrid>
                )}
              </TabsContent>

              <TabsContent value="cancelled">
                {cancelledRequests.length === 0 ? (
                  <EmptyCard>
                    <EmptyTitle>{t("empty.cancelled.title")}</EmptyTitle>
                    <EmptyDesc>{t("empty.cancelled.description")}</EmptyDesc>
                    <Link href="/create-loan">
                      <Button>{t("empty.cancelled.button")}</Button>
                    </Link>
                  </EmptyCard>
                ) : (
                  <ListGrid>
                    {cancelledRequests.map((request) => (
                      <RequestCard key={request.id} request={request} />
                    ))}
                  </ListGrid>
                )}
              </TabsContent>
            </Tabs>
          </TabsWrap>
        </Section>
      </Main>
    </Page>
  );
}

/* ---------------------------------- */
/* UI pieces                           */
/* ---------------------------------- */

function RequestCard({ request }: { request: LoanRequest }) {
  const t = useTranslations("dashboard");

  const principalToken = request.principalToken;
  const collateralToken = request.collateralToken;

  const principalAmount = principalToken
    ? formatUnits(BigInt(request.principalAmount), principalToken.decimals)
    : request.principalAmount;

  const collateralAmount = collateralToken
    ? formatUnits(BigInt(request.collateralAmount), collateralToken.decimals)
    : request.collateralAmount;

  const durationDays = Math.ceil(request.durationSeconds / 86400);

  return (
    <Card>
      <CardHeader>
        <CardTopRow>
          <CardTitleBox>
            <AmountLine>
              {principalAmount} {principalToken?.symbol ?? ""}
            </AmountLine>
            <AssetName>{t("intent.principal")}</AssetName>
          </CardTitleBox>

          <StatusPill data-status={request.status}>{request.status}</StatusPill>
        </CardTopRow>
      </CardHeader>

      <CardContent>
        <MetaList>
          <MetaRow>
            <MetaLabel>{t("intent.interest")}</MetaLabel>
            <MetaValueAccent>{(request.interestBps / 100).toFixed(2)}%</MetaValueAccent>
          </MetaRow>

          <MetaRow>
            <MetaLabel>{t("intent.collateral")}</MetaLabel>
            <MetaValue>
              {collateralAmount} {collateralToken?.symbol ?? ""}
            </MetaValue>
          </MetaRow>

          <MetaRow>
            <MetaLabel>{t("intent.deadline")}</MetaLabel>
            <MetaValue>{durationDays} {durationDays === 1 ? "day" : "days"}</MetaValue>
          </MetaRow>
        </MetaList>

        <Link href={`/loan/${request.id}`}>
          <Button variant="outline">
            {t("loan.viewDetails")}
            <ExternalLink className="ml-2 h-3 w-3" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function LoanCard({ loan }: { loan: LoanIndex }) {
  const t = useTranslations("dashboard");

  const request = loan.request;
  const principalToken = request?.principalToken;
  const principalAmount = request?.principalAmount
    ? formatUnits(BigInt(request.principalAmount), request.principalToken.decimals)
    : "-";
  const due = new Date(Number(loan.dueTimestamp) * 1000);

  return (
    <Card>
      <CardHeader>
        <CardTopRow>
          <CardTitleBox>
            <AmountLine>
              {principalAmount} {principalToken?.symbol ?? ""}
            </AmountLine>
            <AssetName>{t("loan.principal")}</AssetName>
          </CardTitleBox>

          <StatusPill data-status={loan.status}>{loan.status}</StatusPill>
        </CardTopRow>
      </CardHeader>

      <CardContent>
        <MetaList>
          <MetaRow>
            <MetaLabel>{t("loan.status")}</MetaLabel>
            <MetaValue>{loan.status}</MetaValue>
          </MetaRow>

          <MetaRow>
            <MetaLabel>{t("loan.dueDate")}</MetaLabel>
            <MetaValue>{format(due, "yyyy-MM-dd")}</MetaValue>
          </MetaRow>
        </MetaList>

        <Link href={`/loan/${loan.id}`}>
          <Button variant="outline">
            {t("loan.viewDetails")}
            <ExternalLink className="ml-2 h-3 w-3" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

/* ---------------------------------- */
/* Stats helpers                       */
/* ---------------------------------- */

function calcRequestStats(requests: LoanRequest[]) {
  const active = requests.filter((r) => r.status === "OPEN").length;
  const pending = requests.filter((r) => r.status === "FUNDED").length;
  const completed = requests.filter((r) =>
    ["FUNDED", "CANCELLED"].includes(r.status),
  ).length;

  const totalAmount = requests.reduce((sum, r) => sum + BigInt(r.principalAmount), 0n);

  const token = requests[0]?.principalToken;
  const decimals = token?.decimals ?? 0;
  const symbol = token?.symbol ?? "";
  const totalAmountDisplay =
    decimals > 0 ? `${formatUnits(totalAmount, decimals)}${symbol ? ` ${symbol}` : ""}` : totalAmount.toString();

  return { active, pending, completed, totalAmount, totalAmountDisplay };
}

function calcLoanStats(loans: LoanIndex[]) {
  const active = loans.filter((l) => l.status === "ONGOING").length;
  const pending = 0;
  const completed = loans.filter((l) => l.status !== "ONGOING").length;
  const totalAmount = loans.reduce((sum, l) => {
    const amount = l.request?.principalAmount ? BigInt(l.request.principalAmount) : 0n;
    return sum + amount;
  }, 0n);

  const token = loans[0]?.request?.principalToken;
  const decimals = token?.decimals ?? 0;
  const symbol = token?.symbol ?? "";
  const totalAmountDisplay =
    decimals > 0 ? `${formatUnits(totalAmount, decimals)}${symbol ? ` ${symbol}` : ""}` : totalAmount.toString();

  return { active, pending, completed, totalAmount, totalAmountDisplay };
}

/* ---------------------------------- */
/* styles (Emotion)                    */
/* ---------------------------------- */

const Page = styled.div`
  min-height: 100vh;
  background: var(--background);
`;

const Main = styled.main`
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 24px 16px 56px;

  @media (max-width: 480px) {
    padding: 16px 12px 48px;
  }
`;

const Center = styled.div`
  min-height: 60vh;
  display: grid;
  place-items: center;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const TitleBox = styled.div`
  min-width: 0;
`;

const Title = styled.h1`
  margin: 0 0 8px;
  font-size: 28px;
  line-height: 1.2;
  letter-spacing: 0.005em;
  font-weight: 800;
  color: var(--foreground);
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  letter-spacing: -0.015em;
  color: var(--muted-foreground);
`;

const MutedInline = styled.span`
  color: var(--muted-foreground);
  opacity: 0.9;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const KpiValue = styled.div`
  font-size: 26px;
  line-height: 1.2;
  letter-spacing: 0.005em;
  font-weight: 800;
  color: var(--foreground);
`;

const KpiMeta = styled.div`
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.5;
  letter-spacing: -0.015em;
  color: var(--muted-foreground);
`;

const Section = styled.section`
  margin-top: 8px;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 16px;
  line-height: 1.4;
  letter-spacing: -0.005em;
  font-weight: 800;
  color: var(--foreground);
`;

const TabsWrap = styled.div`
  margin-top: 12px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  background: color-mix(in oklab, var(--card) 70%, transparent);
`;

const ListGrid = styled.div`
  margin-top: 12px;
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const EmptyCard = styled(Card)`
  margin-top: 12px;
  padding: 20px;
`;

const EmptyTitle = styled.div`
  font-size: 15px;
  line-height: 1.4;
  letter-spacing: -0.005em;
  font-weight: 800;
  color: var(--foreground);
  margin-bottom: 6px;
`;

const EmptyDesc = styled.div`
  font-size: 13px;
  line-height: 1.5;
  letter-spacing: -0.015em;
  color: var(--muted-foreground);
  margin-bottom: 14px;
`;

const CardTopRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`;

const CardTitleBox = styled.div`
  min-width: 0;
`;

const AmountLine = styled.div`
  font-size: 20px;
  line-height: 1.2;
  letter-spacing: 0.005em;
  font-weight: 800;
  color: var(--foreground);
`;

const AssetName = styled.div`
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.5;
  letter-spacing: -0.015em;
  color: var(--muted-foreground);
`;

const StatusPill = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: color-mix(in oklab, var(--muted) 70%, transparent);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.01em;
  color: var(--foreground);
  white-space: nowrap;

  &[data-status="CLAIMED"] {
    border-color: color-mix(in oklab, var(--error) 45%, var(--border));
  }

  &[data-status="OPEN"] {
    border-color: color-mix(in oklab, var(--success) 35%, var(--border));
  }

  &[data-status="FUNDED"],
  &[data-status="ONGOING"] {
    border-color: color-mix(in oklab, var(--info) 35%, var(--border));
  }
`;

const MetaList = styled.div`
  display: grid;
  gap: 10px;
  margin-bottom: 12px;
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const MetaLabel = styled.span`
  font-size: 13px;
  line-height: 1.5;
  letter-spacing: -0.015em;
  color: var(--muted-foreground);
`;

const MetaValue = styled.span`
  font-size: 13px;
  line-height: 1.5;
  letter-spacing: -0.015em;
  font-weight: 700;
  color: var(--foreground);
`;

const MetaValueAccent = styled(MetaValue)`
  color: var(--primary);
`;
