import type { Metadata } from "next";
import {
  Nanum_Brush_Script,
  Nanum_Gothic,
  Nanum_Myeongjo,
  Nanum_Pen_Script,
  Noto_Sans_KR,
} from "next/font/google";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans",
  preload: true,
});

const nanumGothic = Nanum_Gothic({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-nanum-gothic",
  preload: true,
});

const nanumMyeongjo = Nanum_Myeongjo({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-nanum-myeongjo",
  preload: true,
});

// 나눔 스크립트 폰트
const nanumPenScript = Nanum_Pen_Script({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-nanum-pen",
  preload: true,
});

const nanumBrushScript = Nanum_Brush_Script({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-nanum-brush",
  preload: true,
});

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
    <html
      lang="ko"
      className={`${notoSansKr.variable} ${nanumGothic.variable} ${nanumMyeongjo.variable} ${nanumPenScript.variable} ${nanumBrushScript.variable}`}
    >
      <head>
        {/* 프리텐다드 */}
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />

        {/* 스포카 한 산스 */}
        <link
          href="https://spoqa.github.io/spoqa-han-sans/css/SpoqaHanSansNeo.css"
          rel="stylesheet"
          as="style"
        />

        {/* 원티드 산스 */}
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/wanteddev/wanted-sans@v1.0.1/packages/wanted-sans/fonts/webfonts/variable/complete/WantedSansVariable.min.css"
        />
      </head>
      <body className="bg-slate-800 text-slate-200">{children}</body>
    </html>
  );
}
