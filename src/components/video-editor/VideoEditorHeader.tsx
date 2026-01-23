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
}

export default function VideoEditorHeader({
  aspectRatio,
  isLeftSidebarOpen,
  isRightSidebarOpen,
  onAspectRatioChange,
  onLeftSidebarToggle,
  onRightSidebarToggle,
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
      </div>
    </div>
  );
}
