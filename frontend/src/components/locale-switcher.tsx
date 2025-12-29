"use client";

import styled from "@emotion/styled";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { locales, type Locale } from "@/i18n/config";
import { getLocale, setLocale, getLocaleLabel } from "@/lib/locale";
import { Languages } from "lucide-react";
import { useState } from "react";

export function LocaleSwitcher() {
  const [currentLocale, setCurrentLocale] = useState<Locale>(() => {
    // SSR/빌드 타임 안전 가드
    if (typeof window === "undefined") return "ko";
    return getLocale();
  });

  const handleLocaleChange = (locale: Locale) => {
    setCurrentLocale(locale);
    setLocale(locale);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton type="button" aria-label="Change language">
          <Languages width={18} height={18} />
        </IconButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            data-active={currentLocale === locale ? "true" : "false"}
            onSelect={(e) => {
              e.preventDefault();
              handleLocaleChange(locale);
            }}
          >
            {getLocaleLabel(locale)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;

  width: 44px;
  height: 44px;

  border-radius: calc(var(--radius) - 3px);
  border: 1px solid var(--border);
  background: color-mix(in oklab, var(--card) 55%, transparent);
  color: var(--foreground);

  transition: background 140ms ease;

  &:hover {
    background: color-mix(in oklab, var(--card) 70%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }
`;
