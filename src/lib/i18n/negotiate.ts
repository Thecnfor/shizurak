import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";

export const locales = ["zh", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "zh";

export function hasLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;
  try {
    const languages = new Negotiator({
      headers: { "accept-language": acceptLanguage },
    }).languages();
    return match(languages, [...locales], defaultLocale) as Locale;
  } catch {
    return defaultLocale;
  }
}
