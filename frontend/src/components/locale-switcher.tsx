"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { locales, type Locale } from "@/i18n/config";
import { getLocale, setLocale, getLocaleLabel } from "@/lib/locale";
import { Languages } from "lucide-react";
import { useState, useEffect } from "react";

export function LocaleSwitcher() {
  const [currentLocale, setCurrentLocale] = useState<Locale>("ko");

  useEffect(() => {
    setCurrentLocale(getLocale());
  }, []);

  const handleLocaleChange = (locale: Locale) => {
    setLocale(locale);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Languages className="h-5 w-5" />
          <span className="sr-only">Change language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => handleLocaleChange(locale)}
            className={currentLocale === locale ? "bg-accent" : ""}
          >
            {getLocaleLabel(locale)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
