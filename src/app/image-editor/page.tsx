"use client";

import { ImageTextOptions } from "@/types/api.types";
import JSZip from "jszip";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

interface TextResult {
  id: string;
  preview: string;
  textOptions: ImageTextOptions;
}

export default function ImageEditor() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [results, setResults] = useState<TextResult[]>([]);
  const [downloadLoading, setDownloadLoading] = useState(false);

  const [textOptions, setTextOptions] = useState<ImageTextOptions>({
    text: "",
    fontSize: 48,
    color: "#ffffff",
    fontFamily: "Arial",
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // 새 이미지가 업로드되면 결과물 초기화
      setResults([]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setResults([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileInputRef.current?.files?.[0]) {
      setError("이미지를 선택해주세요.");
      return;
    }
    if (!textOptions.text.trim()) {
      setError("텍스트를 입력해주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("imageFile", fileInputRef.current.files[0]);
      formData.append("textOptions", JSON.stringify(textOptions));

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

      // 결과물 배열에 추가
      const newResult: TextResult = {
        id: Date.now().toString(),
        preview: url,
        textOptions: { ...textOptions },
      };
      setResults((prev) => [...prev, newResult]);

      // 텍스트 입력 초기화
      setTextOptions((prev) => ({ ...prev, text: "" }));
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
      a.download = `${String(index + 1).padStart(2, "0")}-${
        result.textOptions.text
      }-${selectedFile?.name || "image.jpg"}`;
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

      // 각 이미지를 ZIP 파일에 추가
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const response = await fetch(result.preview);
        const blob = await response.blob();
        const fileName = `${String(i + 1).padStart(2, "0")}-${
          result.textOptions.text
        }-${selectedFile?.name || "image.jpg"}`;
        imageFolder?.file(fileName, blob);
      }

      // ZIP 파일 생성 및 다운로드
      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = "generated-images.zip";
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-teal-400 hover:text-teal-300 transition-colors"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            홈으로
          </Link>
        </div>

        <h1 className="text-4xl font-extrabold mb-12 bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">
          이미지 텍스트 에디터
        </h1>

        <div>
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
                      이미지 추가하기
                    </span>
                  </label>
                  {selectedFile && (
                    <div className="space-y-2">
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
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  텍스트 내용
                </label>
                <input
                  type="text"
                  value={textOptions.text}
                  onChange={(e) =>
                    setTextOptions({ ...textOptions, text: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-white placeholder-slate-400"
                  placeholder="추가할 텍스트를 입력하세요"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    글자 크기
                  </label>
                  <input
                    type="number"
                    value={textOptions.fontSize}
                    onChange={(e) =>
                      setTextOptions({
                        ...textOptions,
                        fontSize: Number(e.target.value),
                      })
                    }
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    글자 색상
                  </label>
                  <input
                    type="color"
                    value={textOptions.color}
                    onChange={(e) =>
                      setTextOptions({ ...textOptions, color: e.target.value })
                    }
                    className="w-full h-12 px-2 bg-slate-800/50 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !selectedFile}
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
          </form>

          {error && (
            <div className="mt-8 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200">
              {error}
            </div>
          )}

          {results.length > 0 && (
            <div className="mt-8 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-teal-400">
                  생성된 이미지 목록
                </h2>
                <button
                  onClick={handleBulkDownload}
                  disabled={downloadLoading}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-lg hover:from-teal-600 hover:to-blue-600 transition-all duration-300 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  {downloadLoading ? (
                    <>
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
                      다운로드 중...
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
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      전체 다운로드
                    </>
                  )}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {results.map((result, index) => (
                  <div
                    key={result.id}
                    className="p-4 bg-slate-700/50 backdrop-blur-sm rounded-xl border border-slate-600/50 shadow-lg"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-teal-400">
                          #{index + 1}
                        </span>
                        <span className="text-lg font-medium text-slate-300">
                          {result.textOptions.text}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleDownload(result, index)}
                          className="p-2 text-teal-400 hover:text-teal-300 transition-colors"
                          title="다운로드"
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
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleRemoveResult(result.id)}
                          className="p-2 text-red-400 hover:text-red-300 transition-colors"
                          title="삭제"
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
                    </div>
                    <div className="rounded-lg overflow-hidden relative h-[300px] w-full">
                      <Image
                        src={result.preview}
                        alt={result.textOptions.text}
                        fill
                        className="object-contain"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
