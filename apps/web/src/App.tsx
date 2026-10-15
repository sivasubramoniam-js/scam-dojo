import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { I18nProvider } from "@/lib/i18n";
import { AppShell } from "@/components/shell/AppShell";
import HomePage from "@/app/page";
import TrainPage from "@/app/train/page";
import CheckPage from "@/app/check/page";
import RecoverPage from "@/app/recover/page";
import DashboardPage from "@/app/dashboard/page";
import NewsletterPage from "@/app/newsletter/page";

export function App() {
  return (
    <BrowserRouter>
      <I18nProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/train" element={<TrainPage />} />
            <Route path="/train/play" element={<Navigate to="/train" replace />} />
            <Route path="/train/debrief" element={<Navigate to="/dashboard" replace />} />
            <Route path="/debrief" element={<DashboardPage />} />
            <Route path="/check" element={<CheckPage />} />
            <Route path="/recover" element={<RecoverPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/newsletter" element={<NewsletterPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </I18nProvider>
    </BrowserRouter>
  );
}

export default App;
