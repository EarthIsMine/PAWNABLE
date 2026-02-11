"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import styled from "@emotion/styled";
import { formatUnits } from "ethers";

import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { loanAPI } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

import { Loader2, ArrowLeft, Calendar, TrendingUp, Coins, Shield, AlertCircle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

type LoanStatus = "ONGOING" | "REPAID" | "CLAIMED";

type TokenInfo = {
  symbol: string;
  decimals: number;
  address: string;
  isNative: boolean;
};

type IntentInfo = {
  principalAmount: string;
  collateralAmount: string;
  interestBps: number;
  durationSeconds: number;
  principalToken: TokenInfo;
  collateralToken: TokenInfo;
};

type LoanDetail = {
  id: string;
  loanId: string;
  status: LoanStatus;
  borrower: { address: string };
  lender: { address: string };
  intent?: IntentInfo | null;
  startTimestamp: string;
  dueTimestamp: string;
};

function toBigInt(value: string | number | bigint | null | undefined) {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string" && value.length > 0) return BigInt(value);
  return 0n;
}

function formatAmount(raw: string, decimals: number) {
  try {
    return formatUnits(toBigInt(raw), decimals);
  } catch {
    return "0";
  }
}

export default function LoanDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isConnected } = useAuth();
  const { toast } = useToast();

  const t = useTranslations("loanDetail");
  const tc = useTranslations("common");

  const [loan, setLoan] = useState<LoanDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loanId = params?.id;

  useEffect(() => {
    if (!loanId) return;
    void loadData(loanId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanId]);

  async function loadData(id: string) {
    try {
      setIsLoading(true);

      const loanRes = (await loanAPI.getById(id)) as LoanDetail;
      setLoan(loanRes);
    } catch (err) {
      toast({
        title: tc("error"),
        description: t("toast.loadError"),
        variant: "destructive",
      });
      setLoan(null);
    } finally {
      setIsLoading(false);
    }
  }

  const viewModel = useMemo(() => {
    if (!loan) return null;

    const intent = loan.intent ?? null;
    const principalToken = intent?.principalToken ?? null;
    const collateralToken = intent?.collateralToken ?? null;
    const dueDate = new Date(Number(loan.dueTimestamp) * 1000);
    const isOverdue = dueDate.getTime() < Date.now();
    return {
      principalToken,
      collateralToken,
      intent,
      dueDate,
      isOverdue,
    };
  }, [loan]);

  function statusLabel(status: LoanStatus) {
    // ko.json에 이미 dashboard.status가 있으므로 재사용 (키 경로는 프로젝트 기준에 맞게 유지)
    // loanDetail쪽으로 옮기고 싶으면 키 재정리 가능
    // 여기서는 loanDetail.statusLabel.* 로 쓰는 편이 컴포넌트 응집도는 더 좋음
    return t(`statusLabel.${status}`);
  }

  if (isLoading) {
    return (
      <Shell>
        <Navbar />
        <Center>
          <Loader2 className="h-8 w-8 animate-spin" />
        </Center>
      </Shell>
    );
  }

  if (!loan || !viewModel) {
    return (
      <Shell>
        <Navbar />
        <Page>
          <PageHeader>
            <BackRow>
              <Button variant="ghost" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {tc("back", { default: "뒤로" })}
              </Button>
            </BackRow>
            <Title>{t("notFound")}</Title>
          </PageHeader>
        </Page>
      </Shell>
    );
  }

  const { principalToken, collateralToken, intent, dueDate, isOverdue } = viewModel;

  const principalAmount = intent ? formatAmount(intent.principalAmount, intent.principalToken.decimals) : "0";
  const interestBps = intent?.interestBps ?? 0;
  const interestRatePct = (interestBps / 100).toFixed(2);
  const totalRepayment = intent
    ? formatAmount(
        (toBigInt(intent.principalAmount) + (toBigInt(intent.principalAmount) * BigInt(interestBps)) / 10000n).toString(),
        intent.principalToken.decimals,
      )
    : "0";

  return (
    <Shell>
      <Navbar />

      <Page>
        <PageHeader>
          <BackRow>
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {tc("back", { default: "뒤로" })}
            </Button>
          </BackRow>

          <TopLine>
            <div>
              <Title>{t("title")}</Title>
              <SubText>
                {t("idLabel")}: <Mono>{loan.loanId ?? loan.id}</Mono>
              </SubText>
            </div>

            <Badge variant="secondary">{statusLabel(loan.status)}</Badge>
          </TopLine>
        </PageHeader>

        <Grid>
          <MainCol>
            <Card>
              <CardHeader>
                <CardTitle>{t("section.overview")}</CardTitle>
              </CardHeader>

              <CardContent>
                <Rows>
                  <Row>
                    <RowLabel>
                      <Coins className="h-5 w-5" />
                      <span>{t("field.loanAmount")}</span>
                    </RowLabel>
                    <RowValue>
                      {principalAmount} {principalToken?.symbol ?? ""}
                    </RowValue>
                  </Row>

                  <Separator />

                  <Row>
                    <RowLabel>
                      <TrendingUp className="h-5 w-5" />
                      <span>{t("field.interestRate")}</span>
                    </RowLabel>
                    <RowValue>
                      <Primary>
                        {interestRatePct}%
                      </Primary>
                    </RowValue>
                  </Row>

                  <Separator />

                  <Row>
                    <RowLabel>
                      <Coins className="h-5 w-5" />
                      <span>{t("field.totalRepayment")}</span>
                    </RowLabel>
                    <RowValue>
                      {totalRepayment} {principalToken?.symbol ?? ""}
                    </RowValue>
                  </Row>

                  <Separator />

                  <Row>
                    <RowLabel>
                      <Calendar className="h-5 w-5" />
                      <span>{t("field.dueDate")}</span>
                    </RowLabel>
                    <RowValueRight>
                      <div>{format(dueDate, "PPP")}</div>
                      <SmallMuted data-overdue={isOverdue}>
                        {formatDistanceToNow(dueDate, { addSuffix: true })}
                      </SmallMuted>
                    </RowValueRight>
                  </Row>
                </Rows>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  <InlineTitle>
                    <Shield className="h-5 w-5" />
                    {t("section.collateral")}
                  </InlineTitle>
                </CardTitle>
              </CardHeader>

              <CardContent>
                {collateralToken && intent ? (
                  <CollateralList>
                    <CollateralItem key={collateralToken.address ?? "collateral-token"}>
                      <div>
                        <div>{collateralToken.symbol ?? t("unknownAsset")}</div>
                        <SmallMuted>{collateralToken.address ?? "-"}</SmallMuted>
                      </div>
                      <div>
                        <div>
                          <strong>
                            {formatAmount(intent.collateralAmount, collateralToken.decimals)}
                          </strong>{" "}
                          {collateralToken.symbol ?? ""}
                        </div>
                      </div>
                    </CollateralItem>
                  </CollateralList>
                ) : (
                  <Muted>{t("emptyCollateral")}</Muted>
                )}
              </CardContent>
            </Card>
          </MainCol>

          <SideCol>
            <Card>
              <CardHeader>
                <CardTitle>{t("section.actions")}</CardTitle>
              </CardHeader>

              <CardContent>
                <ActionStack>
                  <HintBox>
                    <AlertCircle className="h-5 w-5" />
                    <span>{t("hint.onchainOnly")}</span>
                  </HintBox>
                  {!isConnected && (
                    <HintBox>
                      <AlertCircle className="h-5 w-5" />
                      <span>{t("hint.connectWallet")}</span>
                    </HintBox>
                  )}
                </ActionStack>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("section.timeline")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Timeline>
                  <TimelineItem>
                    <div>{t("timeline.created")}</div>
                    <SmallMuted>
                      {format(new Date(Number(loan.startTimestamp) * 1000), "PPp")}
                    </SmallMuted>
                  </TimelineItem>

                  <TimelineItem>
                    <div>{t("timeline.due")}</div>
                    <SmallMuted>{format(new Date(Number(loan.dueTimestamp) * 1000), "PPp")}</SmallMuted>
                  </TimelineItem>
                </Timeline>
              </CardContent>
            </Card>
          </SideCol>
        </Grid>
      </Page>

      {/* Confirm Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle()}</AlertDialogTitle>
            <AlertDialogDescription>
              {actionType ? confirmDescription(actionType) : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            {/* 우리 AlertDialog 컴포넌트가 text children을 못 받는 계약이면, 반드시 asChild로 Button 래핑 */}
            <AlertDialogCancel asChild>
              <Button variant="outline" disabled={isProcessing}>
                {tc("cancel")}
              </Button>
            </AlertDialogCancel>

            <AlertDialogAction asChild>
              <Button onClick={handleAction} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("confirm.processing")}
                  </>
                ) : actionType ? (
                  confirmCta(actionType)
                ) : (
                  tc("confirm")
                )}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Shell>
  );
}

