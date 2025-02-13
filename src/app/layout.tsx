import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "유틸리티 웹",
  description: "유용한 웹 도구 모음",
  icons: {
    icon: [
      {
        url: "/favicon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: {
      url: "/favicon.svg",
      type: "image/svg+xml",
    },
    shortcut: {
      url: "/favicon.svg",
      type: "image/svg+xml",
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {/* Google Fonts */}
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Nanum+Gothic:wght@400;700&family=Nanum+Myeongjo:wght@400;700&family=Nanum+Pen+Script&family=Nanum+Brush+Script&display=swap"
          rel="stylesheet"
        />

        {/* 프리텐다드 */}
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />

        {/* 지마켓산스 */}
        <link
          href="https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansMedium.woff"
          rel="stylesheet"
        />

        {/* 스포카 한 산스 */}
        <link
          href="https://spoqa.github.io/spoqa-han-sans/css/SpoqaHanSansNeo.css"
          rel="stylesheet"
        />

        {/* 마루 부리 */}
        <link
          href="https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_four@1.0/MaruBuri-Regular.woff"
          rel="stylesheet"
        />

        {/* 카페24 써라운드 */}
        <link
          href="https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2105_2@1.0/Cafe24Ssurround.woff"
          rel="stylesheet"
        />

        {/* 스위트 */}
        <link
          href="https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2302@1.0/SUITE-Regular.woff2"
          rel="stylesheet"
        />

        {/* 더 잠실 */}
        <link
          href="https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2302@1.0/TheJamsil5Bold.woff2"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-800 text-slate-200">{children}</body>
    </html>
  );
}
