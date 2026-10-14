import type { Metadata, Viewport } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { AppShell } from "@/components/shell/AppShell";

export const metadata: Metadata = {
  title: "Scam Dojo — Practice getting scammed. Safely.",
  description:
    "Train, check, and recover from digital scams. An AI-powered interactive simulator for UPI frauds, fake KYC, task scams, and cyber threats.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Anti-flash theme script before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('dojo_theme');
                  var isDark = theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
                  var lang = localStorage.getItem('dojo_lang');
                  if (lang) document.documentElement.setAttribute('lang', lang);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <I18nProvider>
          <AppShell>{children}</AppShell>
        </I18nProvider>
      </body>
    </html>
  );
}
