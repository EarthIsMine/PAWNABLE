"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";
import { ArrowRight, Shield, TrendingUp, Users, Clock } from "lucide-react";
import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations("home");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      {/* 핵심: 배경 분리 + 보더로 구획 + 살짝 그라데이션(아주 약하게) */}
      <section className="border-b border-border bg-secondary/60">
        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="mx-auto max-w-4xl text-center">
            {/* Badge: primary가 너무 죽으면 accent 계열로 시각적 힘을 줌 */}
            <div className="mb-6 inline-block rounded-full border border-border bg-card/60 px-4 py-1.5">
              <span className="text-sm font-medium text-accent">
                {t("badge")}
              </span>
            </div>

            <h1 className="mb-6 text-4xl font-bold tracking-tight text-balance sm:text-5xl md:text-6xl lg:text-7xl">
              {t("title")}
            </h1>

            {/* subtitle: muted 대신 foreground 투명도로 한 단계 올림 */}
            <p className="mb-8 text-lg text-foreground/70 text-pretty md:text-xl">
              {t("subtitle")}
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/marketplace">
                {/* Primary CTA는 accent로 고정 */}
                <Button
                  size="lg"
                  className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {t("exploreMarketplace")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>

              <Link href="/create-loan">
                {/* Secondary CTA는 outline 유지하되 카드/텍스트 대비 보강 */}
                <Button
                  size="lg"
                  variant="outline"
                  className="border-border bg-background/40 hover:bg-card/60"
                >
                  {t("createLoanRequest")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      {/* 핵심: bg-card/50는 너무 묻힘 -> bg-card + 구획선 강화 */}
      <section className="border-y border-border bg-card">
        <div className="container mx-auto px-4 py-12">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* 각 항목을 "카드형"으로 만들어 배경과 분리 */}
            {[
              { value: "0.5%", label: t("stats.platformFee") },
              { value: "P2P", label: t("stats.directMatching") },
              { value: t("stats.flexible"), label: t("stats.yourRates") },
              { value: t("stats.secure"), label: t("stats.smartContracts") },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-border bg-background/30 px-6 py-5 text-center"
              >
                {/* value는 primary보다 accent가 더 잘 보임 */}
                <div className="mb-2 text-3xl font-bold text-accent">
                  {item.value}
                </div>
                <div className="text-sm text-muted-foreground">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-balance md:text-4xl">
            {t("howItWorks.title")}
          </h2>
          <p className="text-foreground/70 text-pretty">
            {t("howItWorks.subtitle")}
          </p>
        </div>

        {/* Card에 border + 배경을 명확히 */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
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
            <Card key={title} className="border-border bg-card">
              <CardContent className="p-6">
                {/* 아이콘 배경은 accent로 살짝 힘을 줌 */}
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent/15">
                  <Icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-balance">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground text-pretty">
                  {desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      {/* 핵심: CTA는 더 밝게 분리해서 “마지막 행동 유도”가 보여야 함 */}
      <section className="border-t border-border bg-secondary/60">
        <div className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-balance md:text-4xl">
              {t("cta.title")}
            </h2>
            <p className="mb-8 text-foreground/70 text-pretty">
              {t("cta.subtitle")}
            </p>
            <Link href="/marketplace">
              <Button
                size="lg"
                className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {t("cta.viewMarketplace")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              {t("footer.testnet")}
            </p>
            <div className="flex gap-6">
              <Link
                href="#"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {t("footer.docs")}
              </Link>
              <Link
                href="#"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {t("footer.github")}
              </Link>
              <Link
                href="#"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {t("footer.discord")}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
