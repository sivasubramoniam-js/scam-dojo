import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import Logo from "@/components/common/Logo";
import TracePanel from "@/components/common/TracePanel";
import { fetchMe, UserProfile } from "@/lib/api";
import { fetchUserLocation } from "@/lib/location";
import { useI18n, SUPPORTED_LANGUAGES, LanguageOption } from "@/lib/i18n";
import { Language } from "@/stores/ui";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const [isDark, setIsDark] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement | null>(null);

  const { lang, setLang, t, languages } = useI18n();

  const [userProfile, setUserProfile] = useState<UserProfile>({
    uid: "guest",
    belt: "orange",
    resilienceScore: 39,
    streakDays: 5,
    displayName: "Dojo Student",
    language: "en",
  });

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("dojo_theme");
      const dark = savedTheme === "dark";
      setIsDark(dark);
      document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    } catch {}

    fetchMe()
      .then((data) => {
        if (data) setUserProfile(data);
      })
      .catch(() => {});

    // Fetch user location details via ip-api
    fetchUserLocation().catch(() => {});
  }, []);

  // Close language dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    try {
      localStorage.setItem("dojo_theme", nextDark ? "dark" : "light");
      document.documentElement.setAttribute("data-theme", nextDark ? "dark" : "light");
    } catch {}
  };

  const handleSelectLanguage = (newLang: Language) => {
    setLang(newLang);
    setLangMenuOpen(false);
  };

  const currentLangOption =
    languages.find((l) => l.code === lang) ||
    SUPPORTED_LANGUAGES[0];

  const beltName = (userProfile.belt || "orange").toLowerCase();
  const score =
    typeof userProfile.resilienceScore === "number" && !isNaN(userProfile.resilienceScore)
      ? userProfile.resilienceScore
      : 39;

  const beltColors: Record<string, string> = {
    white: "bg-belt-white",
    yellow: "bg-belt-yellow",
    orange: "bg-belt-orange",
    green: "bg-belt-green",
    blue: "bg-belt-blue",
    brown: "bg-belt-brown",
    black: "bg-belt-black",
  };

  const navItems = [
    { path: "/train", label: t("nav.train"), icon: "fitness_center" },
    { path: "/check", label: t("nav.check"), icon: "radar" },
    { path: "/recover", label: t("nav.recover"), icon: "emergency_home" },
    { path: "/dashboard", label: t("nav.dashboard"), icon: "workspace_premium" },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col font-body-md transition-colors duration-200">
      {/* Clean Light-Weight Top Header matching prototype */}
      <header className="sticky top-0 z-40 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--line)]">
        <div className="dojo-top flex items-center justify-between">
          {/* Logo with Link to Home */}
          <div className="flex items-center flex-1 justify-start">
            <Link
              to="/"
              onClick={() => {
                if (location.pathname === "/") {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              className="flex items-center gap-2 font-extrabold text-xl tracking-tight hover:opacity-90 transition-opacity"
            >
              <svg width="28" height="28" viewBox="0 0 32 32" className="shrink-0">
                <rect width="32" height="32" rx="8" fill="var(--act)" />
                <rect x="6" y="13" width="20" height="7" rx="3.5" fill="var(--on)" />
                <rect x="13" y="8" width="6" height="17" rx="3" fill="var(--on)" opacity=".8" transform="rotate(14 16 16)" />
              </svg>
              <span className="font-extrabold text-[20px] font-display text-[var(--ink)]">Scam Dojo</span>
            </Link>
          </div>

          {/* Desktop Centered Navigation (hidden on mobile) */}
          <nav
            className="hidden md:flex items-center gap-1.5 bg-[var(--sf)] border border-[var(--line)] p-1 rounded-full shadow-xs shrink-0"
            aria-label="Desktop Navigation"
          >
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => {
                    if (location.pathname === item.path) {
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                    if (item.path === "/train") {
                      window.dispatchEvent(new CustomEvent("scam-dojo:reset-train"));
                    }
                  }}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                    isActive
                      ? "bg-[var(--act)] text-[var(--on)] shadow-xs"
                      : "text-[var(--mut)] hover:text-[var(--ink)] hover:bg-[var(--sf2)]"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="material-symbols-outlined text-[17px]">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action Icons: Belt Pill, Lang, Theme, 1930 */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end">
            {/* Belt Quick Indicator */}
            <Link
              to="/dashboard"
              className="hidden xl:inline-flex items-center gap-2 bg-[var(--sf)] border border-[var(--line)] px-3 py-1.5 rounded-full hover:border-[var(--act)] transition-colors shrink-0"
              title="View your belt standing"
            >
              <span className={`w-2.5 h-2.5 rounded-full ${beltColors[beltName] || "bg-belt-orange"}`}></span>
              <span className="text-xs font-bold capitalize text-[var(--ink)]">{beltName} {t("nav.belt")}</span>
              <span className="text-xs font-bold text-[var(--safe)]">{score} {t("nav.pts")}</span>
            </Link>

            {/* Language Selector Dropdown */}
            <div className="relative" ref={langMenuRef}>
              <button
                type="button"
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                aria-label="Select interface language"
                className="h-[38px] sm:h-[40px] px-2 sm:px-2.5 rounded-lg bg-[var(--sf)] border border-[var(--line)] text-xs font-bold text-[var(--ink)] hover:border-[var(--act)] transition-colors flex items-center gap-1 sm:gap-1.5 cursor-pointer shadow-xs"
                title={`Current language: ${currentLangOption.nativeName}`}
              >
                <span className="text-sm">{currentLangOption.flag}</span>
                <span className="font-mono uppercase text-[11px] hidden sm:inline">{currentLangOption.code}</span>
                <span className="material-symbols-outlined text-[14px] text-[var(--mut)]">
                  {langMenuOpen ? "arrow_drop_up" : "arrow_drop_down"}
                </span>
              </button>

              {/* Languages Dropdown Menu */}
              {langMenuOpen && (
                <div className="absolute right-0 mt-2 w-[calc(100vw-32px)] sm:w-64 max-w-64 rounded-2xl bg-[var(--sf)] border border-[var(--line)] shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 border-b border-[var(--line)] text-[11px] font-bold uppercase tracking-wider text-[var(--mut)] flex items-center justify-between">
                    <span>Interface Language</span>
                    <span className="text-[10px] text-amber-500 font-mono">7 JAPAC</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto py-1">
                    {languages.map((option) => {
                      const isSelected = option.code === lang;
                      return (
                        <button
                          key={option.code}
                          type="button"
                          onClick={() => handleSelectLanguage(option.code)}
                          className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-[var(--act)]/10 text-[var(--act)] font-bold"
                              : "text-[var(--ink)] hover:bg-[var(--sf2)]"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">{option.flag}</span>
                            <div>
                              <div className="font-medium flex items-center gap-1.5">
                                <span>{option.nativeName}</span>
                                {option.code !== "en" && (
                                  <span className="text-[10px] text-[var(--mut)] font-normal">({option.name})</span>
                                )}
                              </div>
                              <div className="text-[10px] text-[var(--mut)] leading-none">{option.region}</div>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="material-symbols-outlined text-[16px] text-[var(--act)]">
                              check
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="w-[38px] sm:w-[40px] h-[38px] sm:h-[40px] rounded-lg bg-[var(--sf)] border border-[var(--line)] text-sm font-bold text-[var(--ink)] hover:border-[var(--act)] transition-colors flex items-center justify-center cursor-pointer shrink-0"
            >
              {isDark ? "☀️" : "◐"}
            </button>

            {/* 1930 Helpline Quick Dial */}
            <a
              href="tel:1930"
              className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 h-[38px] sm:h-[40px] rounded-lg bg-[var(--bad)] text-white text-xs font-bold hover:opacity-90 transition-opacity shadow-xs shrink-0"
              title="Call National Cyber Crime Helpline 1930"
            >
              <span className="material-symbols-outlined text-[16px]">call</span>
              <span className="hidden sm:inline">1930</span>
            </a>
          </div>
        </div>
      </header>

      {/* Centered Main Workspace (max-width 1280px) */}
      <main className="dojo-main flex-1">
        {children}
      </main>

      {/* Clean Bottom Navigation Tabs - Mobile only */}
      <nav className="dojo-tabs md:!hidden" aria-label="Modes">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => {
                if (location.pathname === item.path) {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
                if (item.path === "/train") {
                  window.dispatchEvent(new CustomEvent("scam-dojo:reset-train"));
                }
              }}
              className="dojo-tab-btn"
              aria-current={isActive ? "page" : undefined}
            >
              <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
              <span className="leading-none">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Live Agent Trace Panel for Judges */}
      <TracePanel />
    </div>
  );
}

export default AppShell;
