"use client";

import MainLayout from "@/components/layout/MainLayout";
import { CrawlResponse } from "@/types/api.types";
import axios from "axios";
import { useState } from "react";

export default function CrawlerPage() {
  const [url, setUrl] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [result, setResult] = useState<CrawlResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.get("/api/v1/crawler", {
        params: {
          url: encodeURIComponent(inputUrl),
        },
      });

      setResult(response.data);
      setUrl(inputUrl);
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
    <MainLayout>
      <div>
        <h1 className="text-4xl font-extrabold mb-12 bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">
          뉴스 크롤러
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="url"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              뉴스 URL (네이버 뉴스 또는 CNN)
            </label>
            <input
              type="url"
              id="url"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-white placeholder-slate-400"
              placeholder="https://news.naver.com/..."
            />
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
                  크롤링 중...
                </div>
              ) : (
                "크롤링 시작"
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
          <div className="mt-8 space-y-6">
            <div className="p-6 bg-slate-800/50 border border-slate-600/50 rounded-xl shadow-lg backdrop-blur-sm">
              <h2 className="text-2xl font-bold mb-6 text-teal-400">
                {result.title}
              </h2>
              <div className="space-y-3 text-sm text-slate-300 border-b border-slate-600/50 pb-6">
                <p className="flex items-center">
                  <span className="font-medium mr-2">출처:</span>
                  {result.publisher}
                </p>
                <p className="flex items-center">
                  <span className="font-medium mr-2">작성자:</span>
                  {result.author}
                </p>
                {result.date && (
                  <p className="flex items-center">
                    <span className="font-medium mr-2">날짜:</span>
                    {result.date}
                  </p>
                )}
                <p className="flex items-center">
                  <span className="font-medium mr-2">URL:</span>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-400 hover:text-teal-300 truncate"
                  >
                    {url}
                  </a>
                </p>
              </div>
              <div className="mt-6 prose prose-invert max-w-none">
                {result.content.split("\n").map((paragraph, index) => (
                  <p
                    key={index}
                    className="mb-4 text-slate-300 leading-relaxed"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
