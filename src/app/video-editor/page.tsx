"use client";

import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import VideoEditorLayout from "../../components/video-editor/VideoEditorLayout";
import { useVideoEditor } from "../../hooks/useVideoEditor";

export default function VideoEditorPage() {
  const {
    // 상태
    mediaItems,
    aspectRatio,
    timeline,
    playback,
    selection,
    selectedMediaIds,
    isLeftSidebarOpen,
    isRightSidebarOpen,
    selectedClip,
    selectedMedia,

    // 액션
    setAspectRatio,
    setIsLeftSidebarOpen,
    setIsRightSidebarOpen,
    handleAddMedia,
    handleRemoveMedia,
    handleSelectMedia,
    handleSelectAll,
    handleAddToTimeline,
    handleTimelineUpdate,
    handlePlaybackUpdate,
    handleSelectionUpdate,
  } = useVideoEditor();

  return (
    <DndProvider backend={HTML5Backend}>
      <VideoEditorLayout
        mediaItems={mediaItems}
        selectedMediaIds={selectedMediaIds}
        aspectRatio={aspectRatio}
        timeline={timeline}
        playback={playback}
        selection={selection}
        isLeftSidebarOpen={isLeftSidebarOpen}
        isRightSidebarOpen={isRightSidebarOpen}
        selectedClip={selectedClip}
        selectedMedia={selectedMedia}
        onAspectRatioChange={setAspectRatio}
        onLeftSidebarToggle={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
        onRightSidebarToggle={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
        onAddMedia={handleAddMedia}
        onRemoveMedia={handleRemoveMedia}
        onSelectMedia={handleSelectMedia}
        onSelectAll={handleSelectAll}
        onAddToTimeline={handleAddToTimeline}
        onTimelineUpdate={handleTimelineUpdate}
        onPlaybackUpdate={handlePlaybackUpdate}
        onSelectionUpdate={handleSelectionUpdate}
      />
    </DndProvider>
  );
}
