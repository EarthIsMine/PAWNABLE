export const locales = ["ko", "en", "zh-HK"] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = "ko"
