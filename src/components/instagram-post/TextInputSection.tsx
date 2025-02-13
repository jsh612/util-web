"use client";

import { ImageTextOptions } from "@/types/api.types";

interface TextInputSectionProps {
  textOptions: ImageTextOptions;
  setTextOptions: (options: ImageTextOptions) => void;
  multipleTextMode: "ui" | "json";
  setMultipleTextMode: (mode: "ui" | "json") => void;
  textInputs: Array<{ title: string; content: string; bottom: string }>;
  setTextInputs: (
    inputs: Array<{ title: string; content: string; bottom: string }>
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
              "title" in item &&
              "content" in item &&
              "bottom" in item &&
              typeof item.title === "string" &&
              typeof item.content === "string" &&
              typeof item.bottom === "string"
          )
        ) {
          setJsonError(
            "각 항목은 title(문자열), content(문자열), bottom(문자열)를 포함해야 합니다."
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

  return (
    <div className="p-6 bg-slate-700/50 backdrop-blur-sm rounded-xl border border-slate-600/50 shadow-lg space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          텍스트 입력 모드
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() =>
              setTextOptions({ ...textOptions, textMode: "single" })
            }
            className={`px-4 py-2 rounded-lg border ${
              textOptions.textMode === "single"
                ? "bg-teal-500 border-teal-400 text-white"
                : "bg-slate-800/50 border-slate-600/50 text-slate-300 hover:bg-slate-700/50"
            }`}
          >
            단일 텍스트
          </button>
          <button
            type="button"
            onClick={() =>
              setTextOptions({ ...textOptions, textMode: "multiple" })
            }
            className={`px-4 py-2 rounded-lg border ${
              textOptions.textMode === "multiple"
                ? "bg-teal-500 border-teal-400 text-white"
                : "bg-slate-800/50 border-slate-600/50 text-slate-300 hover:bg-slate-700/50"
            }`}
          >
            다중 텍스트
          </button>
        </div>
      </div>

      {textOptions.textMode === "single" ? (
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
      ) : (
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
                  style={{
                    height: "auto",
                    minHeight: "200px",
                    maxHeight: "500px",
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
    </div>
  );
}
