"use client";

import { AspectRatio, ASPECT_RATIO_CONFIG } from "@/types/video-editor.types";
import SidebarToggle from "@/components/common/SidebarToggle";

interface VideoEditorHeaderProps {
  aspectRatio: AspectRatio;
  isLeftSidebarOpen: boolean;
  isRightSidebarOpen: boolean;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  onLeftSidebarToggle: () => void;
  onRightSidebarToggle: () => void;
  onExportStandard?: () => void;
  onExportFast?: () => void;
  isExporting?: boolean;
}

export default function VideoEditorHeader({
  aspectRatio,
  isLeftSidebarOpen,
  isRightSidebarOpen,
  onAspectRatioChange,
  onLeftSidebarToggle,
  onRightSidebarToggle,
  onExportStandard,
  onExportFast,
  isExporting = false,
}: VideoEditorHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-3 bg-slate-800/50 border-b border-slate-700/50">
      <div>
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">
          영상 편집기
        </h1>
      </div>
      <div className="flex items-center gap-4">
        {/* 좌측 사이드바 토글 */}
        <SidebarToggle
          isOpen={isLeftSidebarOpen}
          onToggle={onLeftSidebarToggle}
          direction="left"
          position="inside"
          label={{
            open: "좌측 사이드바 열기",
            close: "좌측 사이드바 닫기",
          }}
        />

        {/* 우측 사이드바 토글 */}
        <SidebarToggle
          isOpen={isRightSidebarOpen}
          onToggle={onRightSidebarToggle}
          direction="right"
          position="inside"
          label={{
            open: "우측 사이드바 열기",
            close: "우측 사이드바 닫기",
          }}
        />

        {/* 비율 선택 */}
        <select
          value={aspectRatio}
          onChange={(e) => onAspectRatioChange(e.target.value as AspectRatio)}
          className="px-3 py-1.5 bg-slate-700 text-slate-200 rounded-lg border border-slate-600 text-sm"
        >
          {Object.entries(ASPECT_RATIO_CONFIG).map(([ratio, config]) => (
            <option key={ratio} value={ratio}>
              {config.label}
            </option>
          ))}
        </select>

        {/* 내보내기 버튼 그룹 */}
        <div className="flex items-center gap-2">
          {/* 빠른 내보내기 (FFmpeg 직접 렌더링) */}
          {onExportFast && (
            <button
              onClick={onExportFast}
              disabled={isExporting}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isExporting
                  ? "bg-slate-600 text-slate-400 cursor-not-allowed"
                  : "bg-amber-500 hover:bg-amber-600 text-white"
              }`}
              title="FFmpeg 서버 렌더링 (빠름)"
            >
              <span className="flex items-center gap-1.5">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                빠른 내보내기
              </span>
            </button>
          )}

          {/* 일반 내보내기 (브라우저 렌더링) */}
          {onExportStandard && (
            <button
              onClick={onExportStandard}
              disabled={isExporting}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isExporting
                  ? "bg-slate-600 text-slate-400 cursor-not-allowed"
                  : "bg-slate-600 hover:bg-slate-500 text-white"
              }`}
              title="브라우저 렌더링 후 MP4 변환"
            >
              <span className="flex items-center gap-1.5">
                <svg
                  className="w-4 h-4"
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
                일반 내보내기
              </span>
            </button>
          )}
        </div>

        {/* 내보내기 중 표시 */}
        {isExporting && (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <svg
              className="animate-spin h-4 w-4"
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
            처리 중...
          </div>
        )}
      </div>
    </div>
  );
}
