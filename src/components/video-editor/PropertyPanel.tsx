"use client";

import {
  MediaItem,
  MIN_CLIP_DURATION,
  SelectionState,
  TimelineClip,
  TimelineState,
} from "@/types/video-editor.types";
import { useCallback, useEffect, useMemo, useState } from "react";

interface PropertyPanelProps {
  selectedClip: TimelineClip | null;
  selectedMedia: MediaItem | undefined;
  timeline: TimelineState;
  selection: SelectionState;
  onTimelineUpdate: (timeline: TimelineState) => void;
  onSelectionUpdate: (selection: SelectionState) => void;
}

// 로컬 편집 상태 타입
interface LocalEditState {
  startTime: number;
  duration: number;
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
  selection,
  onTimelineUpdate,
  onSelectionUpdate,
}: PropertyPanelProps) {
  // 선택된 모든 클립 찾기
  const selectedClips = useMemo(() => {
    const clipIds = selection.selectedClipIds.size > 0
      ? Array.from(selection.selectedClipIds)
      : selectedClip
      ? [selectedClip.id]
      : [];

    return timeline.tracks
      .flatMap((track) => track.clips)
      .filter((clip) => clipIds.includes(clip.id));
  }, [timeline.tracks, selection.selectedClipIds, selectedClip]);

  const isMultiSelect = selectedClips.length > 1;

  // 로컬 편집 상태 (저장 전까지 임시 값)
  const [localEditState, setLocalEditState] = useState<LocalEditState | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // 선택된 클립 변경 시 로컬 상태 초기화
  useEffect(() => {
    if (selectedClips.length > 0) {
      const startTime = isMultiSelect
        ? Math.min(...selectedClips.map((c) => c.startTime))
        : selectedClip?.startTime || 0;
      const duration = isMultiSelect
        ? Math.min(...selectedClips.map((c) => c.duration))
        : selectedClip?.duration || 0;

      setLocalEditState({ startTime, duration });
      setHasChanges(false);
    } else {
      setLocalEditState(null);
      setHasChanges(false);
    }
  }, [selectedClip?.id, selection.selectedClipIds.size]);

  // 로컬 상태 업데이트 (저장 전 임시 변경)
  const updateLocalProperty = useCallback(
    (property: keyof LocalEditState, value: number) => {
      if (!localEditState) return;
      setLocalEditState((prev) => prev ? { ...prev, [property]: value } : null);
      setHasChanges(true);
    },
    [localEditState],
  );

  // 변경 사항 저장 (리플 모드 적용)
  const handleSaveChanges = useCallback(() => {
    if (!localEditState || selectedClips.length === 0) return;

    const selectedClipIds = new Set(selectedClips.map((c) => c.id));

    // 원본 값 가져오기
    const originalStartTime = isMultiSelect
      ? Math.min(...selectedClips.map((c) => c.startTime))
      : selectedClip?.startTime || 0;
    const originalDuration = isMultiSelect
      ? Math.min(...selectedClips.map((c) => c.duration))
      : selectedClip?.duration || 0;

    const startTimeOffset = localEditState.startTime - originalStartTime;
    const newDuration = Math.max(MIN_CLIP_DURATION, localEditState.duration);
    const durationChanged = newDuration !== originalDuration;

    const updatedTracks = timeline.tracks.map((track) => {
      const hasSelectedClip = track.clips.some((c) => selectedClipIds.has(c.id));
      if (!hasSelectedClip) {
        // startTime 오프셋만 적용 (선택된 클립이 없는 트랙에서도 이동한 경우)
        if (startTimeOffset !== 0) {
          return {
            ...track,
            clips: track.clips.map((clip) => {
              if (selectedClipIds.has(clip.id)) {
                return { ...clip, startTime: Math.max(0, clip.startTime + startTimeOffset) };
              }
              return clip;
            }),
          };
        }
        return track;
      }

      // duration 변경 시 리플 모드 적용
      const sortedClips = [...track.clips].sort((a, b) => a.startTime - b.startTime);
      const updatedClips: TimelineClip[] = [];
      let currentPushOffset = 0;

      for (const clip of sortedClips) {
        if (selectedClipIds.has(clip.id)) {
          const oldDuration = clip.duration;
          const durationIncrease = durationChanged ? newDuration - oldDuration : 0;

          updatedClips.push({
            ...clip,
            startTime: Math.max(0, clip.startTime + startTimeOffset + currentPushOffset),
            duration: newDuration,
          });

          if (durationIncrease > 0) {
            currentPushOffset += durationIncrease;
          }
        } else {
          updatedClips.push({
            ...clip,
            startTime: clip.startTime + currentPushOffset,
          });
        }
      }

      return {
        ...track,
        clips: updatedClips.sort((a, b) => a.startTime - b.startTime),
      };
    });

    // 총 지속시간 재계산
    let maxEnd = 0;
    updatedTracks.forEach((track) => {
      track.clips.forEach((clip) => {
        const end = clip.startTime + clip.duration;
        if (end > maxEnd) maxEnd = end;
      });
    });

    onTimelineUpdate({
      ...timeline,
      tracks: updatedTracks,
      totalDuration: maxEnd,
    });

    setHasChanges(false);
  }, [localEditState, selectedClips, selectedClip, isMultiSelect, timeline, onTimelineUpdate]);

  // 변경 사항 취소 (원래 값으로 복원)
  const handleCancelChanges = useCallback(() => {
    if (selectedClips.length > 0) {
      const startTime = isMultiSelect
        ? Math.min(...selectedClips.map((c) => c.startTime))
        : selectedClip?.startTime || 0;
      const duration = isMultiSelect
        ? Math.min(...selectedClips.map((c) => c.duration))
        : selectedClip?.duration || 0;

      setLocalEditState({ startTime, duration });
      setHasChanges(false);
    }
  }, [selectedClips, selectedClip, isMultiSelect]);

  // 클립 삭제 (복수 선택 지원)
  const handleDeleteClip = useCallback(() => {
    if (selectedClips.length === 0) return;

    const clipIdsToDelete = new Set(selectedClips.map((c) => c.id));

    onTimelineUpdate({
      ...timeline,
      tracks: timeline.tracks.map((track) => ({
        ...track,
        clips: track.clips.filter((clip) => !clipIdsToDelete.has(clip.id)),
      })),
    });

    onSelectionUpdate({
      selectedClipId: null,
      selectedClipIds: new Set(),
      selectedTrackId: null,
    });
  }, [selectedClips, timeline, onTimelineUpdate, onSelectionUpdate]);

  // 클립이 선택되지 않았을 때
  if (selectedClips.length === 0) {
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

  const getTypeLabel = (media: MediaItem) => {
    switch (media.type) {
      case "image":
        return "이미지";
      case "video":
        return "비디오";
      case "audio":
        return "오디오";
    }
  };

  const getTypeIcon = (media: MediaItem) => {
    switch (media.type) {
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

  // 로컬 상태 또는 실제 값 사용
  const displayStartTime = localEditState?.startTime ?? 0;
  const displayDuration = localEditState?.duration ?? 0;
  const displayEndTime = displayStartTime + displayDuration;

  return (
    <div className="p-4">
      <h2 className="text-sm font-semibold text-slate-200 mb-4">
        {isMultiSelect ? `클립 속성 (${selectedClips.length}개 선택)` : "클립 속성"}
      </h2>

      {/* 복수 선택 알림 */}
      {isMultiSelect && (
        <div className="p-3 bg-teal-500/10 border border-teal-500/30 rounded-lg mb-4">
          <div className="text-xs text-teal-400 font-medium mb-1">
            {selectedClips.length}개의 클립이 선택되었습니다
          </div>
          <div className="text-xs text-slate-400">
            속성 변경 시 모든 선택된 클립에 적용됩니다
          </div>
        </div>
      )}

      {/* 미디어 정보 */}
      {selectedMedia && (
        <div className="p-3 bg-slate-800/50 rounded-lg mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-teal-400">{getTypeIcon(selectedMedia)}</div>
            <span className="text-xs text-slate-400">{getTypeLabel(selectedMedia)}</span>
          </div>
          {isMultiSelect ? (
            <div className="text-sm text-slate-200">
              {selectedClips.length}개의 클립
            </div>
          ) : (
            <>
              <div
                className="text-sm text-slate-200 truncate"
                title={selectedMedia.name}
              >
                {selectedMedia.name}
              </div>
              {selectedMedia.width && selectedMedia.height && (
                <div className="text-xs text-slate-400 mt-1">
                  {selectedMedia.width} × {selectedMedia.height}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 타임라인 속성 */}
      <div className="space-y-4">
        {/* 변경 사항 알림 */}
        {hasChanges && (
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-400">
            변경 사항이 있습니다. 저장 버튼을 눌러 적용하세요.
          </div>
        )}

        {/* 시작 시간 */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">
            시작 시간 {isMultiSelect && "(최소값)"}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="0.1"
              value={displayStartTime.toFixed(1)}
              onChange={(e) => {
                const value = Math.max(0, parseFloat(e.target.value) || 0);
                updateLocalProperty("startTime", value);
              }}
              className="flex-1 px-3 py-1.5 bg-slate-700 text-slate-200 rounded border border-slate-600 text-sm focus:outline-none focus:border-teal-500"
            />
            <span className="text-xs text-slate-400 w-16">
              {formatTime(displayStartTime)}
            </span>
          </div>
        </div>

        {/* 지속 시간 */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">
            지속 시간 {isMultiSelect && "(최소값)"}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={MIN_CLIP_DURATION}
              step="0.1"
              value={displayDuration.toFixed(1)}
              onChange={(e) => {
                const value = Math.max(
                  MIN_CLIP_DURATION,
                  parseFloat(e.target.value) || MIN_CLIP_DURATION,
                );
                updateLocalProperty("duration", value);
              }}
              className="flex-1 px-3 py-1.5 bg-slate-700 text-slate-200 rounded border border-slate-600 text-sm focus:outline-none focus:border-teal-500"
            />
            <span className="text-xs text-slate-400 w-16">
              {formatTime(displayDuration)}
            </span>
          </div>
          {/* 슬라이더 */}
          {selectedMedia && (
            <input
              type="range"
              min={MIN_CLIP_DURATION}
              max={Math.max(selectedMedia.duration * 2, 30)}
              step="0.1"
              value={displayDuration}
              onChange={(e) =>
                updateLocalProperty("duration", parseFloat(e.target.value))
              }
              className="w-full mt-2 accent-teal-500"
            />
          )}
        </div>

        {/* 원본 미디어 길이 표시 */}
        {selectedMedia && !isMultiSelect && (
          <div className="p-2 bg-slate-800/30 rounded text-xs text-slate-400">
            원본 길이: {formatTime(selectedMedia.duration)}
          </div>
        )}

        {/* 종료 시간 (계산값) */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">
            종료 시간 {isMultiSelect && "(최소값 기준)"}
          </label>
          <div className="px-3 py-1.5 bg-slate-800/50 text-slate-300 rounded text-sm">
            {formatTime(displayEndTime)}
          </div>
        </div>

        {/* 저장/취소 버튼 */}
        {hasChanges && (
          <div className="flex gap-2">
            <button
              onClick={handleSaveChanges}
              className="flex-1 px-3 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded text-sm font-medium transition-colors"
            >
              저장
            </button>
            <button
              onClick={handleCancelChanges}
              className="flex-1 px-3 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded text-sm transition-colors"
            >
              취소
            </button>
          </div>
        )}
      </div>

      {/* 액션 버튼 */}
      <div className="mt-6 space-y-2">
        {/* 복제 버튼 */}
        {!isMultiSelect && selectedClip && (
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
                          (a, b) => a.startTime - b.startTime,
                        ),
                      }
                    : track,
                ),
              });
            }}
            className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-sm transition-colors"
          >
            클립 복제
          </button>
        )}

        {/* 삭제 버튼 */}
        <button
          onClick={handleDeleteClip}
          className="w-full px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm transition-colors"
        >
          {isMultiSelect ? `클립 삭제 (${selectedClips.length}개)` : "클립 삭제"}
        </button>
      </div>

      {/* 키보드 단축키 안내 */}
      <div className="mt-6 p-3 bg-slate-800/30 rounded-lg">
        <div className="text-xs text-slate-400 font-semibold mb-2">단축키</div>
        <div className="space-y-1 text-xs text-slate-500">
          <div>
            <kbd className="px-1 py-0.5 bg-slate-700 rounded">Delete</kbd> 클립
            삭제
          </div>
          <div>
            <kbd className="px-1 py-0.5 bg-slate-700 rounded">Space</kbd>{" "}
            재생/정지
          </div>
        </div>
      </div>
    </div>
  );
}
