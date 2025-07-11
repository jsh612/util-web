"use client";

import { PAGE_ROUTES } from "@/constants/routes";
import Link from "next/link";

const tools = [
  {
    title: "Gemini 챗봇",
    description:
      "Google의 Gemini AI 모델을 활용한 채팅 인터페이스로 다양한 질문에 답변을 얻을 수 있습니다.",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
        />
      </svg>
    ),
    path: PAGE_ROUTES.GEMINI_CHAT,
    features: ["자연어 대화", "텍스트 기반 질의응답", "채팅 인터페이스"],
    isVisible: true,
  },
  {
    title: "Gemini 챗봇 (Static)",
    description:
      "Google의 Gemini AI 모델을 활용한 채팅 인터페이스로 다양한 질문에 답변을 얻을 수 있습니다.",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
        />
      </svg>
    ),
    path: PAGE_ROUTES.GEMINI_CHAT_STATIC,
    features: ["자연어 대화", "텍스트 기반 질의응답", "채팅 인터페이스"],
    isVisible: true,
  },
  {
    title: "인스타그램 포스트 에디터",
    description:
      "인스타그램에 최적화된 이미지와 텍스트를 조합하여 멋진 포스트를 만들어보세요.",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
    path: PAGE_ROUTES.INSTAGRAM_POST,
    features: [
      "인스타그램 비율 지원",
      "텍스트 크기/색상 조정",
      "다중 이미지 생성",
    ],
    isVisible: true,
  },
  {
    title: "Figma 컴포넌트 Prompt",
    description:
      "Figma 디자인을 분석하여 컴포넌트 개발에 필요한 상세 프롬프트를 생성합니다.",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
        />
      </svg>
    ),
    path: PAGE_ROUTES.FIGMA,
    features: ["Figma URL 지원", "PDF 텍스트 추출", "상세 프롬프트 생성"],
    isVisible: true,
  },
  {
    title: "뉴스 크롤러",
    description:
      "네이버 뉴스, CNN, AP 뉴스의 기사 내용을 자동으로 추출하고 정리합니다.",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2 2 0 00-2-2h-2"
        />
      </svg>
    ),
    path: PAGE_ROUTES.CRAWLER,
    features: [
      "네이버 뉴스 지원",
      "CNN 기사 지원",
      "AP 뉴스 지원",
      "메타데이터 추출",
    ],
    isVisible: true,
  },
  {
    title: "2009년 화질 변환기",
    description:
      "현대 이미지를 추억의 2009년 저화질 스타일로 변환하여 레트로한 느낌을 살려보세요.",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
    path: PAGE_ROUTES.RETRO_IMAGE,
    features: ["픽셀화 효과", "JPEG 압축", "노이즈 추가", "품질 조절"],
    isVisible: true,
  },
  {
    title: "포토부스 이미지 메이커",
    description:
      "인생네컷, 포토이즘 같은 포토부스 스타일의 사진을 직접 만들어보세요. 이미지 4장을 업로드하여 하나의 사진으로 병합합니다.",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
    path: PAGE_ROUTES.PHOTO_BOOTH,
    features: [
      "이미지 병합",
      "순서 변경 가능",
      "테두리/간격 조절",
      "세로형/정사각형 레이아웃",
    ],
    isVisible: true,
  },
  {
    title: "유튜브 쇼츠 스크립트 생성기",
    description:
      "Gemini AI를 사용하여 유튜브 쇼츠 스크립트를 생성합니다. 장면별 자막, 이미지 프롬프트, 나레이션을 제공합니다.",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.636 5.636a9 9 0 0112.728 0m-12.728 0a9 9 0 000 12.728m0-12.728L12 12l-6.364-6.364z"
        ></path>
      </svg>
    ),
    path: PAGE_ROUTES.SHORTS_GENERATOR,
    features: [
      "AI 스크립트 생성",
      "장면별 자막/나레이션",
      "이미지 프롬프트 제공",
      "클립보드 복사 기능",
    ],
    isVisible: true,
  },
];

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">
          Util Web
        </h1>
        <p className="text-xl text-slate-300 max-w-2xl">
          웹 기반 유틸리티 도구 모음입니다.
          <br />
          필요한 도구를 선택하여 바로 사용해보세요.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-7xl">
        {tools.map(
          (tool) =>
            tool.isVisible && (
              <Link
                key={tool.path}
                href={tool.path}
                className="group p-6 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 hover:border-teal-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-teal-500/10"
              >
                <div className="flex items-center mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500/20 to-blue-500/20 text-teal-400">
                    {tool.icon}
                  </div>
                  <h2 className="text-2xl font-bold text-slate-200 ml-4 group-hover:text-teal-400 transition-colors">
                    {tool.title}
                  </h2>
                </div>
                <p className="text-slate-300 mb-4">{tool.description}</p>
                <div className="space-y-2">
                  {tool.features.map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center text-sm text-slate-400"
                    >
                      <svg
                        className="w-4 h-4 mr-2 text-teal-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {feature}
                    </div>
                  ))}
                </div>
              </Link>
            )
        )}
      </div>
    </div>
  );
}
