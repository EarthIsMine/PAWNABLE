import type React from "react";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import "./globals.css";
import EmotionRegistry from "@/lib/emotion/EmotionRegistry";
import Providers from "./providers";
import { AuthProvider } from "@/contexts/auth-context";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "PAWNABLE - P2P 암호화폐 대출",
  description: "암호화폐 담보 기반 탈중앙화 P2P 대출 플랫폼",
  icons: {
    icon: "/favicon.ico",
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-dvh">
        <EmotionRegistry>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <AuthProvider>
              <Providers>{children}</Providers>
              <Toaster />
            </AuthProvider>
          </NextIntlClientProvider>
        </EmotionRegistry>
      </body>
    </html>
  );
}
