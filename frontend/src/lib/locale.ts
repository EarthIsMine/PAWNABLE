"use client"

import { type Locale, defaultLocale, locales } from "@/i18n/config"

export function getLocale(): Locale {
  if (typeof window === "undefined") return defaultLocale

  const saved = localStorage.getItem("locale")
  if (saved && locales.includes(saved as Locale)) {
    return saved as Locale
  }

  return defaultLocale
}

export function setLocale(locale: Locale) {
  if (typeof window === "undefined") return

  localStorage.setItem("locale", locale)
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000`
  window.location.reload()
}

export function getLocaleLabel(locale: Locale): string {
  const labels: Record<Locale, string> = {
    ko: "한국어",
    en: "English",
  }
  return labels[locale]
}