/* ------------------ */
/* styles (Emotion)   */
/* ------------------ */

const Shell = styled.div`
  min-height: 100vh;
  background: var(--background);
  color: var(--foreground);
`;

const Center = styled.div`
  min-height: calc(100vh - 64px);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Page = styled.main`
  max-width: 1080px;
  margin: 0 auto;
  padding: 24px 16px 56px;
`;

const PageHeader = styled.header`
  margin-bottom: 20px;
`;

const BackRow = styled.div`
  margin-bottom: 12px;
`;

const TopLine = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
`;

const Title = styled.h1`
  font-size: 24px;
  line-height: 1.2;
  font-weight: 800;
  margin: 0 0 6px;
`;

const SubText = styled.p`
  margin: 0;
  color: var(--muted-foreground);
  font-size: 13px;
  line-height: 1.5;
`;

const Mono = styled.span`
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New",
    monospace;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: 1024px) {
    grid-template-columns: 2fr 1fr;
    gap: 20px;
  }
`;

const MainCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const SideCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Rows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
`;

const RowLabel = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--muted-foreground);
  font-size: 13px;
`;

const RowValue = styled.div`
  font-size: 15px;
  font-weight: 600;
`;

const RowValueRight = styled.div`
  text-align: right;
  font-size: 14px;
  font-weight: 600;
`;

const SmallMuted = styled.div<{ "data-overdue"?: boolean }>`
  margin-top: 2px;
  font-size: 12px;
  font-weight: 500;
  color: ${(p) => (p["data-overdue"] ? "var(--destructive)" : "var(--muted-foreground)")};
`;

const Primary = styled.span`
  color: var(--primary);
`;

const InlineTitle = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 10px;
`;

const Muted = styled.p`
  margin: 0;
  color: var(--muted-foreground);
  font-size: 13px;
  line-height: 1.5;
`;

const CollateralList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const CollateralItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 14px;
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 4px);
  background: color-mix(in oklab, var(--card) 92%, transparent);
`;

const ActionStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;

  & > button {
    width: 100%;
  }
`;

const HintBox = styled.div`
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px 12px;
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 4px);
  background: color-mix(in oklab, var(--muted) 40%, transparent);
  color: var(--muted-foreground);
  font-size: 13px;
  line-height: 1.5;
`;

const Timeline = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const TimelineItem = styled.div`
  font-size: 13px;
  font-weight: 600;
`;
