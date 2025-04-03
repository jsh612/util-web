"use client";

import MainLayout from "@/components/layout/MainLayout";
import { API_ROUTES } from "@/constants/routes";
import axios from "axios";
import { useState } from "react";

// 컴포넌트 응답 인터페이스
interface ComponentResponse {
  success: boolean;
  message: string;
  path?: string;
  attachments?: string[];
  generatedFiles?: string[];
  componentData?: {
    fileName: string;
    content: string;
  }[];
}

export default function FigmaPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComponentResponse | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [generatedFileContents, setGeneratedFileContents] = useState<
    Record<string, string>
  >({});
  const initialPrompt = `# 너는 최고의 프론트엔드 개발자야 다음 내용을 참고해서 컴포넌트를 생성해줘

# 기본 사항:
- Nextjs, TailwindCSS, Typescript, React 를 통해 컴포넌트 생성 필요
- Text 컴포넌트는 '@/stories/common/Text' 경로에 있는 컴포넌트 참고해서 진행
- Button 컴포넌트는 '@/stories/common/Button' 경로에 있는 컴포넌트 참고해서 진행
- 그외 다른 부분도 기존 코드들 중 공통 컴포넌트 활용해서 진행
- 디렉토리, 파일 규칙 등은 기존 코드 참고`;

  const [defaultPrompt, setDefaultPrompt] = useState(initialPrompt);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => file.size > 0);

    if (validFiles.length + selectedFiles.length > 5) {
      alert("첨부 파일은 최대 5개까지만 가능합니다.");
      return;
    }

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    // 파일 선택 초기화
    e.target.value = "";
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const extractTextFromFiles = async (files: File[]): Promise<string> => {
    const texts: string[] = [];

    for (const file of files) {
      try {
        if (file.type === "application/pdf") {
          try {
            const formData = new FormData();
            formData.append("file", file);
            const response = await fetch(
              window.location.origin + API_ROUTES.PDF,
              {
                method: "POST",
                body: formData,
              }
            );

            if (!response.ok) {
              throw new Error("PDF 처리 중 오류가 발생했습니다.");
            }

            const data = await response.json();
            texts.push(`[PDF: ${file.name}]\n${data.text}\n`);
          } catch (error) {
            texts.push(
              `[PDF: ${file.name}] PDF 처리 중 오류가 발생했습니다: ${
                error instanceof Error ? error.message : "알 수 없는 오류"
              }`
            );
          }
        } else if (file.type.startsWith("image/")) {
          texts.push(`[Image: ${file.name}]`);
        } else {
          texts.push(
            `[Unsupported: ${file.name}] File type not supported: ${file.type}`
          );
        }
      } catch (error) {
        if (error instanceof Error) {
          texts.push(`[Error processing ${file.name}]: ${error.message}`);
        }
      }
    }

    return texts.join("\n\n");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setGeneratedFileContents({});

    const formData = new FormData(e.currentTarget);
    const figmaUrl = formData.get("figmaUrl") as string;

    try {
      const urlPattern = /figma\.com\/design\/([^/]+).*node-id=([^&]+)/;
      const matches = figmaUrl.match(urlPattern);

      if (!matches) {
        throw new Error(
          "올바른 Figma 파일 URL이 아닙니다. (예: https://www.figma.com/design/xxxxx?node-id=xxxx)"
        );
      }

      const newFormData = new FormData();
      newFormData.append("figmaUrl", figmaUrl);
      newFormData.append("filePath", "prompt-files");
      newFormData.append("preventFileCreation", "true");
      newFormData.append(
        "fileName",
        (formData.get("fileName") as string) || "prompt-file"
      );
      if (formData.get("description")) {
        newFormData.append(
          "description",
          formData.get("description") as string
        );
      }
      newFormData.append("defaultPrompt", defaultPrompt);

      // 선택된 파일들 추가
      selectedFiles.forEach((file) => {
        newFormData.append("files", file);
      });

      // PDF 파일에서 텍스트 추출
      const extractedText = await extractTextFromFiles(selectedFiles);
      if (extractedText) {
        newFormData.append("extractedText", extractedText);
      }

      const response = await axios.post<ComponentResponse>(
        API_ROUTES.FIGMA,
        newFormData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setResult(response.data);

      // 생성된 파일 내용 가져오기
      if (
        response.data.generatedFiles &&
        response.data.generatedFiles.length > 0
      ) {
        const fileContents: Record<string, string> = {};

        for (const filePath of response.data.generatedFiles) {
          try {
            // prompt.txt 파일은 건너뛰기
            if (filePath.endsWith("prompt.txt")) continue;

            const fileResponse = await fetch(
              `/api/v1/files?path=${encodeURIComponent(filePath)}`
            );
            if (fileResponse.ok) {
              const text = await fileResponse.text();
              const fileName = filePath.split("/").pop() || filePath;
              fileContents[fileName] = text;
            }
          } catch (error) {
            console.error(
              `파일 내용을 가져오는 중 오류 발생: ${filePath}`,
              error
            );
          }
        }

        setGeneratedFileContents(fileContents);
      }

      // 서버가 componentData를 직접 반환한 경우 사용
      if (
        response.data.componentData &&
        response.data.componentData.length > 0
      ) {
        const fileContents: Record<string, string> = {};

        for (const component of response.data.componentData) {
          fileContents[component.fileName] = component.content;
        }

        setGeneratedFileContents(fileContents);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.error || error.message);
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("알 수 없는 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyContent = async (content: string, fileName: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopySuccess(fileName);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch {
      setError("클립보드 복사에 실패했습니다.");
    }
  };

  return (
    <MainLayout>
      <div>
        <h1 className="text-4xl font-extrabold mb-12 bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">
          Figma 컴포넌트 Prompt 생성
        </h1>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="figmaUrl"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              Figma 파일 URL
            </label>
            <input
              type="url"
              id="figmaUrl"
              name="figmaUrl"
              required
              placeholder="https://www.figma.com/design/xxxxx?node-id=xxxx"
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-white placeholder-slate-400"
            />
            <p className="mt-2 text-sm text-slate-400">
              <span className="block mb-1">지원하는 URL 형식:</span>
              <span className="block">
                - https://www.figma.com/file/xxxxxx?node-id=xxxx
              </span>
              <span className="block">
                - https://www.figma.com/design/xxxxxx?node-id=xxxx
              </span>
              <span className="block text-slate-500 mt-1">
                * Figma 파일의 공유 URL을 입력해주세요.
              </span>
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div>
              <label
                htmlFor="fileName"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                파일 이름
              </label>
              <input
                type="text"
                id="fileName"
                name="fileName"
                placeholder="기본값: prompt-file"
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-white placeholder-slate-400"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              설명
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-white placeholder-slate-400 resize-none"
            />
          </div>

          <div>
            <label
              htmlFor="prompt"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              기본 프롬프트
              <span className="ml-2 text-xs text-slate-400">(수정 가능)</span>
            </label>
            <div className="relative">
              <textarea
                id="prompt"
                name="prompt"
                value={defaultPrompt}
                onChange={(e) => setDefaultPrompt(e.target.value)}
                rows={10}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-white placeholder-slate-400 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setDefaultPrompt(initialPrompt)}
                className="absolute top-2 right-2 p-2 text-slate-400 hover:text-teal-400 transition-colors"
                title="기본값으로 되돌리기"
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div>
            <div className="block text-sm font-medium text-slate-300 mb-2">
              첨부 파일
              <span className="ml-1 text-teal-400">(최대 5개)</span>
              <span className="block mt-1 text-xs text-slate-400">
                * PDF 파일은 자동으로 텍스트를 추출하여 프롬프트에 포함됩니다.
              </span>
            </div>
            <input
              type="file"
              id="files"
              name="files"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="p-4 bg-slate-800/50 border border-slate-600/50 rounded-xl space-y-4">
              <label
                htmlFor="files"
                className="inline-flex items-center px-4 py-2 rounded-xl bg-slate-700/50 border border-slate-600/50 hover:bg-slate-600/50 transition-colors cursor-pointer"
              >
                <svg
                  className="w-5 h-5 mr-2 text-teal-400"
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
                <span className="text-sm font-medium text-teal-400">
                  파일 추가하기
                </span>
              </label>
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-slate-300">
                    선택된 파일 ({selectedFiles.length}/5):
                  </p>
                  <ul className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <li
                        key={index}
                        className="flex items-center justify-between px-4 py-2 bg-slate-700/50 rounded-lg"
                      >
                        <span className="text-sm text-slate-300">
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(index)}
                          className="text-red-400 hover:text-red-300 transition-colors"
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
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-center mt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-xl hover:from-teal-600 hover:to-blue-600 transition-all duration-300 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  생성 중...
                </div>
              ) : (
                "컴포넌트 생성"
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-8 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-8">
            <div className="p-6 bg-teal-500/10 border border-teal-500/30 rounded-xl mb-8">
              <h2 className="text-xl font-semibold text-teal-400 mb-4">
                {result.message}
              </h2>
            </div>

            {/* 생성된 컴포넌트 파일 표시 */}
            {Object.keys(generatedFileContents).length > 0 && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-teal-400">
                  생성된 컴포넌트 파일
                </h2>

                {Object.entries(generatedFileContents).map(
                  ([fileName, content], index) => (
                    <div
                      key={index}
                      className="p-6 bg-slate-800/50 border border-slate-600/50 rounded-xl shadow-lg backdrop-blur-sm"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-semibold text-teal-400">
                          {fileName}
                        </h3>
                        <button
                          onClick={() => handleCopyContent(content, fileName)}
                          className="inline-flex items-center px-4 py-2 bg-teal-500/20 text-teal-400 rounded-lg hover:bg-teal-500/30 transition-all duration-300 shadow-lg hover:shadow-xl"
                        >
                          {copySuccess === fileName ? (
                            <>
                              <svg
                                className="w-5 h-5 mr-2"
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
                              복사 완료
                            </>
                          ) : (
                            <>
                              <svg
                                className="w-5 h-5 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                                />
                              </svg>
                              코드 복사
                            </>
                          )}
                        </button>
                      </div>

                      <div className="mt-4 overflow-auto p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
                        <pre className="text-slate-300 text-sm font-mono whitespace-pre-wrap">
                          {content}
                        </pre>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
