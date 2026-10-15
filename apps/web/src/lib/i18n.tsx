"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import en from "@/i18n/en.json";
import hi from "@/i18n/hi.json";
import { Language, useUiStore } from "@/stores/ui";

const dictionaries: Record<Language, Record<string, string>> = {
  en,
  hi,
};

interface I18nContextType {
  t: (key: string, params?: Record<string, string | number>) => string;
  lang: Language;
  setLang: (lang: Language) => void;
}

const I18nContext = createContext<I18nContextType>({
  t: (key) => key,
  lang: "en",
  setLang: () => {},
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { language, setLanguage } = useUiStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("dojo_lang") as Language;
    if (saved && (saved === "en" || saved === "hi")) {
      setLanguage(saved);
      document.documentElement.lang = saved;
    }
  }, [setLanguage]);

  const t = (key: string, params?: Record<string, string | number>): string => {
    const dict = dictionaries[language] || dictionaries.en;
    let text = dict[key] || dictionaries.en[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replaceAll(`{${k}}`, String(v));
      });
    }
    return text;
  };

  return (
    <I18nContext.Provider value={{ t, lang: language, setLang: setLanguage }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  return useContext(I18nContext);
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  return {
    ...ctx,
    language: ctx.lang,
  };
}
