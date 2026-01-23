"use client";

import { useRef, useCallback, useMemo } from "react";
import { useDrop } from "react-dnd";
import {
  MediaItem,
  TimelineState,
  PlaybackState,
  SelectionState,
  TimelineClip,
  DragItem,
  DRAG_TYPES,
  PIXELS_PER_SECOND,
} from "@/types/video-editor.types";

interface TimelineProps {
  mediaItems: MediaItem[];
  timeline: TimelineState;
  playback: PlaybackState;
  selection: SelectionState;
  onTimelineUpdate: (timeline: TimelineState) => void;
  onPlaybackUpdate: (playback: PlaybackState) => void;
  onSelectionUpdate: (selection: SelectionState) => void;
}

// 시간 -> 픽셀 변환
function timeToPixels(time: number, zoom: number): number {
  return time * PIXELS_PER_SECOND * zoom;
}

// 픽셀 -> 시간 변환
function pixelsToTime(pixels: number, zoom: number): number {
  return pixels / (PIXELS_PER_SECOND * zoom);
}

// 시간 포맷팅
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${mins}:${secs.toString().padStart(2, "0")}.${ms}`;
}

// 타임 눈금자 컴포넌트
function TimeRuler({
  duration,
  zoom,
  scrollPosition,
}: {
  duration: number;
  zoom: number;
  scrollPosition: number;
}) {
  const interval = zoom >= 1 ? 1 : zoom >= 0.5 ? 2 : 5;
  const marks = [];

  for (let t = 0; t <= duration + 5; t += interval) {
    const left = timeToPixels(t, zoom);
    marks.push(
      <div
        key={t}
        className="absolute top-0 h-full flex flex-col items-center"
        style={{ left: `${left}px` }}
      >
        <div className="h-2 w-px bg-slate-500" />
        <span className="text-[10px] text-slate-400 mt-0.5">
          {formatTime(t)}
        </span>
      </div>
    );
  }

  return (
    <div
      className="relative h-6 bg-slate-800/50 border-b border-slate-700/50 overflow-hidden"
      style={{
        width: `${timeToPixels(Math.max(duration + 10, 30), zoom)}px`,
        marginLeft: `-${scrollPosition}px`,
      }}
    >
      {marks}
    </div>
  );
}

// 클립 컴포넌트
function ClipItem({
  clip,
  media,
  zoom,
  isSelected,
  onSelect,
  onDelete,
  onDurationChange,
  onPositionChange,
}: {
  clip: TimelineClip;
  media: MediaItem | undefined;
  zoom: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDurationChange: (newDuration: number) => void;
  onPositionChange: (newStartTime: number) => void;
}) {
  const resizeRef = useRef<{ startX: number; startDuration: number } | null>(
    null
  );
  const dragRef = useRef<{ startX: number; startTime: number } | null>(null);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    resizeRef.current = {
      startX: e.clientX,
      startDuration: clip.duration,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizeRef.current) return;
      const diff = moveEvent.clientX - resizeRef.current.startX;
      const timeDiff = pixelsToTime(diff, zoom);
      const newDuration = Math.max(0.5, resizeRef.current.startDuration + timeDiff);
      onDurationChange(newDuration);
    };

    const handleMouseUp = () => {
      resizeRef.current = null;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // 클립 드래그로 위치 이동
  const handleDragStart = (e: React.MouseEvent) => {
    // 리사이즈 핸들 영역에서는 드래그 시작 안함
    const target = e.target as HTMLElement;
    if (target.classList.contains("resize-handle")) return;

    e.stopPropagation();
    onSelect();

    dragRef.current = {
      startX: e.clientX,
      startTime: clip.startTime,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragRef.current) return;
      const diff = moveEvent.clientX - dragRef.current.startX;
      const timeDiff = pixelsToTime(diff, zoom);
      const newStartTime = Math.max(0, dragRef.current.startTime + timeDiff);
      onPositionChange(newStartTime);
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const left = timeToPixels(clip.startTime, zoom);
  const width = timeToPixels(clip.duration, zoom);

  const getClipColor = () => {
    if (!media) return "bg-slate-600";
    switch (media.type) {
      case "image":
        return "bg-purple-600/80";
      case "video":
        return "bg-blue-600/80";
      case "audio":
        return "bg-green-600/80";
      default:
        return "bg-slate-600";
    }
  };

  return (
    <div
      className={`absolute top-1 bottom-1 rounded cursor-grab active:cursor-grabbing transition-all ${getClipColor()} ${
        isSelected ? "ring-2 ring-teal-400" : ""
      }`}
      style={{ left: `${left}px`, width: `${width}px`, minWidth: "20px" }}
      onMouseDown={handleDragStart}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {/* 클립 내용 */}
      <div className="h-full px-2 flex items-center overflow-hidden">
        <span className="text-xs text-white truncate">
          {media?.name || "Unknown"}
        </span>
      </div>

      {/* 리사이즈 핸들 (우측) */}
      <div
        className="resize-handle absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20"
        onMouseDown={handleResizeStart}
      />

      {/* 삭제 버튼 */}
      {isSelected && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600"
        >
          ×
        </button>
      )}
    </div>
  );
}

// 트랙 컴포넌트
function TrackRow({
  track,
  mediaItems,
  timeline,
  zoom,
  selectedClipId,
  onAddMultipleClips,
  onSelectClip,
  onDeleteClip,
  onUpdateClip,
}: {
  track: TimelineState["tracks"][0];
  mediaItems: MediaItem[];
  timeline: TimelineState;
  zoom: number;
  selectedClipId: string | null;
  onAddMultipleClips: (
    trackId: string,
    clips: Array<{ mediaId: string; startTime: number }>
  ) => void;
  onSelectClip: (clipId: string | null) => void;
  onDeleteClip: (trackId: string, clipId: string) => void;
  onUpdateClip: (
    trackId: string,
    clipId: string,
    updates: Partial<TimelineClip>
  ) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: DRAG_TYPES.MEDIA_THUMBNAIL,
      drop: (item: DragItem, monitor) => {
        const offset = monitor.getClientOffset();
        if (!offset || !trackRef.current) return;

        const rect = trackRef.current.getBoundingClientRect();
        const x = offset.x - rect.left;
        const baseStartTime = pixelsToTime(x, zoom);

        // 선택된 모든 미디어 ID 가져오기
        // selectedMediaIds가 있으면 선택된 모든 미디어 사용, 없으면 드래그한 미디어만
        const mediaIdsToAdd = item.selectedMediaIds && item.selectedMediaIds.length > 0
          ? item.selectedMediaIds
          : item.mediaId
          ? [item.mediaId]
          : [];

        // 기존 클립의 마지막 끝 시간 찾기
        const existingClips = track.clips;
        const lastClipEnd = existingClips.length > 0
          ? Math.max(...existingClips.map(clip => clip.startTime + clip.duration))
          : 0;

        // 드롭 위치와 기존 클립의 끝 시간 중 더 큰 값 사용
        let currentStartTime = Math.max(0, Math.max(baseStartTime, lastClipEnd));
        const clipsToAdd: Array<{ mediaId: string; startTime: number }> = [];

        // 추가할 클립들을 먼저 수집 (순차적으로 배치)
        mediaIdsToAdd.forEach((mediaId) => {
          const media = mediaItems.find((m) => m.id === mediaId);
          if (!media) return;

          // 비디오 트랙에는 이미지/비디오만, 오디오 트랙에는 오디오만
          if (track.type === "video" && media.type === "audio") {
            return; // 비디오 트랙에 오디오 드롭 불가
          }
          if (track.type === "audio" && media.type !== "audio") {
            return; // 오디오 트랙에 비디오/이미지 드롭 불가
          }

          clipsToAdd.push({
            mediaId,
            startTime: currentStartTime,
          });

          // 다음 미디어는 현재 미디어의 끝 시간에 배치
          currentStartTime += media.duration;
        });

        // 모든 클립을 한 번에 추가
        if (clipsToAdd.length > 0) {
          onAddMultipleClips(track.id, clipsToAdd);
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    }),
    [track, mediaItems, zoom, onAddMultipleClips]
  );

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      (trackRef as React.MutableRefObject<HTMLDivElement | null>).current =
        node;
      drop(node);
    },
    [drop]
  );

  const trackWidth = timeToPixels(Math.max(timeline.totalDuration + 10, 30), zoom);

  return (
    <div className="flex border-b border-slate-700/50">
      {/* 트랙 라벨 */}
      <div className="w-20 flex-shrink-0 px-2 py-2 bg-slate-800/50 border-r border-slate-700/50">
        <div className="text-xs text-slate-300 font-medium">{track.name}</div>
        <div className="flex items-center gap-1 mt-1">
          <button
            className={`text-[10px] ${track.muted ? "text-red-400" : "text-slate-400"}`}
          >
            {track.type === "video" ? "V" : "A"}
          </button>
        </div>
      </div>

      {/* 트랙 콘텐츠 */}
      <div
        ref={setRefs}
        className={`relative flex-1 h-12 overflow-hidden ${
          isOver ? "bg-teal-500/10" : ""
        }`}
        style={{ width: `${trackWidth}px` }}
        onClick={() => onSelectClip(null)}
      >
        {track.clips.map((clip) => (
          <ClipItem
            key={clip.id}
            clip={clip}
            media={mediaItems.find((m) => m.id === clip.mediaId)}
            zoom={zoom}
            isSelected={selectedClipId === clip.id}
            onSelect={() => onSelectClip(clip.id)}
            onDelete={() => onDeleteClip(track.id, clip.id)}
            onDurationChange={(newDuration) =>
              onUpdateClip(track.id, clip.id, { duration: newDuration })
            }
            onPositionChange={(newStartTime) =>
              onUpdateClip(track.id, clip.id, { startTime: newStartTime })
            }
          />
        ))}
      </div>
    </div>
  );
}

export default function Timeline({
  mediaItems,
  timeline,
  playback,
  selection,
  onTimelineUpdate,
  onPlaybackUpdate,
  onSelectionUpdate,
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 총 지속시간 계산
  const totalDuration = useMemo(() => {
    let maxEnd = 0;
    timeline.tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        const end = clip.startTime + clip.duration;
        if (end > maxEnd) maxEnd = end;
      });
    });
    return maxEnd;
  }, [timeline.tracks]);

  // 여러 클립을 한 번에 추가
  const handleAddMultipleClips = useCallback(
    (trackId: string, clips: Array<{ mediaId: string; startTime: number }>) => {
      const newClips: TimelineClip[] = [];
      let maxEndTime = totalDuration;
      const baseTimestamp = Date.now();

      clips.forEach(({ mediaId, startTime }, index) => {
        const media = mediaItems.find((m) => m.id === mediaId);
        if (!media) return;

        // 고유한 ID 생성 (타임스탬프 + 인덱스 + 랜덤)
        const uniqueId = `clip-${baseTimestamp}-${index}-${Math.random().toString(36).substr(2, 9)}`;

        const newClip: TimelineClip = {
          id: uniqueId,
          mediaId,
          trackId,
          startTime,
          duration: media.duration,
          trimStart: 0,
          trimEnd: media.duration,
        };

        newClips.push(newClip);
        maxEndTime = Math.max(maxEndTime, startTime + media.duration);
      });

      if (newClips.length === 0) return;

      // 기존 클립과 겹치지 않도록 확인하고 조정
      const targetTrack = timeline.tracks.find((t) => t.id === trackId);
      if (targetTrack) {
        // 모든 기존 클립을 시간순으로 정렬
        const sortedExistingClips = [...targetTrack.clips].sort(
          (a, b) => a.startTime - b.startTime
        );

        // 각 새 클립을 순차적으로 배치하면서 겹침 확인
        newClips.forEach((newClip, index) => {
          if (index === 0) {
            // 첫 번째 클립은 기존 클립과 겹치는지 확인
            const overlappingClip = sortedExistingClips.find(
              (existingClip) =>
                (newClip.startTime >= existingClip.startTime &&
                  newClip.startTime < existingClip.startTime + existingClip.duration) ||
                (existingClip.startTime >= newClip.startTime &&
                  existingClip.startTime < newClip.startTime + newClip.duration)
            );

            if (overlappingClip) {
              // 겹치면 기존 클립의 끝 시간에 배치
              newClip.startTime = overlappingClip.startTime + overlappingClip.duration;
            }
          } else {
            // 이후 클립들은 이전 새 클립의 끝 시간에 배치
            const prevClip = newClips[index - 1];
            newClip.startTime = prevClip.startTime + prevClip.duration;

            // 여전히 기존 클립과 겹치는지 확인
            const overlappingClip = sortedExistingClips.find(
              (existingClip) =>
                (newClip.startTime >= existingClip.startTime &&
                  newClip.startTime < existingClip.startTime + existingClip.duration) ||
                (existingClip.startTime >= newClip.startTime &&
                  existingClip.startTime < newClip.startTime + newClip.duration)
            );

            if (overlappingClip) {
              // 겹치면 기존 클립의 끝 시간에 배치
              newClip.startTime = overlappingClip.startTime + overlappingClip.duration;
            }
          }
        });

        // 최종 정렬
        newClips.sort((a, b) => a.startTime - b.startTime);
      }

      onTimelineUpdate({
        ...timeline,
        tracks: timeline.tracks.map((track) =>
          track.id === trackId
            ? {
                ...track,
                clips: [...track.clips, ...newClips].sort(
                  (a, b) => a.startTime - b.startTime
                ),
              }
            : track
        ),
        totalDuration: maxEndTime,
      });
    },
    [mediaItems, timeline, totalDuration, onTimelineUpdate]
  );

  // 클립 선택
  const handleSelectClip = useCallback(
    (clipId: string | null) => {
      onSelectionUpdate({
        ...selection,
        selectedClipId: clipId,
      });
    },
    [selection, onSelectionUpdate]
  );

  // 클립 삭제
  const handleDeleteClip = useCallback(
    (trackId: string, clipId: string) => {
      onTimelineUpdate({
        ...timeline,
        tracks: timeline.tracks.map((track) =>
          track.id === trackId
            ? {
                ...track,
                clips: track.clips.filter((clip) => clip.id !== clipId),
              }
            : track
        ),
      });
      if (selection.selectedClipId === clipId) {
        onSelectionUpdate({ ...selection, selectedClipId: null });
      }
    },
    [timeline, selection, onTimelineUpdate, onSelectionUpdate]
  );

  // 클립 업데이트
  const handleUpdateClip = useCallback(
    (trackId: string, clipId: string, updates: Partial<TimelineClip>) => {
      onTimelineUpdate({
        ...timeline,
        tracks: timeline.tracks.map((track) =>
          track.id === trackId
            ? {
                ...track,
                clips: track.clips.map((clip) =>
                  clip.id === clipId ? { ...clip, ...updates } : clip
                ),
              }
            : track
        ),
      });
    },
    [timeline, onTimelineUpdate]
  );

  // 타임라인 클릭으로 재생 위치 변경
  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left + (containerRef.current?.scrollLeft || 0);
      const time = pixelsToTime(x - 80, timeline.zoom); // 80은 트랙 라벨 너비
      onPlaybackUpdate({
        ...playback,
        currentTime: Math.max(0, time),
      });
    },
    [timeline.zoom, playback, onPlaybackUpdate]
  );

  // 재생헤드 위치
  const playheadPosition = timeToPixels(playback.currentTime, timeline.zoom);

  return (
    <div className="h-full flex flex-col">
      {/* 컨트롤 바 */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-slate-700/50">
        {/* 재생 컨트롤 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              onPlaybackUpdate({ ...playback, currentTime: 0 })
            }
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>
          <button
            onClick={() =>
              onPlaybackUpdate({ ...playback, isPlaying: !playback.isPlaying })
            }
            className="p-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded-full transition-colors"
          >
            {playback.isPlaying ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>

        {/* 현재 시간 표시 */}
        <div className="text-sm text-slate-300 font-mono">
          {formatTime(playback.currentTime)} / {formatTime(totalDuration || 0)}
        </div>

        {/* 줌 컨트롤 */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-slate-400">줌:</span>
          <input
            type="range"
            min="0.25"
            max="2"
            step="0.25"
            value={timeline.zoom}
            onChange={(e) =>
              onTimelineUpdate({
                ...timeline,
                zoom: parseFloat(e.target.value),
              })
            }
            className="w-20 accent-teal-500"
          />
          <span className="text-xs text-slate-400 w-8">
            {timeline.zoom.toFixed(2)}x
          </span>
        </div>
      </div>

      {/* 타임라인 영역 */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto"
        onClick={handleTimelineClick}
      >
        <div className="relative min-w-full">
          {/* 트랙 라벨 공간 */}
          <div className="sticky left-0 top-0 z-10 w-20 bg-slate-800" />

          {/* 타임 눈금자 */}
          <div className="flex">
            <div className="w-20 flex-shrink-0 bg-slate-800/50 border-r border-slate-700/50" />
            <TimeRuler
              duration={totalDuration}
              zoom={timeline.zoom}
              scrollPosition={0}
            />
          </div>

          {/* 트랙들 */}
          {timeline.tracks.map((track) => (
            <TrackRow
              key={track.id}
              track={track}
              mediaItems={mediaItems}
              timeline={timeline}
              zoom={timeline.zoom}
              selectedClipId={selection.selectedClipId}
              onAddMultipleClips={handleAddMultipleClips}
              onSelectClip={handleSelectClip}
              onDeleteClip={handleDeleteClip}
              onUpdateClip={handleUpdateClip}
            />
          ))}

          {/* 재생헤드 */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-20"
            style={{ left: `${80 + playheadPosition}px` }}
          >
            <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
