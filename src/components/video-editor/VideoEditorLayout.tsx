"use client";

import MediaLibrary from "@/components/video-editor/MediaLibrary";
import PreviewPlayer from "@/components/video-editor/PreviewPlayer";
import PropertyPanel from "@/components/video-editor/PropertyPanel";
import Timeline from "@/components/video-editor/Timeline";
import {
  AspectRatio,
  MediaItem,
  PlaybackState,
  SelectionState,
  TimelineClip,
  TimelineState,
} from "@/types/video-editor.types";
import { useCallback, useEffect, useRef, useState } from "react";
import SidebarPanel from "./SidebarPanel";
import VideoEditorHeader from "./VideoEditorHeader";

interface VideoEditorLayoutProps {
  // 상태
  mediaItems: MediaItem[];
  selectedMediaIds: Set<string>;
  aspectRatio: AspectRatio;
  timeline: TimelineState;
  playback: PlaybackState;
  selection: SelectionState;
  isLeftSidebarOpen: boolean;
  isRightSidebarOpen: boolean;
  selectedClip: TimelineClip | null;
  selectedMedia: MediaItem | undefined;

  // 액션
  onAspectRatioChange: (ratio: AspectRatio) => void;
  onLeftSidebarToggle: () => void;
  onRightSidebarToggle: () => void;
  onAddMedia: (media: MediaItem) => void;
  onRemoveMedia: (mediaId: string) => void;
  onRemoveMultipleMedia: (mediaIds: string[]) => void;
  onSelectMedia: (
    mediaId: string,
    options?: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean },
  ) => void;
  onSelectAll: () => void;
  onAddToTimeline: () => void;
  onTimelineUpdate: (timeline: TimelineState) => void;
  onPlaybackUpdate: (playback: PlaybackState) => void;
  onSelectionUpdate: (selection: SelectionState) => void;
}

