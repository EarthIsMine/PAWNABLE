"use client";

import type React from "react";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styled from "@emotion/styled";
import { useTranslations } from "next-intl";
import { Loader2, Plus, X } from "lucide-react";
import { TypedDataEncoder, parseUnits } from "ethers";

import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

import { useAuth } from "@/contexts/auth-context";
import { tokenAPI, intentAPI, type Token } from "@/lib/api";
import { contractService } from "@/lib/contract";
import { useToast } from "@/hooks/use-toast";
import { walletService } from "@/lib/wallet";

type CollateralRow = {
  token_address: string;
  amount: string; // input용
  token_id?: string | null;
};

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || "1337");
const VERIFYING_CONTRACT =
  process.env.NEXT_PUBLIC_LOAN_CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_LOAN_CONTRACT || "";

const EIP712_TYPES = {
  LoanIntent: [
    { name: "borrower", type: "address" },
    { name: "collateralToken", type: "address" },
    { name: "collateralAmount", type: "uint256" },
    { name: "principalToken", type: "address" },
    { name: "principalAmount", type: "uint256" },
    { name: "interestBps", type: "uint256" },
    { name: "durationSeconds", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

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

  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [principalTokenAddress, setPrincipalTokenAddress] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [collaterals, setCollaterals] = useState<CollateralRow[]>([
    { token_address: "", amount: "" },
  ]);

  const blocked = !authLoading && !isConnected;

  useEffect(() => {
    if (blocked) return;
    void loadAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocked]);

  const loadAssets = async () => {
    try {
      setIsLoadingAssets(true);
      const data = await tokenAPI.getAll({ isAllowed: true });
      setTokens(data);
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

  const allowedTokens = useMemo(
    () => tokens.filter((t) => t.isAllowed),
    [tokens],
  );

  const loanAssetOptions = useMemo(
    () =>
      allowedTokens.map((t) => ({
        value: t.address,
        label: `${t.symbol}`,
      })),
    [allowedTokens],
  );

  const collateralOptions = useMemo(
    () =>
      allowedTokens.map((t) => ({
        value: t.address,
        label: `${t.symbol}`,
      })),
    [allowedTokens],
  );

  useEffect(() => {
    if (!principalTokenAddress || allowedTokens.length === 0) return;

    const principal = allowedTokens.find((t) => t.address === principalTokenAddress);
    if (!principal) return;

    const usdc = allowedTokens.find((t) => t.symbol.toUpperCase() === "USDC");
    const eth = allowedTokens.find((t) => t.symbol.toUpperCase() === "ETH");

    if (!usdc || !eth) return;

    const desired = principal.symbol.toUpperCase() === "USDC" ? eth.address : usdc.address;

    setCollaterals((prev) => {
      if (prev.length === 0) return prev;
      if (prev[0].token_address === desired) return prev;
      return [{ ...prev[0], token_address: desired }, ...prev.slice(1)];
    });
  }, [principalTokenAddress, allowedTokens]);

  const totalRepayment = useMemo(() => {
    const principal = Number(loanAmount) || 0;
    const rate = Number(interestRate) || 0;
    return principal * (1 + rate / 100);
  }, [loanAmount, interestRate]);

  const principalSymbol = useMemo(() => {
    const token = tokens.find((t) => t.address === principalTokenAddress);
    return token?.symbol ?? "";
  }, [tokens, principalTokenAddress]);

  const addCollateral = () =>
    setCollaterals((prev) => [...prev, { token_address: "", amount: "" }]);

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
      !principalTokenAddress ||
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
      collaterals.some((c) => !c.token_address || !isPositiveNumber(c.amount))
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
      if (!VERIFYING_CONTRACT) {
        throw new Error("Missing verifying contract address");
      }

      if (CHAIN_ID !== 1 && typeof window !== "undefined" && window.ethereum) {
        const currentChainId = await window.ethereum.request({ method: "eth_chainId" });
        const expectedChainId = `0x${CHAIN_ID.toString(16)}`;
        if (currentChainId !== expectedChainId) {
          await walletService.switchNetwork(expectedChainId);
        }
      }

      const collateral = collaterals[0];
      const principalToken = tokens.find((t) => t.address === principalTokenAddress);
      const collateralToken = tokens.find((t) => t.address === collateral.token_address);

      if (!principalToken || !collateralToken) {
        throw new Error("Invalid token selection");
      }

      const durationSeconds = Number(durationDays) * 24 * 60 * 60;
      const now = Math.floor(Date.now() / 1000);
      const deadline = (now + durationSeconds).toString();

      const principalAmountRaw = parseUnits(loanAmount, principalToken.decimals).toString();
      const collateralAmountRaw = parseUnits(collateral.amount, collateralToken.decimals).toString();
      const interestBps = Math.round(Number(interestRate) * 100);
      const nonce = await contractService.getNonce(user.wallet_address);

      const domain = {
        name: "PawnableLoan",
        version: "1",
        chainId: CHAIN_ID,
        verifyingContract: VERIFYING_CONTRACT,
      };

      const typedMessage = {
        borrower: user.wallet_address,
        collateralToken: collateralToken.address,
        collateralAmount: collateralAmountRaw,
        principalToken: principalToken.address,
        principalAmount: principalAmountRaw,
        interestBps: String(interestBps),
        durationSeconds: String(durationSeconds),
        nonce,
        deadline,
      };

      const intentHash = TypedDataEncoder.hash(domain, EIP712_TYPES, typedMessage);
      const signature = await walletService.signTypedData(domain, EIP712_TYPES, typedMessage);

      await intentAPI.create({
        chainId: CHAIN_ID,
        verifyingContract: VERIFYING_CONTRACT,
        borrower: user.wallet_address,
        collateralToken: collateralToken.address,
        collateralAmount: collateralAmountRaw,
        principalToken: principalToken.address,
        principalAmount: principalAmountRaw,
        interestBps,
        durationSeconds,
        nonce,
        deadline,
        intentHash,
        signature,
      });

      toast({
        title: tc("success"),
        description: t("toast.createSuccess"),
      });

      router.push("/dashboard");
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
                    value={principalTokenAddress}
                    onValueChange={setPrincipalTokenAddress}
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
                    {principalSymbol ? ` ${principalSymbol}` : ""}
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
                        value={c.token_address}
                        onValueChange={(v) => updateCollateral(index, { token_address: v })}
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

                {/* 담보는 단일 항목만 사용 */}
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
