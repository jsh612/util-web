"use client";

import { MediaItem, TimelineState, PlaybackState, SelectionState, AspectRatio, TimelineClip } from "@/types/video-editor.types";
import MediaLibrary from "@/components/video-editor/MediaLibrary";
import PreviewPlayer from "@/components/video-editor/PreviewPlayer";
import Timeline from "@/components/video-editor/Timeline";
import PropertyPanel from "@/components/video-editor/PropertyPanel";
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
  onSelectMedia: (
    mediaId: string,
    options?: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean }
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
  onSelectMedia,
  onSelectAll,
  onAddToTimeline,
  onTimelineUpdate,
  onPlaybackUpdate,
  onSelectionUpdate,
}: VideoEditorLayoutProps) {
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
            />
          </div>
        </div>

        {/* 우측: 속성 패널 */}
        <SidebarPanel isOpen={isRightSidebarOpen} position="right">
          <PropertyPanel
            selectedClip={selectedClip}
            selectedMedia={selectedMedia}
            timeline={timeline}
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