export default function VideoEditorLayout({
  mediaItems,
  selectedMediaIds,
  aspectRatio,
  timeline,
  playback,
  selection,
  isLeftSidebarOpen,
  isRightSidebarOpen,
  selectedClip,
  selectedMedia,
  onAspectRatioChange,
  onLeftSidebarToggle,
  onRightSidebarToggle,
  onAddMedia,
  onRemoveMedia,
  onRemoveMultipleMedia,
  onSelectMedia,
  onSelectAll,
  onAddToTimeline,
  onTimelineUpdate,
  onPlaybackUpdate,
  onSelectionUpdate,
}: VideoEditorLayoutProps) {
  const exportFunctionsRef = useRef<{
    exportStandard: () => Promise<void>;
    exportFast: () => Promise<void>;
  } | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // PreviewPlayer에서 export 함수들 받기
  const handleExportReady = useCallback(
    (exportFns: { exportStandard: () => Promise<void>; exportFast: () => Promise<void> }) => {
      exportFunctionsRef.current = exportFns;
    },
    []
  );

  // 일반 내보내기 (브라우저 렌더링 → MP4 변환)
  const handleExportStandard = useCallback(async () => {
    if (!exportFunctionsRef.current) {
      alert("비디오를 내보낼 수 없습니다. 타임라인에 클립이 있는지 확인하세요.");
      return;
    }

    setIsExporting(true);
    try {
      await exportFunctionsRef.current.exportStandard();
    } catch (error) {
      console.error("Export error:", error);
      alert("비디오 내보내기 중 오류가 발생했습니다.");
    } finally {
      setIsExporting(false);
    }
  }, []);

  // 빠른 내보내기 (FFmpeg 직접 렌더링)
  const handleExportFast = useCallback(async () => {
    if (!exportFunctionsRef.current) {
      alert("비디오를 내보낼 수 없습니다. 타임라인에 클립이 있는지 확인하세요.");
      return;
    }

    setIsExporting(true);
    try {
      await exportFunctionsRef.current.exportFast();
    } catch (error) {
      console.error("Export error:", error);
      alert("비디오 내보내기 중 오류가 발생했습니다.");
    } finally {
      setIsExporting(false);
    }
  }, []);

  // 선택된 클립 삭제 핸들러 (다중 선택 지원)
  const handleDeleteSelectedClip = useCallback(() => {
    // 선택된 모든 클립 ID 수집
    const clipsToDelete = new Set<string>();
    if (selection.selectedClipId) {
      clipsToDelete.add(selection.selectedClipId);
    }
    selection.selectedClipIds.forEach((id) => clipsToDelete.add(id));

    if (clipsToDelete.size === 0) return;

    const updatedTracks = timeline.tracks.map((track) => ({
      ...track,
      clips: track.clips.filter((clip) => !clipsToDelete.has(clip.id)),
    }));

    // 삭제 후 총 지속시간 재계산
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

    onSelectionUpdate({
      ...selection,
      selectedClipId: null,
      selectedClipIds: new Set(),
    });
  }, [timeline, selection, onTimelineUpdate, onSelectionUpdate]);

  // 전역 키보드 단축키 처리
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에 포커스가 있으면 단축키 무시
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Backspace: 선택된 미디어 제거
      if (e.key === "Backspace" && selectedMediaIds.size > 0) {
        e.preventDefault();
        // 선택된 미디어 ID를 배열로 변환하여 한 번에 제거
        const mediaIdsToRemove = Array.from(selectedMediaIds);
        onRemoveMultipleMedia(mediaIdsToRemove);
        return;
      }

      // Delete: 선택된 클립 삭제 (다중 선택 지원)
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        (selection.selectedClipId || selection.selectedClipIds.size > 0)
      ) {
        e.preventDefault();
        handleDeleteSelectedClip();
        return;
      }

      // Space: 재생/정지
      if (e.key === " " && target.tagName !== "BUTTON") {
        e.preventDefault();
        onPlaybackUpdate({
          ...playback,
          isPlaying: !playback.isPlaying,
        });
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedMediaIds,
    selection.selectedClipId,
    playback,
    onRemoveMedia,
    handleDeleteSelectedClip,
    onPlaybackUpdate,
  ]);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] -mx-6 -mt-6">
      {/* 헤더 */}
      <VideoEditorHeader
        aspectRatio={aspectRatio}
        isLeftSidebarOpen={isLeftSidebarOpen}
        isRightSidebarOpen={isRightSidebarOpen}
        onAspectRatioChange={onAspectRatioChange}
        onLeftSidebarToggle={onLeftSidebarToggle}
        onRightSidebarToggle={onRightSidebarToggle}
        onExportStandard={handleExportStandard}
        onExportFast={handleExportFast}
        isExporting={isExporting}
      />

      {/* 메인 컨텐츠 영역 (3단 레이아웃) */}
      <div className="flex flex-1 overflow-hidden">
        {/* 좌측: 미디어 라이브러리 */}
        <SidebarPanel isOpen={isLeftSidebarOpen} position="left">
          <MediaLibrary
            mediaItems={mediaItems}
            selectedMediaIds={selectedMediaIds}
            onAddMedia={onAddMedia}
            onRemoveMedia={onRemoveMedia}
            onSelectMedia={onSelectMedia}
            onSelectAll={onSelectAll}
            onAddToTimeline={onAddToTimeline}
          />
        </SidebarPanel>

        {/* 중앙: 미리보기 영역 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-4 flex items-center justify-center bg-slate-900/50">
            <PreviewPlayer
              mediaItems={mediaItems}
              timeline={timeline}
              playback={playback}
              aspectRatio={aspectRatio}
              onPlaybackUpdate={onPlaybackUpdate}
              onExportReady={handleExportReady}
            />
          </div>
        </div>

        {/* 우측: 속성 패널 */}
        <SidebarPanel isOpen={isRightSidebarOpen} position="right">
          <PropertyPanel
            selectedClip={selectedClip}
            selectedMedia={selectedMedia}
            timeline={timeline}
            selection={selection}
            onTimelineUpdate={onTimelineUpdate}
            onSelectionUpdate={onSelectionUpdate}
          />
        </SidebarPanel>
      </div>

      {/* 하단: 타임라인 */}
      <div className="h-48 border-t border-slate-700/50 bg-slate-800/50">
        <Timeline
          mediaItems={mediaItems}
          timeline={timeline}
          playback={playback}
          selection={selection}
          onTimelineUpdate={onTimelineUpdate}
          onPlaybackUpdate={onPlaybackUpdate}
          onSelectionUpdate={onSelectionUpdate}
        />
      </div>
    </div>
  );
}
