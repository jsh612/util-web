"use client";

import { useState, useCallback } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  MediaItem,
  TimelineState,
  PlaybackState,
  SelectionState,
  AspectRatio,
  ASPECT_RATIO_CONFIG,
  TimelineClip,
} from "@/types/video-editor.types";
import MediaLibrary from "@/components/video-editor/MediaLibrary";
import PreviewPlayer from "@/components/video-editor/PreviewPlayer";
import Timeline from "@/components/video-editor/Timeline";
import PropertyPanel from "@/components/video-editor/PropertyPanel";
import SidebarToggle from "@/components/common/SidebarToggle";

export default function VideoEditorPage() {
  // 미디어 라이브러리
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);

  // 영상 비율
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");

  // 타임라인
  const [timeline, setTimeline] = useState<TimelineState>({
    tracks: [
      {
        id: "video-1",
        type: "video",
        name: "비디오",
        clips: [],
        muted: false,
        locked: false,
      },
      {
        id: "audio-1",
        type: "audio",
        name: "오디오",
        clips: [],
        muted: false,
        locked: false,
      },
    ],
    totalDuration: 0,
    zoom: 1,
    scrollPosition: 0,
  });

  // 재생 상태
  const [playback, setPlayback] = useState<PlaybackState>({
    isPlaying: false,
    currentTime: 0,
    volume: 1,
  });

  // 선택 상태
  const [selection, setSelection] = useState<SelectionState>({
    selectedClipId: null,
    selectedTrackId: null,
  });

  // 선택된 미디어 (라이브러리에서 선택) - 복수 선택 지원
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  // 사이드바 토글 상태
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  // 미디어 추가 핸들러
  const handleAddMedia = useCallback((newMedia: MediaItem) => {
    setMediaItems((prev) => [...prev, newMedia]);
  }, []);

  // 미디어 삭제 핸들러
  const handleRemoveMedia = useCallback((mediaId: string) => {
    setMediaItems((prev) => prev.filter((item) => item.id !== mediaId));
    // 타임라인에서 해당 미디어를 사용하는 클립도 삭제
    setTimeline((prev) => ({
      ...prev,
      tracks: prev.tracks.map((track) => ({
        ...track,
        clips: track.clips.filter((clip) => clip.mediaId !== mediaId),
      })),
    }));
    // 선택된 미디어가 삭제되면 선택 해제
    setSelectedMediaIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(mediaId);
      return newSet;
    });
  }, []);

  // 미디어 선택 핸들러 (복수 선택 지원)
  const handleSelectMedia = useCallback(
    (
      mediaId: string,
      options?: {
        shiftKey?: boolean;
        ctrlKey?: boolean;
        metaKey?: boolean;
      }
    ) => {
      const { shiftKey = false, ctrlKey = false, metaKey = false } = options || {};

      if (shiftKey && lastSelectedIndex !== null) {
        // Shift 키: 범위 선택
        const currentIndex = mediaItems.findIndex((m) => m.id === mediaId);
        const start = Math.min(lastSelectedIndex, currentIndex);
        const end = Math.max(lastSelectedIndex, currentIndex);
        const rangeIds = mediaItems.slice(start, end + 1).map((m) => m.id);

        setSelectedMediaIds((prev) => {
          const newSet = new Set(prev);
          rangeIds.forEach((id) => newSet.add(id));
          return newSet;
        });
        setLastSelectedIndex(currentIndex);
      } else if (ctrlKey || metaKey) {
        // Ctrl/Cmd 키: 개별 선택/해제
        setSelectedMediaIds((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(mediaId)) {
            newSet.delete(mediaId);
          } else {
            newSet.add(mediaId);
          }
          return newSet;
        });
        const currentIndex = mediaItems.findIndex((m) => m.id === mediaId);
        setLastSelectedIndex(currentIndex);
      } else {
        // 단일 선택
        setSelectedMediaIds(new Set([mediaId]));
        const currentIndex = mediaItems.findIndex((m) => m.id === mediaId);
        setLastSelectedIndex(currentIndex);
      }
    },
    [mediaItems, lastSelectedIndex]
  );

  // 전체 선택/해제 핸들러
  const handleSelectAll = useCallback(() => {
    if (selectedMediaIds.size === mediaItems.length) {
      // 모두 선택되어 있으면 모두 해제
      setSelectedMediaIds(new Set());
      setLastSelectedIndex(null);
    } else {
      // 모두 선택
      const allIds = new Set(mediaItems.map((m) => m.id));
      setSelectedMediaIds(allIds);
      setLastSelectedIndex(mediaItems.length - 1);
    }
  }, [mediaItems, selectedMediaIds.size]);

  // 선택된 미디어를 타임라인에 추가 (복수 선택 지원)
  const handleAddToTimeline = useCallback(() => {
    if (selectedMediaIds.size === 0) return;

    const selectedMedia = mediaItems.filter((m) => selectedMediaIds.has(m.id));
    if (selectedMedia.length === 0) return;

    // 트랙별로 미디어 그룹화
    const mediaByTrack: Record<string, MediaItem[]> = {
      "video-1": [],
      "audio-1": [],
    };

    selectedMedia.forEach((media) => {
      const targetTrackId = media.type === "audio" ? "audio-1" : "video-1";
      mediaByTrack[targetTrackId].push(media);
    });

    // 각 트랙별로 클립 생성 및 배치
    const newClipsByTrack: Record<string, TimelineClip[]> = {};
    let maxEndTime = timeline.totalDuration;
    const baseTimestamp = Date.now();

    Object.entries(mediaByTrack).forEach(([trackId, medias]) => {
      if (medias.length === 0) return;

      const targetTrack = timeline.tracks.find((t) => t.id === trackId);
      if (!targetTrack) return;

      // 기존 클립의 마지막 끝 시간 찾기
      const lastClipEnd = targetTrack.clips.reduce(
        (max, clip) => Math.max(max, clip.startTime + clip.duration),
        0
      );

      let currentStartTime = lastClipEnd;
      const newClips: TimelineClip[] = [];

      // 각 미디어를 순차적으로 배치
      medias.forEach((media, index) => {
        const newClip: TimelineClip = {
          id: `clip-${baseTimestamp}-${trackId}-${index}-${Math.random().toString(36).substr(2, 9)}`,
          mediaId: media.id,
          trackId,
          startTime: currentStartTime,
          duration: media.duration,
          trimStart: 0,
          trimEnd: media.duration,
        };

        newClips.push(newClip);
        currentStartTime += media.duration;
        maxEndTime = Math.max(maxEndTime, currentStartTime);
      });

      newClipsByTrack[trackId] = newClips;
    });

    // 모든 클립을 한 번에 타임라인에 추가
    setTimeline((prev) => ({
      ...prev,
      tracks: prev.tracks.map((track) => {
        const newClips = newClipsByTrack[track.id];
        if (!newClips || newClips.length === 0) return track;

        return {
          ...track,
          clips: [...track.clips, ...newClips].sort(
            (a, b) => a.startTime - b.startTime
          ),
        };
      }),
      totalDuration: maxEndTime,
    }));
  }, [selectedMediaIds, mediaItems, timeline.tracks, timeline.totalDuration]);

  // 타임라인 업데이트
  const handleTimelineUpdate = useCallback((newTimeline: TimelineState) => {
    setTimeline(newTimeline);
  }, []);

  // 재생 상태 업데이트
  const handlePlaybackUpdate = useCallback((newPlayback: PlaybackState) => {
    setPlayback(newPlayback);
  }, []);

  // 선택 상태 업데이트
  const handleSelectionUpdate = useCallback((newSelection: SelectionState) => {
    setSelection(newSelection);
  }, []);

  // 선택된 클립 찾기
  const selectedClip = selection.selectedClipId
    ? timeline.tracks
        .flatMap((track) => track.clips)
        .find((clip) => clip.id === selection.selectedClipId) ?? null
    : null;

  // 선택된 클립의 미디어 아이템 찾기
  const selectedMedia = selectedClip
    ? mediaItems.find((item) => item.id === selectedClip.mediaId)
    : undefined;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-[calc(100vh-80px)] -mx-6 -mt-6">
        {/* 헤더 */}
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
              onToggle={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
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
              onToggle={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
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
              onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
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

        {/* 메인 컨텐츠 영역 (3단 레이아웃) */}
        <div className="flex flex-1 overflow-hidden">
          {/* 좌측: 미디어 라이브러리 */}
          <div
            className={`${
              isLeftSidebarOpen ? "w-64" : "w-0"
            } transition-all duration-300 ease-in-out border-r border-slate-700/50 overflow-hidden bg-slate-800/30`}
          >
            <div
              className={`h-full overflow-y-auto ${
                isLeftSidebarOpen ? "opacity-100" : "opacity-0"
              } transition-opacity duration-300`}
            >
              <MediaLibrary
                mediaItems={mediaItems}
                selectedMediaIds={selectedMediaIds}
                onAddMedia={handleAddMedia}
                onRemoveMedia={handleRemoveMedia}
                onSelectMedia={handleSelectMedia}
                onSelectAll={handleSelectAll}
                onAddToTimeline={handleAddToTimeline}
              />
            </div>
          </div>

          {/* 중앙: 미리보기 영역 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 p-4 flex items-center justify-center bg-slate-900/50">
              <PreviewPlayer
                mediaItems={mediaItems}
                timeline={timeline}
                playback={playback}
                aspectRatio={aspectRatio}
                onPlaybackUpdate={handlePlaybackUpdate}
              />
            </div>
          </div>

          {/* 우측: 속성 패널 */}
          <div
            className={`${
              isRightSidebarOpen ? "w-72" : "w-0"
            } transition-all duration-300 ease-in-out border-l border-slate-700/50 overflow-hidden bg-slate-800/30`}
          >
            <div
              className={`h-full overflow-y-auto ${
                isRightSidebarOpen ? "opacity-100" : "opacity-0"
              } transition-opacity duration-300`}
            >
              <PropertyPanel
                selectedClip={selectedClip}
                selectedMedia={selectedMedia}
                timeline={timeline}
                onTimelineUpdate={handleTimelineUpdate}
                onSelectionUpdate={handleSelectionUpdate}
              />
            </div>
          </div>
        </div>

        {/* 하단: 타임라인 */}
        <div className="h-48 border-t border-slate-700/50 bg-slate-800/50">
          <Timeline
            mediaItems={mediaItems}
            timeline={timeline}
            playback={playback}
            selection={selection}
            onTimelineUpdate={handleTimelineUpdate}
            onPlaybackUpdate={handlePlaybackUpdate}
            onSelectionUpdate={handleSelectionUpdate}
          />
        </div>
      </div>
    </DndProvider>
  );
}
