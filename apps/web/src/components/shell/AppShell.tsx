import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import Logo from "@/components/common/Logo";
import TracePanel from "@/components/common/TracePanel";
import { fetchMe, UserProfile } from "@/lib/api";
import { fetchUserLocation } from "@/lib/location";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const [isDark, setIsDark] = useState(false);
  const [lang, setLang] = useState("EN");
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

      const savedLang = localStorage.getItem("dojo_lang") || "en";
      setLang(savedLang.toUpperCase());
    } catch {}

    fetchMe()
      .then((data) => {
        if (data) setUserProfile(data);
      })
      .catch(() => {});

    // Fetch user location details via ip-api
    fetchUserLocation().catch(() => {});
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    try {
      localStorage.setItem("dojo_theme", nextDark ? "dark" : "light");
      document.documentElement.setAttribute("data-theme", nextDark ? "dark" : "light");
    } catch {}
  };

  const handleLanguageToggle = () => {
    const nextLang = lang === "EN" ? "HI" : "EN";
    setLang(nextLang);
    try {
      localStorage.setItem("dojo_lang", nextLang.toLowerCase());
      document.documentElement.setAttribute("lang", nextLang.toLowerCase());
      window.dispatchEvent(new Event("languagechange"));
    } catch {}
  };

  const beltName = (userProfile.belt || "orange").toLowerCase();
  const score = typeof userProfile.resilienceScore === "number" && !isNaN(userProfile.resilienceScore)
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
    { path: "/", label: lang === "HI" ? "अभ्यास" : "Practice", icon: "sports_martial_arts" },
    { path: "/train", label: lang === "HI" ? "ड्रिल" : "Train", icon: "fitness_center" },
    { path: "/check", label: lang === "HI" ? "जाँचें" : "Check", icon: "radar" },
    { path: "/recover", label: lang === "HI" ? "बचाव" : "Recover", icon: "emergency_home" },
    { path: "/dashboard", label: lang === "HI" ? "बेल्ट" : "Me", icon: "workspace_premium" },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col font-body-md transition-colors duration-200">
      {/* Clean Light-Weight Top Header matching prototype */}
      <header className="sticky top-0 z-40 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--line)]">
        <div className="dojo-top flex items-center justify-between">
          {/* Logo with Link to Home */}
          <Link to="/" className="flex items-center gap-2 font-extrabold text-xl tracking-tight hover:opacity-90 transition-opacity">
            <svg width="28" height="28" viewBox="0 0 32 32" className="shrink-0">
              <rect width="32" height="32" rx="8" fill="var(--act)" />
              <rect x="6" y="13" width="20" height="7" rx="3.5" fill="var(--on)" />
              <rect x="13" y="8" width="6" height="17" rx="3" fill="var(--on)" opacity=".8" transform="rotate(14 16 16)" />
            </svg>
            <span className="font-extrabold text-[20px] font-display text-[var(--ink)]">Scam Dojo</span>
          </Link>

          {/* Right Action Icons: Belt Pill, Lang, Theme, 1930 */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Belt Quick Indicator */}
            <Link
              to="/dashboard"
              className="hidden sm:inline-flex items-center gap-2 bg-[var(--sf)] border border-[var(--line)] px-3 py-1.5 rounded-full hover:border-[var(--act)] transition-colors"
              title="View your belt standing"
            >
              <span className={`w-2.5 h-2.5 rounded-full ${beltColors[beltName] || "bg-belt-orange"}`}></span>
              <span className="text-xs font-bold capitalize text-[var(--ink)]">{beltName} belt</span>
              <span className="text-xs font-bold text-[var(--safe)]">{score} pts</span>
            </Link>

            {/* Language Toggle Button */}
            <button
              type="button"
              onClick={handleLanguageToggle}
              aria-label="Toggle language"
              className="min-w-[42px] h-[40px] rounded-lg bg-[var(--sf)] border border-[var(--line)] text-xs font-bold text-[var(--ink)] hover:border-[var(--act)] transition-colors flex items-center justify-center cursor-pointer"
            >
              {lang === "EN" ? "हि" : "EN"}
            </button>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="w-[40px] h-[40px] rounded-lg bg-[var(--sf)] border border-[var(--line)] text-sm font-bold text-[var(--ink)] hover:border-[var(--act)] transition-colors flex items-center justify-center cursor-pointer"
            >
              {isDark ? "☀️" : "◐"}
            </button>

            {/* 1930 Helpline Quick Dial */}
            <a
              href="tel:1930"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bad)] text-white text-xs font-bold hover:opacity-90 transition-opacity shadow-xs"
              title="Call National Cyber Crime Helpline 1930"
            >
              <span className="material-symbols-outlined text-[16px]">call</span>
              <span className="hidden xs:inline">1930</span>
            </a>
          </div>
        </div>
      </header>

      {/* Centered Main Workspace (max-width 760px) */}
      <main className="dojo-main flex-1">
        {children}
      </main>

      {/* Clean Bottom Navigation Tabs */}
      <nav className="dojo-tabs" aria-label="Modes">
        {navItems.map((item) => {
          const isActive =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
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
