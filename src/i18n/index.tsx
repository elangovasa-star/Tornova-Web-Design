import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ar } from "./locales/ar";
import { de } from "./locales/de";
import { es } from "./locales/es";
import { fr } from "./locales/fr";
import { ja } from "./locales/ja";

// Tornova i18n (docs/stage9/01, VG decision C9).
//
// English is the source language and the KEY: t("Get Started") looks the English
// text up in the active locale's dictionary and falls back to the English itself.
// That makes every string on the site translatable without a key registry, and a
// missing translation can never render as a blank or a raw key.
//
// A locale is offered to customers only when it is in the server's
// enabledLocales list (Site:EnabledLocales) - i.e. after its content has been
// reviewed and approved. In development every locale can be previewed, clearly
// marked as such. Prices stay USD in every language (see lib/pricing formatUsd).

export type LocaleCode = "en" | "ar" | "es" | "fr" | "de" | "ja";

export interface LocaleInfo {
  code: LocaleCode;
  name: string;
  dir: "ltr" | "rtl";
}

export const LOCALES: LocaleInfo[] = [
  { code: "en", name: "English", dir: "ltr" },
  { code: "ar", name: "العربية", dir: "rtl" },
  { code: "es", name: "Español", dir: "ltr" },
  { code: "fr", name: "Français", dir: "ltr" },
  { code: "de", name: "Deutsch", dir: "ltr" },
  { code: "ja", name: "日本語", dir: "ltr" },
];

const DICTIONARIES: Record<LocaleCode, Record<string, string>> = { en: {}, ar, es, fr, de, ja };
const STORAGE_KEY = "tornova.locale"; // a display preference only - nothing sensitive

interface I18n {
  locale: LocaleCode;
  dir: "ltr" | "rtl";
  available: LocaleInfo[];
  isPreview: (code: LocaleCode) => boolean;
  setLocale: (code: LocaleCode) => void;
  t: (text: string, vars?: Record<string, string | number>) => string;
}

const Context = createContext<I18n | null>(null);

export function translate(locale: LocaleCode, text: string, vars?: Record<string, string | number>): string {
  let out = DICTIONARIES[locale]?.[text] ?? text;
  if (vars) {
    for (const [key, value] of Object.entries(vars)) {
      out = out.replaceAll(`{${key}}`, String(value));
    }
  }
  return out;
}

export function I18nProvider({ enabledLocales, allowPreview = import.meta.env.DEV, children }: { enabledLocales: string[]; allowPreview?: boolean; children: ReactNode }) {
  const approved = useMemo(() => new Set<string>(["en", ...enabledLocales]), [enabledLocales]);
  const available = useMemo(() => LOCALES.filter((l) => approved.has(l.code) || allowPreview), [approved, allowPreview]);

  const [locale, setLocaleState] = useState<LocaleCode>(() => {
    const saved = (typeof localStorage !== "undefined" && localStorage.getItem(STORAGE_KEY)) as LocaleCode | null;
    return saved && LOCALES.some((l) => l.code === saved) ? saved : "en";
  });

  // A saved locale that is no longer offered falls back to English.
  const active: LocaleCode = available.some((l) => l.code === locale) ? locale : "en";
  const dir = LOCALES.find((l) => l.code === active)!.dir;

  useEffect(() => {
    document.documentElement.lang = active;
    document.documentElement.dir = dir;
  }, [active, dir]);

  const setLocale = useCallback((code: LocaleCode) => {
    setLocaleState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // Private browsing: the choice simply lasts for this visit.
    }
  }, []);

  const value = useMemo<I18n>(
    () => ({
      locale: active,
      dir,
      available,
      isPreview: (code) => !approved.has(code),
      setLocale,
      t: (text, vars) => translate(active, text, vars),
    }),
    [active, dir, available, approved, setLocale],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useI18n(): I18n {
  const value = useContext(Context);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}

export function useT() {
  return useI18n().t;
}
