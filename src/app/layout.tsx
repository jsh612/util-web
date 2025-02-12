import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Util Web",
  description: "웹 기반 유틸리티 도구 모음",
  icons: {
    icon: [
      {
        url: "/utilweb-favicon.svg",
        type: "image/svg+xml",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <main className="min-h-screen bg-white">{children}</main>
      </body>
    </html>
  );
}
