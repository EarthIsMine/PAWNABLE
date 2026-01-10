"use client";

import type React from "react";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styled from "@emotion/styled";
import { useTranslations } from "next-intl";
import { Loader2, Plus, X } from "lucide-react";

import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

import { useAuth } from "@/contexts/auth-context";
import { assetAPI, loanAPI, type Asset } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { contractService } from "@/lib/contract";

type CollateralRow = {
  asset_id: string;
  amount: string; // input용
  token_id?: string | null;
};

function isPositiveNumber(value: string) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

export default function CreateLoanPage() {
  const router = useRouter();
  const { user, isConnected, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const t = useTranslations("createLoan");
  const tc = useTranslations("common");

  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [loanAssetId, setLoanAssetId] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [collaterals, setCollaterals] = useState<CollateralRow[]>([{ asset_id: "", amount: "" }]);

  const blocked = !authLoading && !isConnected;

  useEffect(() => {
    if (blocked) return;
    void loadAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocked]);

  const loadAssets = async () => {
    try {
      setIsLoadingAssets(true);
      const data = await assetAPI.getAll();
      setAssets(data);
    } catch {
      toast({
        title: tc("error"),
        description: t("toast.loadError", { defaultMessage: "자산 목록을 불러오지 못했습니다." }),
        variant: "destructive",
      });
    } finally {
      setIsLoadingAssets(false);
    }
  };

  const loanAssets = useMemo(
    () => assets.filter((a) =>
      a.asset_type.toLowerCase() === "erc20" ||
      a.asset_type.toLowerCase() === "native" ||
      a.asset_type === "token" ||
      a.asset_type === "stablecoin"
    ),
    [assets],
  );

  const collateralAssets = useMemo(
    () => assets.filter((a) =>
      a.asset_type.toLowerCase() === "erc20" ||
      a.asset_type.toLowerCase() === "native" ||
      a.asset_type === "token" ||
      a.asset_type === "nft"
    ),
    [assets],
  );

  const loanAssetOptions = useMemo(
    () =>
      loanAssets.map((a) => ({
        value: a.asset_id,
        label: `${a.symbol} - ${a.name}`,
      })),
    [loanAssets],
  );

  const collateralOptions = useMemo(
    () =>
      collateralAssets.map((a) => ({
        value: a.asset_id,
        label: `${a.symbol} - ${a.name}`,
      })),
    [collateralAssets],
  );

  const totalRepayment = useMemo(() => {
    const principal = Number(loanAmount) || 0;
    const rate = Number(interestRate) || 0;
    return principal * (1 + rate / 100);
  }, [loanAmount, interestRate]);

  const addCollateral = () => setCollaterals((prev) => [...prev, { asset_id: "", amount: "" }]);

  const removeCollateral = (index: number) =>
    setCollaterals((prev) => prev.filter((_, i) => i !== index));

  const updateCollateral = (index: number, patch: Partial<CollateralRow>) =>
    setCollaterals((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });

  const validate = () => {
    if (!user) {
      toast({
        title: t("toast.connectWallet"),
        description: t("toast.pleaseConnect"),
        variant: "destructive",
      });
      return false;
    }

    if (
      !loanAssetId ||
      !isPositiveNumber(loanAmount) ||
      !isPositiveNumber(interestRate) ||
      !durationDays
    ) {
      toast({
        title: tc("error"),
        description: t("toast.fillRequired"),
        variant: "destructive",
      });
      return false;
    }

    const d = Number(durationDays);
    if (!Number.isFinite(d) || d <= 0) {
      toast({
        title: tc("error"),
        description: t("toast.invalidDuration", {
          defaultMessage: "대출 기간(일)을 올바르게 입력해주세요",
        }),
        variant: "destructive",
      });
      return false;
    }

    if (
      collaterals.length === 0 ||
      collaterals.some((c) => !c.asset_id || !isPositiveNumber(c.amount))
    ) {
      toast({
        title: tc("error"),
        description: t("toast.addCollateral"),
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !user) return;

    setIsSubmitting(true);
    try {
      const repayDueAt = new Date();
      repayDueAt.setDate(repayDueAt.getDate() + Number(durationDays));

      // 1. 먼저 DB에 대출 생성 (loan_id 얻기)
      const createdLoan = await loanAPI.create({
        borrower_id: user.user_id,
        loan_asset_id: loanAssetId,
        loan_amount: Number(loanAmount),
        interest_rate_pct: Number(interestRate),
        total_repay_amount: totalRepayment,
        repay_due_at: repayDueAt.toISOString(),
        collaterals: collaterals.map((c) => ({
          asset_id: c.asset_id,
          amount: Number(c.amount),
          token_id: c.token_id ?? null,
        })),
      });

      toast({
        title: "대출 DB 생성 완료",
        description: "블록체인에 담보를 전송합니다...",
      });

      // 2. 블록체인에 requestLoan 호출 (담보 전송)
      try {
        await contractService.initialize();

        // 현재 시간 + 대출 기간(일)로 timestamp 계산
        const now = Math.floor(Date.now() / 1000); // 현재 시간 (초)
        const durationSeconds = Number(durationDays) * 24 * 60 * 60; // 일 -> 초 변환
        const dueTimestamp = now + durationSeconds;

        console.log("Current time:", now);
        console.log("Duration (days):", durationDays);
        console.log("Duration (seconds):", durationSeconds);
        console.log("Due timestamp:", dueTimestamp);

        // 담보는 첫 번째 collateral의 amount를 사용 (현재는 단일 담보만 지원)
        const collateralAmount = collaterals[0]?.amount || "0";

        await contractService.requestLoan(
          createdLoan.loan.loan_id, // DB에서 생성된 loan_id 사용
          loanAmount,
          totalRepayment.toString(),
          collateralAmount,
          dueTimestamp
        );

        toast({
          title: tc("success"),
          description: t("toast.createSuccess") + " 담보가 스마트 컨트랙트로 전송되었습니다.",
        });

        router.push("/dashboard");
      } catch (blockchainError) {
        toast({
          title: "블록체인 오류",
          description: blockchainError instanceof Error ? blockchainError.message : "담보 전송 실패",
          variant: "destructive",
        });
        // 블록체인 실패 시 DB 대출도 취소해야 할 수 있음
        throw blockchainError;
      }
    } catch (err: unknown) {
      toast({
        title: tc("error"),
        description: err instanceof Error ? err.message : t("toast.createError"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoadingAssets) {
    return (
      <Page>
        <Navbar />
        <Center>
          <Loader2 />
        </Center>
      </Page>
    );
  }

  if (blocked) {
    return (
      <Page>
        <Navbar />
        <Container>
          <Card>
            <CardHeader>
              <CardTitle>{t("toast.connectWallet")}</CardTitle>
              <CardDescription>{t("toast.pleaseConnect")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Row>
                <Button onClick={() => router.push("/")}>{tc("confirm")}</Button>
              </Row>
            </CardContent>
          </Card>
        </Container>
      </Page>
    );
  }

  return (
    <Page>
      <Navbar />

      <Container>
        <Header>
          <Title>{t("title")}</Title>
          <Subtitle>{t("subtitle")}</Subtitle>
        </Header>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>{t("form.loanDetails")}</CardTitle>
              <CardDescription>{t("form.summary")}</CardDescription>
            </CardHeader>

            <CardContent>
              <Grid2>
                <Field>
                  <Label htmlFor="loan-asset">{t("form.asset")}</Label>
                  <Select
                    id="loan-asset"
                    value={loanAssetId}
                    onValueChange={setLoanAssetId}
                    placeholder={t("form.selectAsset")}
                    options={loanAssetOptions}
                  />
                </Field>

                <Field>
                  <Label htmlFor="loan-amount">{t("form.amount")}</Label>
                  <Input
                    id="loan-amount"
                    type="number"
                    step="0.0001"
                    placeholder={t("form.enterAmount")}
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                  />
                </Field>

                <Field>
                  <Label htmlFor="interest-rate">{t("form.interestRate")}</Label>
                  <Input
                    id="interest-rate"
                    type="number"
                    step="0.01"
                    placeholder="5.00"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                  />
                </Field>

                <Field>
                  <Label htmlFor="duration">{t("form.duration")}</Label>
                  <Input
                    id="duration"
                    type="number"
                    placeholder="30"
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                  />
                </Field>
              </Grid2>

              {(loanAmount || interestRate) && (
                <SummaryBox>
                  <SummaryLabel>{t("form.totalRepayment")}</SummaryLabel>
                  <SummaryValue>
                    {Number.isFinite(totalRepayment) ? totalRepayment.toFixed(2) : "-"}
                  </SummaryValue>
                </SummaryBox>
              )}
            </CardContent>
          </Card>

          <Spacer />

          <Card>
            <CardHeader>
              <CardTitle>{t("form.collateralInfo")}</CardTitle>
              <CardDescription>{t("form.addCollateral")}</CardDescription>
            </CardHeader>

            <CardContent>
              <Stack>
                {collaterals.map((c, index) => (
                  <CollateralRowWrap key={index}>
                    <Field>
                      <Label htmlFor={`collateral-asset-${index}`}>
                        {t("form.collateralAsset")}
                      </Label>
                      <Select
                        id={`collateral-asset-${index}`}
                        value={c.asset_id}
                        onValueChange={(v) => updateCollateral(index, { asset_id: v })}
                        placeholder={t("form.selectAsset")}
                        options={collateralOptions}
                      />
                    </Field>

                    <Field>
                      <Label htmlFor={`collateral-amount-${index}`}>
                        {t("form.collateralAmount")}
                      </Label>
                      <Input
                        id={`collateral-amount-${index}`}
                        type="number"
                        step="0.0001"
                        placeholder="1.0"
                        value={c.amount}
                        onChange={(e) => updateCollateral(index, { amount: e.target.value })}
                      />
                    </Field>

                    {collaterals.length > 1 ? (
                      <IconButton
                        type="button"
                        aria-label={t("form.removeCollateral")}
                        onClick={() => removeCollateral(index)}
                      >
                        <X width={16} height={16} />
                      </IconButton>
                    ) : null}
                  </CollateralRowWrap>
                ))}

                <Button type="button" variant="outline" onClick={addCollateral}>
                  <Plus width={16} height={16} />
                  {t("form.addCollateral")}
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Actions>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              {tc("cancel")}
            </Button>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 />
                  {t("form.creating", { defaultMessage: "생성 중..." })}
                </>
              ) : (
                t("form.createRequest")
              )}
            </Button>
          </Actions>
        </form>
      </Container>
    </Page>
  );
}

/* styles */

const Page = styled.div`
  min-height: 100dvh;
  background: var(--background);
  color: var(--foreground);
`;

const Container = styled.div`
  width: 100%;
  max-width: 768px;
  margin: 0 auto;
  padding: 24px 16px;
`;

const Header = styled.div`
  margin-bottom: 20px;
`;

const Title = styled.h1`
  margin: 0 0 8px;
  font-size: 22px;
  line-height: 1.2;
  letter-spacing: 0.005em;
  font-weight: 800;
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  letter-spacing: -0.015em;
  color: var(--muted-foreground);
`;

const Grid2 = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const Field = styled.div`
  display: grid;
  gap: 8px;
`;

const SummaryBox = styled.div`
  margin-top: 16px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 3px);
  background: color-mix(in oklab, var(--card) 55%, transparent);
`;

const SummaryLabel = styled.div`
  font-size: 13px;
  color: var(--muted-foreground);
`;

const SummaryValue = styled.div`
  margin-top: 6px;
  font-size: 20px;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: 0.005em;
`;

const Spacer = styled.div`
  height: 16px;
`;

const Stack = styled.div`
  display: grid;
  gap: 12px;
`;

const CollateralRowWrap = styled.div`
  display: grid;
  gap: 12px;
  align-items: end;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr auto;
  }
`;

const IconButton = styled.button`
  height: 40px;
  width: 40px;
  border-radius: calc(var(--radius) - 6px);
  border: 1px solid var(--border);
  background: transparent;
  color: var(--muted-foreground);
  display: inline-flex;
  align-items: center;
  justify-content: center;

  transition:
    background 140ms ease,
    color 140ms ease;

  &:hover {
    background: color-mix(in oklab, var(--card) 70%, transparent);
    color: var(--foreground);
  }

  &:focus {
    outline: none;
  }

  &:focus-visible {
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 30%, transparent);
  }
`;

const Actions = styled.div`
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;

const Center = styled.div`
  min-height: 60vh;
  display: grid;
  place-items: center;

  svg {
    animation: spin 900ms linear infinite;
    color: var(--foreground);
    opacity: 0.9;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const Row = styled.div`
  display: flex;
  gap: 10px;
`;
