import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const tektur = localFont({
  src: "../font/Tektur/Tektur-VariableFont_wdth,wght.ttf",
  variable: "--font-display",
  display: "swap",
  weight: "400 900",
});

export const metadata: Metadata = {
  title: "TMRW Foundation — Boardroom Configurator",
  description: "Configure branded office and boardroom spaces — walls, windows, ceiling, furniture.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="day" className={tektur.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
