"use client";

import { useEffect, useState } from "react";
import styled from "@emotion/styled";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { loanRequestAPI, loanAPI, type LoanRequest } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { contractService } from "@/lib/contract";
import { walletService } from "@/lib/wallet";

export default function MarketplacePage() {
  const [requests, setRequests] = useState<LoanRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<LoanRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { isConnected, user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const t = useTranslations("marketplace");

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);

      const res = await loanRequestAPI.getAll({ status: "OPEN", limit: 50 });
      setRequests(res.loanRequests ?? []);
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

  const openLendModal = (request: LoanRequest) => {
    if (!isConnected) {
      toast({
        title: t("toast.connectWallet"),
        description: t("toast.pleaseConnect"),
        variant: "destructive",
      });
      return;
    }

    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const proceedLend = () => {
    if (!selectedRequest) return;
    void fundLoan(selectedRequest);
  };

  const fundLoan = async (request: LoanRequest) => {
    try {
      if (!isConnected) {
        toast({
          title: t("toast.connectWallet"),
          description: t("toast.pleaseConnect"),
          variant: "destructive",
        });
        return;
      }

      setIsExecuting(true);

      const result = await contractService.fundLoan({
        requestId: request.onchainRequestId,
        principalToken: request.principalTokenAddress,
        principalAmount: request.principalAmount,
      });

      const loanId = result.loanId || "0";

      if (loanId !== "0") {
        const lenderAddress = (await walletService.getAccount()) || "";
        const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 0);
        const contractAddress =
          process.env.NEXT_PUBLIC_LOAN_CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_LOAN_CONTRACT || "";

        if (chainId && contractAddress && lenderAddress) {
          const startTimestamp = String(Math.floor(Date.now() / 1000));
          const dueTimestamp = String(
            Math.floor(Date.now() / 1000) + request.durationSeconds,
          );

          await loanAPI.create({
            chainId,
            contractAddress,
            onchainLoanId: loanId,
            onchainRequestId: request.onchainRequestId,
            borrower: request.borrowerAddress,
            lender: lenderAddress,
            startTimestamp,
            dueTimestamp,
            fundTxHash: result.hash,
          });
        }
      }

      toast({
        title: t("toast.executeSuccess"),
        description: t("toast.executeSuccessDesc"),
      });

      setIsModalOpen(false);
      router.push(`/loan/${request.id}`);
    } catch (error: any) {
      const message = error?.message || "";
      const code = error?.code ?? error?.info?.error?.code;
      const isInsufficientFunds =
        code === "INSUFFICIENT_FUNDS" ||
        /insufficient funds|funds for gas \* price \+ value/i.test(message);
      const isUserRejected =
        code === 4001 ||
        code === "ACTION_REJECTED" ||
        /user denied|rejected|ACTION_REJECTED/i.test(message);

      if (isInsufficientFunds) {
        toast({
          title: t("toast.insufficientFundsTitle"),
          description: t("toast.insufficientFundsDesc"),
          variant: "destructive",
        });
        return;
      }

      if (isUserRejected) {
        toast({
          title: t("toast.txRejected"),
          description: t("toast.txRejectedDesc"),
        });
        return;
      }

      toast({
        title: t("toast.executeError"),
        description: message || t("toast.executeErrorDesc"),
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
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
        ) : requests.length === 0 ? (
          <Card>
            <EmptyState>
              <EmptyIcon aria-hidden="true" />
              <CardTitle>{t("noLoans.title")}</CardTitle>
              <CardDescription>{t("noLoans.description")}</CardDescription>

              <Button
                size="lg"
                tone="accent"
                onClick={() => {
                  if (!isConnected) {
                    toast({
                      title: t("toast.connectWallet"),
                      description: t("toast.pleaseConnect"),
                      variant: "destructive",
                    });
                    return;
                  }
                  router.push("/create-loan");
                }}
              >
                {t("noLoans.button")}
              </Button>
            </EmptyState>
          </Card>
        ) : (
          <>
            <Controls>
              <CountText>{t("count", { count: requests.length })}</CountText>
            </Controls>

            <Grid>
              {requests.map((request) => {
                const principalToken = request.principalToken;
                const collateralToken = request.collateralToken;
                const principalAmount = principalToken
                  ? formatUnits(BigInt(request.principalAmount), principalToken.decimals)
                  : request.principalAmount;
                const totalRepayRaw =
                  BigInt(request.principalAmount) +
                  (BigInt(request.principalAmount) * BigInt(request.interestBps)) / 10000n;
                const totalRepay = principalToken
                  ? formatUnits(totalRepayRaw, principalToken.decimals)
                  : totalRepayRaw.toString();
                const durationDays = Math.ceil(request.durationSeconds / 86400);

                return (
                  <LoanCard key={request.id}>
                    <CardHeader>
                      <TopRow>
                        <AmountBlock>
                          <Amount>
                            {principalAmount} {principalToken?.symbol || ""}
                          </Amount>
                          <AssetName>{principalToken?.symbol || t("card.principal")}</AssetName>
                        </AmountBlock>

                        <Badge variant="outline">{String(request.status).toUpperCase()}</Badge>
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
                            <MetaValueAccent>{(request.interestBps / 100).toFixed(2)}%</MetaValueAccent>
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
                              {durationDays} {durationDays === 1 ? "day" : "days"}
                            </MetaValue>
                          </MetaText>
                        </MetaItem>
                      </MetaList>

                      {collateralToken && (
                        <CollateralBox>
                          <CollateralTitle>{t("card.collateral")}</CollateralTitle>
                          <CollateralList>
                            <CollateralItem key={request.id}>
                              {formatUnits(BigInt(request.collateralAmount), collateralToken.decimals)}{" "}
                              {collateralToken.symbol || ""}
                            </CollateralItem>
                          </CollateralList>
                        </CollateralBox>
                      )}
                    </CardContent>

                    <CardFooter>
                      <Button
                        size="lg"
                        tone="accent"
                        fullWidth
                        disabled={!isConnected || isOwnRequest(request)}
                        onClick={() => openLendModal(request)}
                      >
                        {!isConnected
                          ? t("card.walletRequired")
                          : isOwnRequest(request)
                            ? t("card.ownRequestDisabled")
                            : t("card.lendNow")}
                      </Button>
                    </CardFooter>
                  </LoanCard>
                );
              })}
            </Grid>
          </>
        )}
      </Container>

      <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("modal.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("modal.description")}</AlertDialogDescription>
          </AlertDialogHeader>

          {selectedRequest && (() => {
            const principalToken = selectedRequest.principalToken;
            const collateralToken = selectedRequest.collateralToken;
            const principalAmount = principalToken
              ? formatUnits(BigInt(selectedRequest.principalAmount), principalToken.decimals)
              : selectedRequest.principalAmount;
            const totalRepayRaw =
              BigInt(selectedRequest.principalAmount) +
              (BigInt(selectedRequest.principalAmount) * BigInt(selectedRequest.interestBps)) / 10000n;
            const totalRepay = principalToken
              ? formatUnits(totalRepayRaw, principalToken.decimals)
              : totalRepayRaw.toString();
            const durationDays = Math.ceil(selectedRequest.durationSeconds / 86400);

            return (
              <ModalBody>
                <SummaryRow>
                  <SummaryLabel>{t("modal.summary.principal")}</SummaryLabel>
                  <SummaryValue>
                    {principalAmount} {principalToken?.symbol || ""}
                  </SummaryValue>
                </SummaryRow>
                <SummaryRow>
                  <SummaryLabel>{t("modal.summary.apr")}</SummaryLabel>
                  <SummaryValue>{(selectedRequest.interestBps / 100).toFixed(2)}%</SummaryValue>
                </SummaryRow>
                <SummaryRow>
                  <SummaryLabel>{t("modal.summary.total")}</SummaryLabel>
                  <SummaryValue>
                    {totalRepay} {principalToken?.symbol || ""}
                  </SummaryValue>
                </SummaryRow>
                <SummaryRow>
                  <SummaryLabel>{t("modal.summary.due")}</SummaryLabel>
                  <SummaryValue>
                    {durationDays} {durationDays === 1 ? "day" : "days"}
                  </SummaryValue>
                </SummaryRow>
                {collateralToken && (
                  <SummaryRow>
                    <SummaryLabel>{t("modal.summary.collateral")}</SummaryLabel>
                    <SummaryValue>
                      {formatUnits(BigInt(selectedRequest.collateralAmount), collateralToken.decimals)}{" "}
                      {collateralToken.symbol || ""}
                    </SummaryValue>
                  </SummaryRow>
                )}

                <StepList>
                  <StepItem>
                    <StepTitle>{t("modal.steps.review.title")}</StepTitle>
                    <StepDesc>{t("modal.steps.review.desc")}</StepDesc>
                  </StepItem>
                  <StepItem>
                    <StepTitle>{t("modal.steps.sign.title")}</StepTitle>
                    <StepDesc>{t("modal.steps.sign.desc")}</StepDesc>
                  </StepItem>
                  <StepItem>
                    <StepTitle>{t("modal.steps.execute.title")}</StepTitle>
                    <StepDesc>{t("modal.steps.execute.desc")}</StepDesc>
                  </StepItem>
                </StepList>
              </ModalBody>
            );
          })()}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeModal} disabled={isExecuting}>
              {t("modal.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={proceedLend} disabled={isExecuting}>
              {isExecuting ? t("modal.executing") : t("modal.proceed")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

const ModalBody = styled.div`
  display: grid;
  gap: 14px;
`;

const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  border-radius: calc(var(--radius) - 6px);
  border: 1px solid var(--border);
  background: color-mix(in oklab, var(--background) 24%, transparent);
`;

const SummaryLabel = styled.div`
  font-size: 12px;
  color: var(--muted-foreground);
  font-weight: 600;
`;

const SummaryValue = styled.div`
  font-size: 13px;
  font-weight: 800;
`;

const StepList = styled.div`
  display: grid;
  gap: 10px;
  padding: 10px;
  border-radius: calc(var(--radius) - 6px);
  border: 1px dashed var(--border);
  background: color-mix(in oklab, var(--card) 55%, transparent);
`;

const StepItem = styled.div`
  display: grid;
  gap: 2px;
`;

const StepTitle = styled.div`
  font-size: 13px;
  font-weight: 700;
`;

const StepDesc = styled.div`
  font-size: 12px;
  color: var(--muted-foreground);
`;
  const isOwnRequest = (request: LoanRequest) =>
    Boolean(
      request.borrowerAddress &&
        user?.wallet_address &&
        request.borrowerAddress.toLowerCase() === user.wallet_address.toLowerCase(),
    );
