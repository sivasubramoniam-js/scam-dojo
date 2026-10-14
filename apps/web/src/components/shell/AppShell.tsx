"use client";

import React from "react";
import { TopBar } from "./TopBar";
import { BottomTabs } from "./BottomTabs";
import { LeftRail } from "./LeftRail";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--ink)] transition-colors">
      <TopBar />
      <div className="flex-1 max-w-[1120px] w-full mx-auto px-4 sm:px-6 flex gap-8">
        <LeftRail />
        <main className="flex-1 py-6 pb-24 lg:pb-12 max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>
      <BottomTabs />
    </div>
  );
}
