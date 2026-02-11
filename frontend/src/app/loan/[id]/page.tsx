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
import { loanRequestAPI, loanAPI, type LoanRequest, type LoanIndex } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { contractService } from "@/lib/contract";

import { Loader2, ArrowLeft, Calendar, TrendingUp, Coins, Shield, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Detail =
  | { kind: "loan"; data: LoanIndex }
  | { kind: "request"; data: LoanRequest };

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

function toDateSafe(value: string | number | null | undefined) {
  if (value == null) return null;
  if (typeof value === "number") {
    const ms = value > 1e12 ? value : value * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber)) {
      const ms = asNumber > 1e12 ? asNumber : asNumber * 1000;
      const date = new Date(ms);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function formatUtcDate(date: Date) {
  const iso = date.toISOString();
  return `${iso.slice(0, 10)} UTC`;
}

function formatUtcDateTime(date: Date) {
  const iso = date.toISOString();
  return `${iso.slice(0, 16).replace("T", " ")} UTC`;
}

function formatLocalDateTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(date);
}

export default function LoanDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isConnected, user } = useAuth();
  const { toast } = useToast();

  const t = useTranslations("loanDetail");
  const tc = useTranslations("common");

  const [detail, setDetail] = useState<Detail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRepaying, setIsRepaying] = useState(false);

  const loanId = params?.id;

  useEffect(() => {
    if (!loanId) return;
    void loadData(loanId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanId]);

  async function loadData(id: string) {
    try {
      setIsLoading(true);

      // Try loading as loan first
      try {
        const loanRes = await loanAPI.getById(id);
        setDetail({ kind: "loan", data: loanRes });
        return;
      } catch {
        // fall through
      }

      // Then try as loan request
      const requestRes = await loanRequestAPI.getById(id);
      setDetail({ kind: "request", data: requestRes });
    } catch (err) {
      toast({
        title: tc("error"),
        description: t("toast.loadError"),
        variant: "destructive",
      });
      setDetail(null);
    } finally {
      setIsLoading(false);
    }
  }

  const viewModel = useMemo(() => {
    if (!detail) return null;

    if (detail.kind === "loan") {
      const loan = detail.data;
      const request = loan.request ?? null;
      const principalToken = request?.principalToken ?? null;
      const collateralToken = request?.collateralToken ?? null;
      const dueDate = new Date(Number(loan.dueTimestamp) * 1000);
      const isOverdue = dueDate.getTime() < Date.now();
      return {
        kind: "loan" as const,
        status: loan.status,
        loanStatus: loan.status,
        loanDbId: loan.id,
        onchainLoanId: loan.onchainLoanId ?? null,
        displayId: loan.onchainLoanId ?? loan.id,
        principalToken,
        principalTokenAddress: request?.principalTokenAddress ?? "",
        collateralToken,
        principalAmount: request?.principalAmount ?? "0",
        collateralAmount: request?.collateralAmount ?? "0",
        interestBps: request?.interestBps ?? 0,
        dueDate,
        isOverdue,
        createdAt: loan.startTimestamp,
        dueAt: loan.dueTimestamp,
        borrowerAddress: loan.borrower?.address ?? "",
      };
    }

    const request = detail.data;
    const principalToken = request.principalToken ?? null;
    const collateralToken = request.collateralToken ?? null;
    const durationDays = Math.ceil(request.durationSeconds / 86400);
    return {
      kind: "request" as const,
      status: request.status,
      loanStatus: request.loan?.status ?? null,
      loanDbId: request.loan?.id ?? null,
      onchainLoanId: request.loan?.onchainLoanId ?? null,
      displayId: request.loan?.onchainLoanId ?? request.onchainRequestId ?? request.id,
      principalToken,
      principalTokenAddress: request.principalTokenAddress ?? "",
      collateralToken,
      principalAmount: request.principalAmount,
      collateralAmount: request.collateralAmount,
      interestBps: request.interestBps,
      dueDate: null as Date | null,
      isOverdue: false,
      createdAt: request.indexedAt ?? null,
      dueAt: null as string | null,
      durationDays,
      borrowerAddress: request.borrowerAddress,
      onchainRequestId: request.onchainRequestId,
    };
  }, [detail]);

  const isBorrower =
    Boolean(user?.wallet_address) &&
    viewModel?.borrowerAddress?.toLowerCase() === user?.wallet_address?.toLowerCase();

  const canCancelRequest =
    viewModel?.kind === "request" &&
    viewModel.status === "OPEN" &&
    Boolean(user?.wallet_address) &&
    viewModel.borrowerAddress?.toLowerCase() === user?.wallet_address?.toLowerCase();

  const canRepayLoan =
    Boolean(viewModel?.onchainLoanId) &&
    Boolean(viewModel?.principalTokenAddress) &&
    isBorrower &&
    ((viewModel?.kind === "loan" && viewModel.status === "ONGOING") ||
      (viewModel?.kind === "request" &&
        viewModel.status === "FUNDED" &&
        viewModel.loanStatus === "ONGOING"));

  const handleCancelRequest = async () => {
    if (!viewModel || viewModel.kind !== "request" || !detail || detail.kind !== "request") return;

    try {
      setIsCancelling(true);

      const result = await contractService.cancelLoanRequest(detail.data.onchainRequestId);

      await loanRequestAPI.cancel(detail.data.id, result.hash);

      toast({
        title: tc("success"),
        description: t("toast.cancelSuccess"),
      });

      await loadData(detail.data.id);
    } catch (err: unknown) {
      const error = err as any;
      const code = error?.code ?? error?.info?.error?.code;
      const isUserRejected =
        code === 4001 ||
        code === "ACTION_REJECTED" ||
        /user denied|rejected|ACTION_REJECTED/i.test(error?.message || "");

      if (isUserRejected) {
        toast({
          title: tc("error"),
          description: t("toast.txRejected", { defaultMessage: "Transaction rejected" }),
        });
        return;
      }

      toast({
        title: tc("error"),
        description: error instanceof Error ? error.message : t("toast.genericError"),
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRepayLoan = async () => {
    if (!viewModel?.onchainLoanId || !viewModel.principalTokenAddress) return;

    try {
      setIsRepaying(true);

      const repayAmount = await contractService.getRepayAmount(viewModel.onchainLoanId);
      const result = await contractService.repayLoan({
        loanId: viewModel.onchainLoanId,
        principalToken: viewModel.principalTokenAddress,
        repayAmount,
      });

      if (viewModel.loanDbId) {
        await loanAPI.updateStatus(viewModel.loanDbId, "REPAID", result.hash);
      }

      toast({
        title: tc("success"),
        description: t("toast.repaySuccess", { hash: result.hash }),
      });

      if (detail) {
        await loadData(detail.kind === "loan" ? detail.data.id : detail.data.id);
      }
    } catch (err: unknown) {
      const error = err as any;
      const message = error?.message || "";
      const code = error?.code ?? error?.info?.error?.code;
      const isInsufficientFunds =
        code === "INSUFFICIENT_FUNDS" ||
        /insufficient funds|funds for gas \* price \+ value/i.test(message);
      const isUserRejected =
        code === 4001 ||
        code === "ACTION_REJECTED" ||
        /user denied|rejected|ACTION_REJECTED/i.test(message);

      if (isUserRejected) {
        toast({
          title: tc("error"),
          description: t("toast.txRejected", { defaultMessage: "Transaction rejected" }),
        });
        return;
      }

      if (isInsufficientFunds) {
        toast({
          title: t("toast.insufficientFundsTitle"),
          description: t("toast.insufficientFundsDesc"),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: tc("error"),
        description: error instanceof Error ? error.message : t("toast.repayError"),
        variant: "destructive",
      });
    } finally {
      setIsRepaying(false);
    }
  };

  function statusLabel(status: string) {
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

  if (!detail || !viewModel) {
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

  const { principalToken, collateralToken, dueDate, isOverdue } = viewModel;
  const createdAtDate = toDateSafe(viewModel.createdAt);
  const dueDateUtc = dueDate ? formatUtcDateTime(dueDate) : null;
  const dueDateLocal = dueDate ? formatLocalDateTime(dueDate) : null;
  const createdAtLocal = createdAtDate ? formatLocalDateTime(createdAtDate) : null;

  const principalDecimals = principalToken?.decimals ?? 18;
  const principalAmount = formatAmount(viewModel.principalAmount, principalDecimals);
  const interestBps = viewModel.interestBps;
  const interestRatePct = (interestBps / 100).toFixed(2);
  const totalRepayment = formatAmount(
    (toBigInt(viewModel.principalAmount) + (toBigInt(viewModel.principalAmount) * BigInt(interestBps)) / 10000n).toString(),
    principalDecimals,
  );

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
                {t("idLabel")}: <Mono>{viewModel.displayId}</Mono>
              </SubText>
            </div>

            <Badge variant="secondary">{statusLabel(viewModel.status)}</Badge>
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
                      {dueDate ? (
                        <>
                          <div>{formatUtcDate(dueDate)} · {dueDateLocal}</div>
                          <SmallMuted data-overdue={isOverdue}>
                            {formatDistanceToNow(dueDate, { addSuffix: true })}
                          </SmallMuted>
                        </>
                      ) : viewModel.kind === "request" && "durationDays" in viewModel ? (
                        <div>{viewModel.durationDays} {viewModel.durationDays === 1 ? "day" : "days"}</div>
                      ) : (
                        <div>-</div>
                      )}
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
                {collateralToken ? (
                  <CollateralList>
                    <CollateralItem>
                      <div>
                        <div>{collateralToken.symbol ?? t("unknownAsset")}</div>
                      </div>
                      <div>
                        <div>
                          <strong>
                            {formatAmount(viewModel.collateralAmount, collateralToken.decimals)}
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
                  {canCancelRequest && (
                    <Button variant="destructive" onClick={handleCancelRequest} disabled={isCancelling}>
                      {isCancelling ? t("action.cancelling", { defaultMessage: "Cancelling..." }) : t("action.cancel")}
                    </Button>
                  )}
                  {canRepayLoan && (
                    <Button onClick={handleRepayLoan} disabled={isRepaying}>
                      {isRepaying ? t("action.repaying", { defaultMessage: "Repaying..." }) : t("action.repay")}
                    </Button>
                  )}
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
                    {createdAtDate && (
                      <SmallMuted>
                        {formatUtcDateTime(createdAtDate)} · {createdAtLocal}
                      </SmallMuted>
                    )}
                  </TimelineItem>

                  {dueDate && (
                    <TimelineItem>
                      <div>{t("timeline.due")}</div>
                      <SmallMuted>{dueDateUtc} · {dueDateLocal}</SmallMuted>
                    </TimelineItem>
                  )}
                </Timeline>
              </CardContent>
            </Card>
          </SideCol>
        </Grid>
      </Page>

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
