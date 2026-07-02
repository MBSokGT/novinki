import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const ibmMono = IBM_Plex_Mono({
  variable: "--font-ibm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  title: {
    default: "Новинки ассортимента — Комплекс-Бар",
    template: "%s — Новинки ассортимента",
  },
  description: "Каталог новинок ассортимента Комплекс-Бар: карточки товаров, листовки, фильтры по категориям и годам",
  keywords: ["новинки", "ассортимент", "товары", "каталог", "Комплекс-Бар"],
  robots: "index, follow",
  icons: {
    icon: `${basePath}/logo.png`,
    shortcut: `${basePath}/logo.png`,
    apple: `${basePath}/logo.png`,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={`${manrope.variable} ${ibmMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
