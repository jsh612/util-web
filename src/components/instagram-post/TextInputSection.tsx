"use client";

import { generateContentFromModel } from "@/utils/actions/gemini-actions";
import { API_ROUTES } from "@/constants/routes";
import { CrawlResponse, ImageTextOptions } from "@/types/api.types";
import { ContentListUnion } from "@google/genai";
import { useState } from "react";

interface TextInputSectionProps {
  textOptions: ImageTextOptions;
  setTextOptions: (options: ImageTextOptions) => void;
  multipleTextMode: "ui" | "json";
  setMultipleTextMode: (mode: "ui" | "json") => void;
  textInputs: Array<{ title?: string; content?: string; bottom?: string }>;
  setTextInputs: (
    inputs: Array<{ title?: string; content?: string; bottom?: string }>
  ) => void;
  jsonInput: string;
  setJsonInput: (input: string) => void;
  jsonError: string | null;
  setJsonError: (error: string | null) => void;
}

export default function TextInputSection({
  textOptions,
  setTextOptions,
  multipleTextMode,
  setMultipleTextMode,
  textInputs,
  setTextInputs,
  jsonInput,
  setJsonInput,
  jsonError,
  setJsonError,
}: TextInputSectionProps) {
  const addTextInput = () => {
    setTextInputs([...textInputs, { title: "", content: "", bottom: "" }]);
  };

  const removeTextInput = (index: number) => {
    setTextInputs(textInputs.filter((_, i) => i !== index));
  };

  const updateTextInput = (
    index: number,
    field: "title" | "content" | "bottom",
    value: string
  ) => {
    const newInputs = [...textInputs];
    newInputs[index][field] = value;
    setTextInputs(newInputs);
  };

  const handleJsonInputChange = (value: string) => {
    setJsonInput(value);
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        if (
          !parsed.every(
            (item) =>
              typeof item === "object" &&
              (!("title" in item) || typeof item.title === "string") &&
              (!("content" in item) || typeof item.content === "string") &&
              (!("bottom" in item) || typeof item.bottom === "string")
          )
        ) {
          setJsonError(
            "각 항목의 title, content, bottom은 모두 선택사항이며 문자열이어야 합니다."
          );
          return;
        }
        setJsonError(null);
      } else {
        setJsonError("JSON은 배열 형식이어야 합니다.");
      }
    } catch (e) {
      setJsonError(
        e instanceof Error
          ? `JSON 형식 오류: ${e.message}`
          : "JSON 형식이 올바르지 않습니다."
      );
    }
  };

  // 기사 관련 상태
  const [articleUrl, setArticleUrl] = useState("");
  const [articleLoading, setArticleLoading] = useState(false);
  const [articleError, setArticleError] = useState<string | null>(null);
  const [articleData, setArticleData] = useState<CrawlResponse | null>(null);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiResult, setGeminiResult] = useState<string | null>(null);
  const [geminiError, setGeminiError] = useState<string | null>(null);

  // 텍스트 입력 모드 탭 상태 추가
  const [textInputTab, setTextInputTab] = useState<
    "single" | "multiple" | "article"
  >("single");

  // 다중 텍스트 미리보기 상태 추가
  const [showMultiPreview, setShowMultiPreview] = useState(false);

  // 인스타 태그/본문 내용 추천 추가
  const [instaTags, setInstaTags] = useState("");
  const [instaBody, setInstaBody] = useState("");

  // Gemini 결과에서 JSON 배열 부분만 추출하는 함수
  function extractGeminiJsonPart(result: string): string {
    let jsonPart = "";
    const match = result.match(/\[[\s\S]*\]/);
    if (match) {
      jsonPart = match[0];
    }

    return jsonPart || "";
  }

  // 기사 크롤링
  const handleFetchArticle = async () => {
    setArticleLoading(true);
    setArticleError(null);
    setArticleData(null);
    setGeminiResult(null);
    setGeminiError(null);
    setTextInputs([]);
    setInstaBody("");
    setInstaTags("");

    try {
      const res = await fetch(
        `${API_ROUTES.CRAWLER}?url=${encodeURIComponent(
          encodeURIComponent(articleUrl)
        )}`
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "기사 크롤링 실패");
      }
      const data = await res.json();
      setArticleData(data);
    } catch (e) {
      setArticleError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setArticleLoading(false);
    }
  };

  // Gemini 생성
  const handleGeminiGenerate = async () => {
    if (!articleData) return;
    setGeminiLoading(true);
    setGeminiResult(null);
    setGeminiError(null);
    try {
      // Gemini에 넘길 contents 포맷 (ContentListUnion)
      const contents: ContentListUnion = [
        {
          role: "user",
          parts: [
            {
              text: `
              # 너는 최고의 인스타그램 카드 뉴스 제작자야.
              
              # 뉴스기사
              - ${articleData.title}
              - ${articleData.content}
              - ${articleData.author}
              - ${articleData.publisher}
              - ${articleData.date}

              # 뉴스 기사 다음 형식에 맞춰서 수정해줘 언어가 영어일 경우 한국로 번역해줘.
  
  # 현재 시간적 기준은 "날짜" 기준으로 파악해줘
    - 예시: "날짜가 "2025-02-20" 이면 올해는 2025년도, 작년은 2024년도야"
  
  # 인스타그램에 카드 뉴스를 만들거야. 각 객체가 하나의 페이지로 작성될거야.
  
  # 객체는 다음 규칙에 따라 작성해줘
   ## 기본 규칙
      - title 기사 내용에 분석 해서, 사람들이 이해하기 쉽도록, 간단하고 명료하게 주요 내용만 한줄 이내로 작성해줘 
      - title에는 적절한 이모티콘 추가
      - content는 기사 내용에 분석 해서, 사람들이 이해하기 쉽도록, 간단하고 명료하게 두 줄 이내로 요약해줘
      - 줄바꿈 개행 문자는 포함시키지 말아줘
      - json 형식에 맞춰서 출력해줘
         - 큰따옴표("") 중첩시 이스케이프(\) 처리 해줘
         - 기타 json 형식에 안맞는 부분 있다면 수정해서 보여줘

   ## 세부 규칙
    1. 첫 번째 객체는 다음 내용에 따라 작성해줘
      a. 사람들을 후킹 할 수 있는 내용으로 만들어줘
      b. title에 적절한 이모티콘 추가
      c. "bottom": 한국 기준 오늘 날짜  "YYYY-MM-DD 형태" 로 작성해줘

    2. 마지막 객체는 다음 내용에 따라 작성해줘
      a. title: 관련 종목
      b. content
          - 뉴스에 주식 종목이 있으면 그 종목들은 무조건 추가해줘, 없으면 기사 내용 분석해서 관련 종목 미국, 한국 주식에서 찾아서 추가해줘.
          - 종목은  종목이름(티거) 구조로 추가해줘
      c. bottom 값은 추가 말아줘
          
    3. 그외 객체들
      a. title: 해당 객체의 제목
      b. content: 해당 객체의 본문
      c. bottom 값은 추가 말아줘
  
  # json 형식 예시
  [
    {
      "title": "러-우 전쟁 종전 기대감에 재건주 급등",
      "content": "트럼프 대통령이 러시아, 우크라이나 대통령과 연달아 통화.\n\n전쟁 종결 위한 협상 논의 시작.\n\n2025.02.13",
      "bottom" : 2025-02-20
    },
    {
      "title": "우크라이나 재건 규모",
      "content": "세계은행 기준 재건 필요 자금 약 5500억 달러 상회 전망.\n\n14~16일 독일 뮌헨안보회의에서 미국의 전쟁 종식 시나리오 발표 예정."
    },
    {
      "title": "업종별 주가 동향",
      "content": "건설기계, 전력기기, 석유화학 업종 중심 상승.\n\n재건 사업 참여 기대감으로 투자 수요 확대.\n\n공급망 정상화 기대감도 한몫."
    },
    {
      "title": "전문가 전망",
      "content": "휴전 협상 본격화시 우크라이나 재건 관심 집중 예상.\n\n관련 기업들 주가 상승 모멘텀 지속 전망."
    },
    {
      "title": "관련 종목",
      "content": "테슬라(TSLA)"
    }
  ]
  
  # 인스타 게시용 태그 및 본문 내용 추천
  1. 다음 기본값을 기본으로 하고, 추가로 기사 내용과 어울리는 사람들에게 잘 노출될 태그 만들어줘
   - 기본값: #주식 #코스피 #코스닥 #나스닥 #재테크 #경제 #뉴스
   - 양식
      <Tag>
      #주식 #코스피 #코스닥 #나스닥 #재테크 #경제 #뉴스
      </Tag>
  2. 사람들에게 노출 잘 될수 있도록 본문 내용 뉴스 내용 한문장 요약 (적절한 이모티콘 있다면 추가해줘)
    - 예시: 주식 시장이 오늘도 움직이고 있어요. 오늘의 주식 시장 트렌드를 확인해보세요.
    - 양식
       <본문>
       주식 시장이 오늘도 움직이고 있어요. 오늘의 주식 시장 트렌드를 확인해보세요.
       </본문>
              `,
            },
          ],
        },
      ];

      const result = await generateContentFromModel(contents);

      if (result) {
        // 결과에서 JSON 배열 부분만 추출
        const jsonPart = extractGeminiJsonPart(result);
        setGeminiResult(jsonPart);

        // <Tag>...</Tag> 추출
        const tagMatch = result.match(/<Tag>\s*([\s\S]*?)\s*<\/Tag>/);
        setInstaTags(
          tagMatch ? tagMatch[1].replace(/[\r\n]+/g, " ").trim() : ""
        );
        // <본문>...</본문> 추출
        const bodyMatch = result.match(/<본문>\s*([\s\S]*?)\s*<\/본문>/);
        setInstaBody(
          bodyMatch ? bodyMatch[1].replace(/[\r\n]+/g, " ").trim() : ""
        );
      } else {
        setGeminiError("Gemini 생성 결과가 없습니다.");
      }
    } catch (e) {
      setGeminiError(e instanceof Error ? e.message : "Gemini 생성 실패");
    } finally {
      setGeminiLoading(false);
    }
  };

  // Gemini 결과를 다중 텍스트로 반영하는 함수
  const handleApplyGeminiResultToMultiText = () => {
    try {
      const arr = JSON.parse(geminiResult ?? "");
      if (Array.isArray(arr)) {
        setTextInputs(
          arr.map(
            (item: { title?: string; content?: string; bottom?: string }) => {
              return {
                title: typeof item.title === "string" ? item.title : "",
                content: typeof item.content === "string" ? item.content : "",
                bottom: typeof item.bottom === "string" ? item.bottom : "",
              };
            }
          )
        );
        setTextOptions({ ...textOptions, textMode: "multiple" });
        setMultipleTextMode("ui");
        setShowMultiPreview(true);
      } else {
        alert("Gemini 결과가 배열(JSON array) 형식이 아닙니다.");
      }
    } catch {
      alert("Gemini 결과가 올바른 JSON 형식이 아닙니다.");
    }
  };

  return (
    <div className="p-6 bg-slate-700/50 backdrop-blur-sm rounded-xl border border-slate-600/50 shadow-lg space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          텍스트 입력 모드
        </label>
        <div className="grid grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => {
              setTextInputTab("single");
              setTextOptions({ ...textOptions, textMode: "single" });
            }}
            className={`px-4 py-2 rounded-lg border ${
              textInputTab === "single"
                ? "bg-teal-500 border-teal-400 text-white"
                : "bg-slate-800/50 border-slate-600/50 text-slate-300 hover:bg-slate-700/50"
            }`}
          >
            단일 텍스트
          </button>
          <button
            type="button"
            onClick={() => {
              setTextInputTab("multiple");
              setTextOptions({ ...textOptions, textMode: "multiple" });
            }}
            className={`px-4 py-2 rounded-lg border ${
              textInputTab === "multiple"
                ? "bg-teal-500 border-teal-400 text-white"
                : "bg-slate-800/50 border-slate-600/50 text-slate-300 hover:bg-slate-700/50"
            }`}
          >
            다중 텍스트
          </button>
          <button
            type="button"
            onClick={() => setTextInputTab("article")}
            className={`px-4 py-2 rounded-lg border ${
              textInputTab === "article"
                ? "bg-teal-500 border-teal-400 text-white"
                : "bg-slate-800/50 border-slate-600/50 text-slate-300 hover:bg-slate-700/50"
            }`}
          >
            기사 URL
          </button>
        </div>
      </div>

      {/* 탭별 입력 UI */}
      {textInputTab === "single" && (
        <>
          <div className="mt-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              제목 (선택사항)
            </label>
            <textarea
              value={textOptions.title}
              onChange={(e) =>
                setTextOptions({
                  ...textOptions,
                  title: e.target.value,
                })
              }
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-white placeholder-slate-400 resize-none"
              placeholder="제목을 입력하세요 (선택사항)"
              rows={2}
            />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              본문 텍스트 (선택사항)
            </label>
            <textarea
              value={textOptions.content}
              onChange={(e) =>
                setTextOptions({
                  ...textOptions,
                  content: e.target.value,
                })
              }
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-white placeholder-slate-400 resize-none"
              placeholder="본문 텍스트를 입력하세요 (선택사항)"
              rows={4}
            />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              하단 텍스트 (선택사항)
            </label>
            <textarea
              value={textOptions.bottom}
              onChange={(e) =>
                setTextOptions({
                  ...textOptions,
                  bottom: e.target.value,
                })
              }
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-white placeholder-slate-400 resize-none"
              placeholder="하단 텍스트를 입력하세요 (선택사항)"
              rows={2}
            />
          </div>
        </>
      )}
      {textInputTab === "multiple" && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-300">
              입력 방식
            </label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setMultipleTextMode("ui")}
                className={`px-3 py-1.5 rounded-lg border ${
                  multipleTextMode === "ui"
                    ? "bg-teal-500 border-teal-400 text-white"
                    : "bg-slate-800/50 border-slate-600/50 text-slate-300 hover:bg-slate-700/50"
                }`}
              >
                UI 입력
              </button>
              <button
                type="button"
                onClick={() => setMultipleTextMode("json")}
                className={`px-3 py-1.5 rounded-lg border ${
                  multipleTextMode === "json"
                    ? "bg-teal-500 border-teal-400 text-white"
                    : "bg-slate-800/50 border-slate-600/50 text-slate-300 hover:bg-slate-700/50"
                }`}
              >
                JSON 입력
              </button>
            </div>
          </div>

          {multipleTextMode === "ui" ? (
            <>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-300">
                  텍스트 세트
                </label>
                <button
                  type="button"
                  onClick={addTextInput}
                  className="inline-flex items-center px-3 py-1.5 bg-teal-500/20 text-teal-400 rounded-lg hover:bg-teal-500/30 transition-colors"
                >
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  텍스트 세트 추가
                </button>
              </div>
              {textInputs.map((input, index) => (
                <div
                  key={index}
                  className="p-4 bg-slate-800/50 rounded-xl space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-teal-400">
                      텍스트 세트 #{index + 1}
                    </span>
                    {textInputs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTextInput(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      제목
                    </label>
                    <textarea
                      value={input.title}
                      onChange={(e) =>
                        updateTextInput(index, "title", e.target.value)
                      }
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-white placeholder-slate-400 resize-none"
                      placeholder="제목을 입력하세요"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      본문
                    </label>
                    <textarea
                      value={input.content}
                      onChange={(e) =>
                        updateTextInput(index, "content", e.target.value)
                      }
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-white placeholder-slate-400 resize-none"
                      placeholder="본문을 입력하세요"
                      rows={4}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      하단 텍스트
                    </label>
                    <textarea
                      value={input.bottom}
                      onChange={(e) =>
                        updateTextInput(index, "bottom", e.target.value)
                      }
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-white placeholder-slate-400 resize-none"
                      placeholder="하단 텍스트를 입력하세요"
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                JSON 입력
                <span className="ml-2 text-xs text-slate-400">
                  (title과 content를 포함한 배열)
                </span>
              </label>
              <div className="relative">
                <textarea
                  value={jsonInput}
                  onChange={(e) => {
                    handleJsonInputChange(e.target.value);
                    const textarea = e.target;
                    textarea.style.height = "auto";
                    textarea.style.height = `${Math.min(
                      textarea.scrollHeight,
                      500
                    )}px`;
                  }}
                  className={`w-full px-4 py-3 bg-slate-800/50 border rounded-xl focus:ring-2 focus:ring-teal-500 text-white font-mono text-sm leading-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800/50 hover:scrollbar-thumb-slate-500 ${
                    jsonError ? "border-red-500/50" : "border-slate-600/50"
                  }`}
                  placeholder='[
  {
    "title": "제목1",
    "content": "본문1"
  },
  {
    "title": "제목2",
    "content": "본문2"
  }
]'
                />
                {jsonError && (
                  <p className="mt-2 text-sm text-red-400">{jsonError}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      {textInputTab === "article" && (
        <div className="mt-6">
          {/* 기사 URL 입력 및 크롤링 UI 분리 */}
          <div className="mb-6 p-4 bg-slate-800/50 rounded-xl border border-slate-600/50">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              기사 URL 입력
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={articleUrl}
                onChange={(e) => setArticleUrl(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-600/50 text-white placeholder-slate-400"
                placeholder="기사 URL을 입력하세요"
              />
              <button
                type="button"
                onClick={handleFetchArticle}
                disabled={articleLoading || !articleUrl}
                className="px-4 py-2 rounded-lg bg-teal-500 text-white font-semibold disabled:opacity-50"
              >
                {articleLoading ? "불러오는 중..." : "기사 불러오기"}
              </button>
            </div>
            {articleError && (
              <div className="mt-2 text-red-400 text-sm">{articleError}</div>
            )}
            {articleData && (
              <div className="mt-4 p-3 bg-slate-900/60 rounded-lg text-slate-200 text-sm space-y-1">
                <div>
                  <b>제목:</b> {articleData?.title}
                </div>
                <div>
                  <b>언론사:</b> {articleData?.publisher}
                </div>
                <div>
                  <b>작성자:</b> {articleData?.author}
                </div>
                {articleData?.date && (
                  <div>
                    <b>날짜:</b> {articleData.date}
                  </div>
                )}
                <div className="line-clamp-3">
                  <b>본문:</b> {articleData?.content?.slice(0, 200)}
                  {articleData?.content?.length > 200 ? "..." : ""}
                </div>
                <button
                  type="button"
                  onClick={handleGeminiGenerate}
                  disabled={geminiLoading}
                  className="mt-3 px-4 py-2 rounded-lg bg-indigo-500 text-white font-semibold disabled:opacity-50"
                >
                  {geminiLoading ? "Gemini 생성 중..." : "Gemini로 생성"}
                </button>
              </div>
            )}
            {geminiError && (
              <div className="mt-2 text-red-400 text-sm">{geminiError}</div>
            )}
            {geminiResult && (
              <div className="mt-4 p-3 bg-slate-900/80 rounded-lg text-slate-100 text-sm whitespace-pre-line">
                <b>Gemini 결과:</b>
                <div>{geminiResult}</div>
                <button
                  type="button"
                  className="mt-4 px-4 py-2 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700"
                  onClick={handleApplyGeminiResultToMultiText}
                >
                  다중 텍스트로 반영
                </button>
                {/* 다중 텍스트 미리보기 UI */}
                {showMultiPreview && (
                  <div className="mt-6 space-y-4">
                    {textInputs.map((input, index) => (
                      <div
                        key={index}
                        className="p-4 bg-slate-800/50 rounded-xl space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-teal-400">
                            텍스트 세트 #{index + 1}
                          </span>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            제목
                          </label>
                          <textarea
                            value={input.title}
                            onChange={(e) =>
                              updateTextInput(index, "title", e.target.value)
                            }
                            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 resize-none"
                            rows={2}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            본문
                          </label>
                          <textarea
                            value={input.content}
                            onChange={(e) =>
                              updateTextInput(index, "content", e.target.value)
                            }
                            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 resize-none"
                            rows={4}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            하단 텍스트
                          </label>
                          <textarea
                            value={input.bottom}
                            onChange={(e) =>
                              updateTextInput(index, "bottom", e.target.value)
                            }
                            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 resize-none"
                            rows={2}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* 인스타 태그/본문 내용 별도 박스 */}
                {instaTags && (
                  <div className="mt-6 p-4 bg-slate-800/70 rounded-xl border border-slate-600/50">
                    <div className="flex items-center justify-between">
                      <b className="text-teal-400">인스타 게시용 태그</b>
                      <button
                        type="button"
                        className="ml-2 px-3 py-1 rounded bg-slate-700 text-slate-200 text-xs hover:bg-teal-600 hover:text-white"
                        onClick={() => navigator.clipboard.writeText(instaTags)}
                      >
                        복사하기
                      </button>
                    </div>
                    <div className="mt-2 text-slate-200 text-sm whitespace-pre-line">
                      {instaTags}
                    </div>
                  </div>
                )}
                {instaBody && (
                  <div className="mt-4 p-4 bg-slate-800/70 rounded-xl border border-slate-600/50">
                    <div className="flex items-center justify-between">
                      <b className="text-indigo-400">본문 내용 추천</b>
                      <button
                        type="button"
                        className="ml-2 px-3 py-1 rounded bg-slate-700 text-slate-200 text-xs hover:bg-indigo-600 hover:text-white"
                        onClick={() => navigator.clipboard.writeText(instaBody)}
                      >
                        복사하기
                      </button>
                    </div>
                    <div className="mt-2 text-slate-200 text-sm whitespace-pre-line">
                      {instaBody}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
