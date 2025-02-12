"use client";

import { TextResult } from "@/types/instagram-post.types";
import DraggableImageCard from "./DraggableImageCard";

interface ResultsSectionProps {
  results: TextResult[];
  setResults: React.Dispatch<React.SetStateAction<TextResult[]>>;
  downloadLoading: boolean;
  handleBulkDownload: () => void;
  handleDownload: (result: TextResult, index: number) => void;
  handleRemoveResult: (id: string) => void;
}

export default function ResultsSection({
  results,
  setResults,
  downloadLoading,
  handleBulkDownload,
  handleDownload,
  handleRemoveResult,
}: ResultsSectionProps) {
  const moveCard = (dragIndex: number, hoverIndex: number): void => {
    setResults((prevResults) => {
      const newResults = [...prevResults];
      const [removed] = newResults.splice(dragIndex, 1);
      newResults.splice(hoverIndex, 0, removed);
      return newResults;
    });
  };

  return (
    <div className="mt-8 space-y-6 results-section">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-teal-400">
          생성된 이미지 목록
        </h2>
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setResults([])}
            className="inline-flex items-center px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            전체 초기화
          </button>
          <button
            type="button"
            onClick={handleBulkDownload}
            disabled={downloadLoading || results.length === 0}
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
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
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
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {results.map((result, index) => (
          <DraggableImageCard
            key={result.id}
            result={result}
            index={index}
            moveCard={moveCard}
            handleDownload={handleDownload}
            handleRemoveResult={handleRemoveResult}
          />
        ))}
      </div>
    </div>
  );
}
