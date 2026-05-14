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
  title: "ET Global — Brand Space Configurator",
  description: "Design-to-cost configurator for ET Global trade-fair stands.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="day" className={tektur.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
