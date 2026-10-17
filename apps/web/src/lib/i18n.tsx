"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import en from "@/i18n/en.json";
import hi from "@/i18n/hi.json";
import ta from "@/i18n/ta.json";
import te from "@/i18n/te.json";
import ja from "@/i18n/ja.json";
import id from "@/i18n/id.json";
import zh from "@/i18n/zh.json";
import { Language, useUiStore } from "@/stores/ui";

export interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
  region: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧", region: "Global / India / JAPAC" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳", region: "India" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", flag: "🇮🇳", region: "India / Singapore / Malaysia" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", flag: "🇮🇳", region: "India" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵", region: "Japan" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", flag: "🇮🇩", region: "Indonesia" },
  { code: "zh", name: "Chinese (Simplified)", nativeName: "简体中文", flag: "🇨🇳", region: "China / Singapore / Malaysia" },
];

const dictionaries: Record<Language, Record<string, string>> = {
  en,
  hi,
  ta,
  te,
  ja,
  id,
  zh,
};

interface I18nContextType {
  t: (key: string, params?: Record<string, string | number>) => string;
  lang: Language;
  setLang: (lang: Language) => void;
  languages: LanguageOption[];
}

function translate(lang: Language, key: string, params?: Record<string, string | number>): string {
  const dict = dictionaries[lang] || dictionaries.en;
  let text = dict[key] || dictionaries.en[key] || key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replaceAll(`{${k}}`, String(v));
    });
  }
  return text;
}

const I18nContext = createContext<I18nContextType>({
  t: (key, params) => translate("en", key, params),
  lang: "en",
  setLang: () => {},
  languages: SUPPORTED_LANGUAGES,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { language, setLanguage } = useUiStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("dojo_lang") as Language;
    const validCodes: Language[] = ["en", "hi", "ta", "te", "ja", "id", "zh"];
    if (saved && validCodes.includes(saved)) {
      setLanguage(saved);
      document.documentElement.lang = saved;
    }
  }, [setLanguage]);

  const t = (key: string, params?: Record<string, string | number>): string => {
    return translate(language, key, params);
  };

  return (
    <I18nContext.Provider value={{ t, lang: language, setLang: setLanguage, languages: SUPPORTED_LANGUAGES }}>
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
