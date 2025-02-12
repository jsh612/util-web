"use client";

import ResultsSection from "@/components/instagram-post/ResultsSection";
import StyleOptionsSection from "@/components/instagram-post/StyleOptionsSection";
import TextInputSection from "@/components/instagram-post/TextInputSection";
import MainLayout from "@/components/layout/MainLayout";
import { ImageTextOptions } from "@/types/api.types";
import { TextResult } from "@/types/instagram-post.types";
import JSZip from "jszip";
import Image from "next/image";
import { useRef, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

export default function InstagramPost() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [results, setResults] = useState<TextResult[]>([]);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [textOptions, setTextOptions] = useState<ImageTextOptions>({
    textMode: "single",
    title: "",
    text: "",
    textArray: [],
    titleFontSize: 64,
    textFontSize: 48,
    titleColor: "#ffffff",
    textColor: "#ffffff",
    fontFamily: "Arial",
    instagramRatio: "square",
  });

  const [textInputs, setTextInputs] = useState<
    Array<{ title: string; content: string }>
  >([{ title: "", content: "" }]);

  const [multipleTextMode, setMultipleTextMode] = useState<"ui" | "json">("ui");
  const [jsonInput, setJsonInput] = useState<string>(
    '[\n  {\n    "title": "제목",\n    "content": "본문"\n  }\n]'
  );

  const [jsonError, setJsonError] = useState<string | null>(null);

  const validateAndParseJson = (): Array<{
    title: string;
    content: string;
  }> | null => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) {
        throw new Error("JSON은 배열 형식이어야 합니다.");
      }
      if (
        !parsed.every(
          (item) =>
            typeof item === "object" &&
            "title" in item &&
            "content" in item &&
            typeof item.title === "string" &&
            typeof item.content === "string"
        )
      ) {
        throw new Error("각 항목은 title과 content를 포함해야 합니다.");
      }
      return parsed;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "JSON 형식이 올바르지 않습니다."
      );
      return null;
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResults([]);
      const previewUrl = URL.createObjectURL(file);
      setPreviewImage(previewUrl);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setResults([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (previewImage) {
      URL.revokeObjectURL(previewImage);
      setPreviewImage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileInputRef.current?.files?.[0]) {
      setError("이미지를 선택해주세요.");
      return;
    }

    if (
      textOptions.textMode === "single" &&
      !textOptions.title?.trim() &&
      !textOptions.text?.trim()
    ) {
      setError("제목 또는 본문을 입력해주세요.");
      return;
    }

    if (textOptions.textMode === "multiple") {
      if (
        multipleTextMode === "ui" &&
        textInputs.every(
          (input) => !input.title.trim() && !input.content.trim()
        )
      ) {
        setError("최소 하나의 텍스트 세트에 제목 또는 본문을 입력해주세요.");
        return;
      }
      if (multipleTextMode === "json") {
        const parsedJson = validateAndParseJson();
        if (!parsedJson) return;
        if (
          parsedJson.every((item) => !item.title.trim() && !item.content.trim())
        ) {
          setError("최소 하나의 텍스트 세트에 제목 또는 본문을 입력해주세요.");
          return;
        }
      }
    }

    setLoading(true);
    setError(null);
    try {
      if (textOptions.textMode === "multiple") {
        let finalTextInputs = textInputs;

        if (multipleTextMode === "json") {
          const parsedJson = validateAndParseJson();
          if (!parsedJson) {
            setLoading(false);
            return;
          }
          finalTextInputs = parsedJson;
        }

        const validTextInputs = finalTextInputs.filter(
          (textInput) => textInput.title.trim() || textInput.content.trim()
        );

        for (const textInput of validTextInputs) {
          const finalTextOptions: ImageTextOptions = {
            textMode: "single",
            title: textInput.title,
            text: textInput.content || " ",
            titleFontSize: textOptions.titleFontSize,
            textFontSize: textOptions.textFontSize,
            titleColor: textOptions.titleColor,
            textColor: textOptions.textColor,
            fontFamily: textOptions.fontFamily,
            instagramRatio: textOptions.instagramRatio,
          };

          const formData = new FormData();
          formData.append("imageFile", fileInputRef.current.files[0]);
          formData.append("textOptions", JSON.stringify(finalTextOptions));

          const response = await fetch("/api/v1/image", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "이미지 처리 실패");
          }

          const blob = await response.blob();
          const url = URL.createObjectURL(blob);

          const newResult: TextResult = {
            id: Date.now().toString() + Math.random(),
            preview: url,
            textOptions: { ...finalTextOptions },
          };
          setResults((prev) => [...prev, newResult]);
        }
      } else {
        const finalTextOptions = {
          ...textOptions,
          textArray: undefined,
        };

        const formData = new FormData();
        formData.append("imageFile", fileInputRef.current.files[0]);
        formData.append("textOptions", JSON.stringify(finalTextOptions));

        const response = await fetch("/api/v1/image", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "이미지 처리 실패");
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const newResult: TextResult = {
          id: Date.now().toString(),
          preview: url,
          textOptions: { ...finalTextOptions },
        };
        setResults((prev) => [...prev, newResult]);
      }

      if (textOptions.textMode === "single") {
        setTextOptions((prev) => ({
          ...prev,
          title: "",
          text: "",
        }));
      } else {
        if (multipleTextMode === "ui") {
          setTextInputs([{ title: "", content: "" }]);
        } else {
          setJsonInput(
            '[\n  {\n    "title": "제목",\n    "content": "본문"\n  }\n]'
          );
        }
      }

      setTimeout(() => {
        const resultSection = document.querySelector(".results-section");
        if (resultSection) {
          resultSection.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    } catch (error) {
      console.error("Error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "이미지 처리 중 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (result: TextResult, index: number) => {
    try {
      const response = await fetch(result.preview);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const extension = selectedFile?.name
        ? selectedFile.name.split(".").pop()
        : "jpg";
      const today = new Date();
      const dateStr =
        today.getFullYear() +
        String(today.getMonth() + 1).padStart(2, "0") +
        String(today.getDate()).padStart(2, "0");
      a.download = `${dateStr}-instagram-post-${String(index + 1).padStart(
        2,
        "0"
      )}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download error:", error);
      setError("이미지 다운로드 중 오류가 발생했습니다.");
    }
  };

  const handleBulkDownload = async () => {
    if (results.length === 0) return;

    setDownloadLoading(true);
    setError(null);

    try {
      const zip = new JSZip();
      const imageFolder = zip.folder("images");

      const today = new Date();
      const dateStr =
        today.getFullYear() +
        String(today.getMonth() + 1).padStart(2, "0") +
        String(today.getDate()).padStart(2, "0");

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const response = await fetch(result.preview);
        const blob = await response.blob();
        const extension = selectedFile?.name
          ? selectedFile.name.split(".").pop()
          : "jpg";
        const fileName = `${dateStr}-instagram-post-${String(i + 1).padStart(
          2,
          "0"
        )}.${extension}`;
        imageFolder?.file(fileName, blob);
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = "instagram-posts.zip";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Bulk download error:", error);
      setError("일괄 다운로드 중 오류가 발생했습니다.");
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleRemoveResult = (id: string) => {
    setResults((prev) => prev.filter((result) => result.id !== id));
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <MainLayout>
        <div>
          <h1 className="text-4xl font-extrabold mb-12 bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">
            인스타그램 포스트 에디터
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-6 bg-slate-700/50 backdrop-blur-sm rounded-xl border border-slate-600/50 shadow-lg space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  이미지 선택
                </label>
                <input
                  type="file"
                  id="file-upload"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <div className="p-4 bg-slate-800/50 border border-slate-600/50 rounded-xl space-y-4">
                  <label
                    htmlFor="file-upload"
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
                      {selectedFile ? "이미지 변경하기" : "이미지 추가하기"}
                    </span>
                  </label>
                  {selectedFile && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-4 py-2 bg-slate-700/50 rounded-lg">
                        <span className="text-sm text-slate-300">
                          {selectedFile.name}
                        </span>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
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
                      </div>
                      {previewImage && (
                        <div className="relative w-full h-[300px] rounded-lg overflow-hidden">
                          <Image
                            src={previewImage}
                            alt="선택된 이미지 미리보기"
                            fill
                            className="object-contain"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <TextInputSection
                textOptions={textOptions}
                setTextOptions={setTextOptions}
                multipleTextMode={multipleTextMode}
                setMultipleTextMode={setMultipleTextMode}
                textInputs={textInputs}
                setTextInputs={setTextInputs}
                jsonInput={jsonInput}
                setJsonInput={setJsonInput}
                jsonError={jsonError}
                setJsonError={setJsonError}
              />

              <StyleOptionsSection
                textOptions={textOptions}
                setTextOptions={setTextOptions}
              />
            </div>

            <div className="flex justify-center mt-6">
              <button
                type="submit"
                disabled={
                  loading ||
                  !selectedFile ||
                  (textOptions.textMode === "single"
                    ? !textOptions.title?.trim() && !textOptions.text?.trim()
                    : multipleTextMode === "ui"
                    ? textInputs.every(
                        (input) => !input.title.trim() && !input.content.trim()
                      )
                    : !jsonInput.trim())
                }
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
                    처리중...
                  </div>
                ) : (
                  "텍스트 추가하기"
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-8 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200">
              {error}
            </div>
          )}

          {results.length > 0 && (
            <ResultsSection
              results={results}
              setResults={setResults}
              downloadLoading={downloadLoading}
              handleBulkDownload={handleBulkDownload}
              handleDownload={handleDownload}
              handleRemoveResult={handleRemoveResult}
            />
          )}
        </div>
      </MainLayout>
    </DndProvider>
  );
}
