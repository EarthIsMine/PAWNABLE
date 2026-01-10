"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import styled from "@emotion/styled";

import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { loanAPI, assetAPI, type Asset, type Loan } from "@/lib/api";
import { contractService } from "@/lib/contract";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

import { Loader2, ArrowLeft, Calendar, TrendingUp, Coins, Shield, AlertCircle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

type ActionType = "activate" | "repay" | "liquidate" | "cancel";

type AssetMap = Record<string, Asset>;

type LoanApiShape = Loan | { loan: Loan; collaterals?: unknown[] };

function getLoanFromResponse(res: LoanApiShape): Loan {
  // 백엔드가 { loan, collaterals } 형태로 줄 수도 있고, Loan 자체일 수도 있음
  if (typeof res === "object" && res !== null && "loan" in res) {
    const loan = (res as { loan: Loan }).loan;
    return loan;
  }
  return res as Loan;
}

function buildAssetMap(list: Asset[]): AssetMap {
  const map: AssetMap = {};
  for (const a of list) map[a.asset_id] = a;
  return map;
}

function isLoanStatus(s: unknown): s is Loan["status"] {
  return (
    s === "pending" ||
    s === "matched" ||
    s === "active" ||
    s === "repaid" ||
    s === "liquidated" ||
    s === "cancelled"
  );
}

function normalizeStatus(status: unknown): Loan["status"] {
  if (isLoanStatus(status)) return status;
  // 예상 밖 값은 pending으로 fallback (UI 깨짐 방지)
  return "pending";
}

export default function LoanDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isConnected } = useAuth();
  const { toast } = useToast();

  const t = useTranslations("loanDetail");
  const tc = useTranslations("common");

  const [loan, setLoan] = useState<Loan | null>(null);
  const [assets, setAssets] = useState<AssetMap>({});
  const [isLoading, setIsLoading] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType | null>(null);

  const loanId = params?.id;

  useEffect(() => {
    if (!loanId) return;
    void loadData(loanId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanId]);

  async function loadData(id: string) {
    try {
      setIsLoading(true);

      const [loanRes, assetsRes] = await Promise.all([loanAPI.getById(id), assetAPI.getAll()]);

      const parsedLoan = getLoanFromResponse(loanRes as LoanApiShape);
      setLoan({
        ...parsedLoan,
        status: normalizeStatus(parsedLoan.status),
      });

      setAssets(buildAssetMap(assetsRes));
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

    const loanAsset = assets[loan.loan_asset_id];
    const dueDate = new Date(loan.repay_due_at);
    const isOverdue = dueDate.getTime() < Date.now();
    const isBorrower = user?.user_id === loan.borrower_id;
    const isLender = user?.user_id === loan.lender_id;

    return { loanAsset, dueDate, isOverdue, isBorrower, isLender };
  }, [loan, assets, user]);

  function statusLabel(status: Loan["status"]) {
    // ko.json에 이미 dashboard.status가 있으므로 재사용 (키 경로는 프로젝트 기준에 맞게 유지)
    // loanDetail쪽으로 옮기고 싶으면 키 재정리 가능
    // 여기서는 loanDetail.statusLabel.* 로 쓰는 편이 컴포넌트 응집도는 더 좋음
    return t(`statusLabel.${status}`);
  }

  function openConfirm(type: ActionType) {
    setActionType(type);
    setConfirmOpen(true);
  }

  function confirmTitle() {
    return t("confirm.title");
  }

  function confirmDescription(type: ActionType) {
    return t(`confirm.description.${type}`);
  }

  function confirmCta(type: ActionType) {
    return t(`confirm.cta.${type}`);
  }

  async function handleAction() {
    if (!loan || !actionType) return;

    setIsProcessing(true);
    setConfirmOpen(false);

    try {
      switch (actionType) {
        case "cancel": {
          await loanAPI.cancel(loan.loan_id);
          toast({ title: tc("success"), description: t("toast.cancelSuccess") });
          router.push("/dashboard");
          return;
        }

        case "activate": {
          // 컨트랙트 연동이 아직 완성 전일 수 있으니, 실패 메시지를 i18n으로 일관되게 처리
          toast({
            title: t("toast.txPendingTitle"),
            description: t("toast.txPendingDesc"),
          });

          await contractService.initialize();

          // “matchLoan”이 실제로 activate인지, match인지 백엔드/컨트랙트 설계에 따라 달라질 수 있음
          // 여기서는 기존 코드 흐름을 유지하되, tx hash가 있다면 표시
          const result = await contractService.matchLoan(loan.loan_id, String(loan.loan_amount));

          // 백엔드 notify는 선택 사항이므로 실패해도 UX는 성공으로 처리
          // (단, 추후에는 reconcile job을 두는 게 좋음)
          try {
            // NOTE: 기존 코드에서 activate(loanId, txHash) 형태였는데,
            // api.ts 기준 activate(loanId)만 있음.
            // txHash를 백엔드로 보내려면 엔드포인트/스키마를 맞춰야 함.
            await loanAPI.activate(loan.loan_id);
          } catch {
            // ignore
          }

          toast({
            title: tc("success"),
            description: t("toast.activateSuccess", {
              hash: result?.hash ? `${result.hash.slice(0, 10)}…` : "-",
            }),
          });

          await loadData(loan.loan_id);
          return;
        }

        case "repay": {
          toast({
            title: t("toast.txPendingTitle"),
            description: t("toast.txPendingDesc"),
          });

          await contractService.initialize();
          const result = await contractService.repayLoan(
            loan.loan_id,
            String(loan.total_repay_amount),
          );

          toast({
            title: tc("success"),
            description: t("toast.repaySuccess", {
              hash: result?.hash ? `${result.hash.slice(0, 10)}…` : "-",
            }),
          });

          await loadData(loan.loan_id);
          return;
        }

        case "liquidate": {
          toast({
            title: t("toast.txPendingTitle"),
            description: t("toast.txPendingDesc"),
          });

          await contractService.initialize();
          const result = await contractService.liquidateLoan(loan.loan_id);

          toast({
            title: tc("success"),
            description: t("toast.liquidateSuccess", {
              hash: result?.hash ? `${result.hash.slice(0, 10)}…` : "-",
            }),
          });

          await loadData(loan.loan_id);
          return;
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("toast.genericError");
      toast({
        title: tc("error"),
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setActionType(null);
    }
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

  const { loanAsset, dueDate, isOverdue, isBorrower, isLender } = viewModel;

  // 액션 가드
  const canCancel = loan.status === "pending" && isBorrower;
  const canActivateAsLender =
    (loan.status === "pending" || loan.status === "matched") && !isBorrower && isConnected;
  const canRepay = loan.status === "active" && isBorrower;
  const canLiquidate = loan.status === "active" && isLender && isOverdue;

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
                {t("idLabel")}: <Mono>{loan.loan_id}</Mono>
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
                      {loan.loan_amount} {loanAsset?.symbol ?? ""}
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
                        {loan.interest_rate_pct != null ? loan.interest_rate_pct.toFixed(2) : "-"}%
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
                      {loan.total_repay_amount} {loanAsset?.symbol ?? ""}
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
                {loan.collaterals && loan.collaterals.length > 0 ? (
                  <CollateralList>
                    {loan.collaterals.map((c, idx) => {
                      const ca = assets[c.asset_id];
                      return (
                        <CollateralItem key={`${c.asset_id}-${idx}`}>
                          <div>
                            <div>{ca?.name ?? t("unknownAsset")}</div>
                            <SmallMuted>{ca?.blockchain ?? "-"}</SmallMuted>
                          </div>
                          <div>
                            <div>
                              <strong>{c.amount}</strong> {ca?.symbol ?? ""}
                            </div>
                          </div>
                        </CollateralItem>
                      );
                    })}
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
                  {canCancel && (
                    <Button
                      variant="destructive"
                      onClick={() => openConfirm("cancel")}
                      disabled={isProcessing}
                    >
                      {t("action.cancel")}
                    </Button>
                  )}

                  {canActivateAsLender && (
                    <Button onClick={() => openConfirm("activate")} disabled={isProcessing}>
                      {t("action.activate")}
                    </Button>
                  )}

                  {canRepay && (
                    <Button onClick={() => openConfirm("repay")} disabled={isProcessing}>
                      {t("action.repay")}
                    </Button>
                  )}

                  {canLiquidate && (
                    <Button
                      variant="destructive"
                      onClick={() => openConfirm("liquidate")}
                      disabled={isProcessing}
                    >
                      {t("action.liquidate")}
                    </Button>
                  )}

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
                    <SmallMuted>{format(new Date(loan.created_at), "PPp")}</SmallMuted>
                  </TimelineItem>

                  {loan.matched_at && (
                    <TimelineItem>
                      <div>{t("timeline.matched")}</div>
                      <SmallMuted>{format(new Date(loan.matched_at), "PPp")}</SmallMuted>
                    </TimelineItem>
                  )}

                  {loan.closed_at && (
                    <TimelineItem>
                      <div>{t("timeline.closed")}</div>
                      <SmallMuted>{format(new Date(loan.closed_at), "PPp")}</SmallMuted>
                    </TimelineItem>
                  )}
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
