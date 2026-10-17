import { create } from "zustand";

export type Theme = "light" | "dark" | "system";
export type Language = "en" | "hi" | "ta" | "te" | "ja" | "id" | "zh";

interface UiState {
  theme: Theme;
  language: Language;
  setTheme: (theme: Theme) => void;
  setLanguage: (lang: Language) => void;
}

export const useUiStore = create<UiState>((set) => ({
  theme: "system",
  language: "en",
  setTheme: (theme) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("dojo_theme", theme);
      const isDark =
        theme === "dark" ||
        (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    }
    set({ theme });
  },
  setLanguage: (language) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("dojo_lang", language);
      document.documentElement.setAttribute("lang", language);
    }
    set({ language });
  },
}));
