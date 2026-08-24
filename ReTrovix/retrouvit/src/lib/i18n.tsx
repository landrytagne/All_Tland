"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { fr } from "@/locales/fr";
import { en } from "@/locales/en";

type Locale = "fr" | "en";

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

function getNestedValue(obj: Record<string, any>, path: string): string {
  const value = path.split(".").reduce((acc: any, key: string) => acc?.[key], obj);
  return typeof value === "string" ? value : path;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    const stored = localStorage.getItem("retrouvit_locale") as Locale | null;
    if (stored === "fr" || stored === "en") {
      setLocaleState(stored);
      document.documentElement.lang = stored;
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("retrouvit_locale", newLocale);
    document.documentElement.lang = newLocale;
  }, []);

  const translations = locale === "fr" ? fr : en;

  const t = useCallback(
    (key: string): string => {
      return getNestedValue(translations, key);
    },
    [translations]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }
  return context;
}

export type { Locale };
