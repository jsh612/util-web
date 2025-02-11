"use client";

import { ComponentResponse } from "@/types/figma-to-component.types";
import axios from "axios";
import Link from "next/link";
import { useState } from "react";

export default function ComponentPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComponentResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData(e.currentTarget);
    const figmaUrl = formData.get("figmaUrl") as string;

    try {
      // Figma URL에서 파일 ID와 노드 ID 추출
      const urlPattern = /figma\.com\/design\/([^/]+).*node-id=([^&]+)/;
      const matches = figmaUrl.match(urlPattern);

      if (!matches) {
        throw new Error(
          "올바른 Figma 파일 URL이 아닙니다. (예: https://www.figma.com/design/xxxxx?node-id=xxxx)"
        );
      }

      const newFormData = new FormData();
      newFormData.append("figmaUrl", figmaUrl);
      newFormData.append("filePath", formData.get("filePath") as string);
      newFormData.append("fileName", formData.get("fileName") as string);
      if (formData.get("description")) {
        newFormData.append(
          "description",
          formData.get("description") as string
        );
      }

      // 파일 필드의 모든 파일 추가
      const fileList = formData.getAll("files");
      fileList.forEach((file) => {
        newFormData.append("files", file);
      });

      const response = await axios.post("/api/v1/figma", newFormData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setResult(response.data);
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
          Figma 컴포넌트 생성
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
              placeholder="https://www.figma.com/file/xxxxx?node-id=xxxx"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="filePath"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                파일 경로
              </label>
              <input
                type="text"
                id="filePath"
                name="filePath"
                required
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-white placeholder-slate-400"
              />
            </div>

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
                required
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
              htmlFor="files"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              첨부 파일
            </label>
            <input
              type="file"
              id="files"
              name="files"
              multiple
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-teal-500/20 file:text-teal-400 hover:file:bg-teal-500/30 file:cursor-pointer"
            />
          </div>

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
        </form>

        {error && (
          <div className="mt-8 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-8 p-6 bg-teal-500/10 border border-teal-500/30 rounded-xl">
            <h2 className="text-xl font-semibold text-teal-400 mb-4">
              {result.message}
            </h2>
            <div className="space-y-3">
              <p className="text-slate-300">
                <strong className="text-teal-400">생성된 파일:</strong>{" "}
                {result.path}
              </p>
              {result.attachments.length > 0 && (
                <div>
                  <strong className="text-teal-400">첨부 파일:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {result.attachments.map((file, index) => (
                      <li key={index} className="text-slate-300">
                        {file}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
