"use client";

import { useCallback } from "react";
import {
  MediaItem,
  TimelineState,
  TimelineClip,
  SelectionState,
  MIN_CLIP_DURATION,
} from "@/types/video-editor.types";

interface PropertyPanelProps {
  selectedClip: TimelineClip | null;
  selectedMedia: MediaItem | undefined;
  timeline: TimelineState;
  onTimelineUpdate: (timeline: TimelineState) => void;
  onSelectionUpdate: (selection: SelectionState) => void;
}

// 시간 포맷팅
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
}

export default function PropertyPanel({
  selectedClip,
  selectedMedia,
  timeline,
  onTimelineUpdate,
  onSelectionUpdate,
}: PropertyPanelProps) {
  // 클립 속성 업데이트
  const updateClipProperty = useCallback(
    (property: keyof TimelineClip, value: number) => {
      if (!selectedClip) return;

      onTimelineUpdate({
        ...timeline,
        tracks: timeline.tracks.map((track) => ({
          ...track,
          clips: track.clips.map((clip) =>
            clip.id === selectedClip.id ? { ...clip, [property]: value } : clip
          ),
        })),
      });
    },
    [selectedClip, timeline, onTimelineUpdate]
  );

  // 클립 삭제
  const handleDeleteClip = useCallback(() => {
    if (!selectedClip) return;

    onTimelineUpdate({
      ...timeline,
      tracks: timeline.tracks.map((track) => ({
        ...track,
        clips: track.clips.filter((clip) => clip.id !== selectedClip.id),
      })),
    });

    onSelectionUpdate({
      selectedClipId: null,
      selectedTrackId: null,
    });
  }, [selectedClip, timeline, onTimelineUpdate, onSelectionUpdate]);

  // 클립이 선택되지 않았을 때
  if (!selectedClip || !selectedMedia) {
    return (
      <div className="p-4">
        <h2 className="text-sm font-semibold text-slate-200 mb-4">속성</h2>
        <div className="text-center py-8 text-slate-400">
          <svg
            className="w-12 h-12 mx-auto mb-2 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm">클립을 선택하면</p>
          <p className="text-sm">속성을 편집할 수 있습니다</p>
        </div>
      </div>
    );
  }

  const getTypeLabel = () => {
    switch (selectedMedia.type) {
      case "image":
        return "이미지";
      case "video":
        return "비디오";
      case "audio":
        return "오디오";
    }
  };

  const getTypeIcon = () => {
    switch (selectedMedia.type) {
      case "image":
        return (
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
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        );
      case "video":
        return (
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
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        );
      case "audio":
        return (
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
              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
            />
          </svg>
        );
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-sm font-semibold text-slate-200 mb-4">클립 속성</h2>

      {/* 미디어 정보 */}
      <div className="p-3 bg-slate-800/50 rounded-lg mb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="text-teal-400">{getTypeIcon()}</div>
          <span className="text-xs text-slate-400">{getTypeLabel()}</span>
        </div>
        <div className="text-sm text-slate-200 truncate" title={selectedMedia.name}>
          {selectedMedia.name}
        </div>
        {selectedMedia.width && selectedMedia.height && (
          <div className="text-xs text-slate-400 mt-1">
            {selectedMedia.width} × {selectedMedia.height}
          </div>
        )}
      </div>

      {/* 타임라인 속성 */}
      <div className="space-y-4">
        {/* 시작 시간 */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">시작 시간</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="0.1"
              value={selectedClip.startTime.toFixed(1)}
              onChange={(e) => {
                const value = Math.max(0, parseFloat(e.target.value) || 0);
                updateClipProperty("startTime", value);
              }}
              className="flex-1 px-3 py-1.5 bg-slate-700 text-slate-200 rounded border border-slate-600 text-sm focus:outline-none focus:border-teal-500"
            />
            <span className="text-xs text-slate-400 w-16">
              {formatTime(selectedClip.startTime)}
            </span>
          </div>
        </div>

        {/* 지속 시간 */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">지속 시간</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={MIN_CLIP_DURATION}
              step="0.1"
              value={selectedClip.duration.toFixed(1)}
              onChange={(e) => {
                const value = Math.max(
                  MIN_CLIP_DURATION,
                  parseFloat(e.target.value) || MIN_CLIP_DURATION
                );
                updateClipProperty("duration", value);
              }}
              className="flex-1 px-3 py-1.5 bg-slate-700 text-slate-200 rounded border border-slate-600 text-sm focus:outline-none focus:border-teal-500"
            />
            <span className="text-xs text-slate-400 w-16">
              {formatTime(selectedClip.duration)}
            </span>
          </div>
          {/* 슬라이더 */}
          <input
            type="range"
            min={MIN_CLIP_DURATION}
            max={Math.max(selectedMedia.duration * 2, 30)}
            step="0.1"
            value={selectedClip.duration}
            onChange={(e) =>
              updateClipProperty("duration", parseFloat(e.target.value))
            }
            className="w-full mt-2 accent-teal-500"
          />
        </div>

        {/* 원본 미디어 길이 표시 */}
        <div className="p-2 bg-slate-800/30 rounded text-xs text-slate-400">
          원본 길이: {formatTime(selectedMedia.duration)}
        </div>

        {/* 종료 시간 (계산값) */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">종료 시간</label>
          <div className="px-3 py-1.5 bg-slate-800/50 text-slate-300 rounded text-sm">
            {formatTime(selectedClip.startTime + selectedClip.duration)}
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="mt-6 space-y-2">
        {/* 복제 버튼 */}
        <button
          onClick={() => {
            const newClip: TimelineClip = {
              ...selectedClip,
              id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              startTime: selectedClip.startTime + selectedClip.duration,
            };

            onTimelineUpdate({
              ...timeline,
              tracks: timeline.tracks.map((track) =>
                track.id === selectedClip.trackId
                  ? {
                      ...track,
                      clips: [...track.clips, newClip].sort(
                        (a, b) => a.startTime - b.startTime
                      ),
                    }
                  : track
              ),
            });
          }}
          className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-sm transition-colors"
        >
          클립 복제
        </button>

        {/* 삭제 버튼 */}
        <button
          onClick={handleDeleteClip}
          className="w-full px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm transition-colors"
        >
          클립 삭제
        </button>
      </div>

      {/* 키보드 단축키 안내 */}
      <div className="mt-6 p-3 bg-slate-800/30 rounded-lg">
        <div className="text-xs text-slate-400 font-semibold mb-2">단축키</div>
        <div className="space-y-1 text-xs text-slate-500">
          <div>
            <kbd className="px-1 py-0.5 bg-slate-700 rounded">Delete</kbd> 클립 삭제
          </div>
          <div>
            <kbd className="px-1 py-0.5 bg-slate-700 rounded">Space</kbd> 재생/정지
          </div>
        </div>
      </div>
    </div>
  );
}
