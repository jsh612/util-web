"use client";

import {
  DRAG_TYPES,
  DragItem,
  MediaItem,
  PIXELS_PER_SECOND,
  PlaybackState,
  SelectionState,
  TimelineClip,
  TimelineState,
} from "@/types/video-editor.types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDrop } from "react-dnd";

interface TimelineProps {
  mediaItems: MediaItem[];
  timeline: TimelineState;
  playback: PlaybackState;
  selection: SelectionState;
  onTimelineUpdate: (timeline: TimelineState) => void;
  onPlaybackUpdate: (playback: PlaybackState) => void;
  onSelectionUpdate: (selection: SelectionState) => void;
}

// 자석 모드 활성화 거리 (픽셀)
const MAGNETIC_SNAP_PX = 12;

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
  containerWidth,
}: {
  duration: number;
  zoom: number;
  scrollPosition: number;
  containerWidth: number;
}) {
  // duration이 0이면 최소 10초 표시, 그 외에는 미디어 시간 + 여유 공간(10초)
  const displayDuration = duration > 0 ? duration + 10 : 10;

  // 타임라인 너비: 미디어가 있으면 그 시간에 맞춰, 없으면 최소 10초
  const timelineWidth =
    duration > 0 ? timeToPixels(duration + 10, zoom) : timeToPixels(10, zoom);

  // 가시 영역 계산 (스크롤 위치 기준)
  const visibleStart = pixelsToTime(scrollPosition, zoom);
  const visibleEnd = pixelsToTime(scrollPosition + containerWidth, zoom);

  // 간격 계산 (줌 레벨에 따라)
  const interval = zoom >= 1 ? 1 : zoom >= 0.5 ? 2 : 5;

  // 가시 영역 내의 시간 표시만 생성 (성능 최적화)
  const marks = [];
  const startTime = Math.max(
    0,
    Math.floor(visibleStart / interval) * interval - interval,
  );
  const endTime = Math.min(
    displayDuration,
    Math.ceil(visibleEnd / interval) * interval + interval,
  );

  for (let t = startTime; t <= endTime; t += interval) {
    const left = timeToPixels(t, zoom);
    marks.push(
      <div
        key={t}
        className="absolute top-0 h-full flex flex-col items-center pointer-events-none"
        style={{ left: `${left}px` }}
      >
        <div className="h-2 w-px bg-slate-500" />
        <span className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
          {formatTime(t)}
        </span>
      </div>,
    );
  }

  return (
    <div
      className="relative h-6 bg-slate-800/50 border-b border-slate-700/50"
      style={{
        width: `${timelineWidth}px`,
        minWidth: `${timelineWidth}px`,
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
  isMultiSelected,
  otherClips,
  selectedClips,
  onSelect,
  onDelete,
  onDurationChange,
  onPositionChange,
  onUpdateMultipleClips,
  onMaintainSelection,
  onDragStateChange,
}: {
  clip: TimelineClip;
  media: MediaItem | undefined;
  zoom: number;
  isSelected: boolean;
  isMultiSelected: boolean;
  otherClips: TimelineClip[];
  selectedClips: TimelineClip[];
  onSelect: (e: React.MouseEvent) => void;
  onDelete: () => void;
  onDurationChange: (newDuration: number) => void;
  onPositionChange: (newStartTime: number) => void;
  onUpdateMultipleClips?: (
    updates: Array<{ clipId: string; startTime: number }>,
  ) => void;
  onMaintainSelection?: (clipIds: string[]) => void;
  onDragStateChange?: (isDragging: boolean, snapTime?: number | null) => void;
}) {
  const resizeRef = useRef<{ startX: number; startDuration: number } | null>(
    null,
  );
  const dragRef = useRef<{
    startX: number;
    startTime: number;
    selectedClipIds: string[];
    initialPositions: Map<string, number>;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const mouseDownRef = useRef<{
    x: number;
    y: number;
    time: number;
    event: React.MouseEvent | null;
  } | null>(null);

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
      let newDuration = Math.max(
        0.5,
        resizeRef.current.startDuration + timeDiff,
      );

      // 리사이즈 시 다른 클립과 겹치지 않도록 제한
      const newEndTime = clip.startTime + newDuration;
      for (const otherClip of otherClips) {
        const otherStart = otherClip.startTime;
        // 현재 클립 끝이 다른 클립 시작을 넘어가려 하면 제한
        if (otherStart > clip.startTime && newEndTime > otherStart) {
          newDuration = otherStart - clip.startTime;
          break;
        }
      }

      onDurationChange(Math.max(0.5, newDuration));
    };

    const handleMouseUp = () => {
      resizeRef.current = null;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };


  // 유효한 배치 위치 찾기 (겹치지 않는 가장 가까운 위치) - 삽입 모드 지원
  const findValidPosition = useCallback(
    (desiredTime: number, duration: number, excludeClipIds: Set<string>) => {
      const snapThresholdTime = pixelsToTime(MAGNETIC_SNAP_PX, zoom);

      // 0초 이하면 0초로 고정
      if (desiredTime < 0) desiredTime = 0;

      // 제외할 클립을 뺀 나머지 클립들 (시간순 정렬)
      const remainingClips = otherClips
        .filter((c) => !excludeClipIds.has(c.id))
        .sort((a, b) => a.startTime - b.startTime);

      // 스냅 포인트 확인
      let snapTo: number | null = null;

      // 0초에 스냅
      if (desiredTime <= snapThresholdTime) {
        desiredTime = 0;
        snapTo = 0;
      } else {
        // 다른 클립 끝에 스냅
        for (const otherClip of remainingClips) {
          const otherEnd = otherClip.startTime + otherClip.duration;
          const otherStart = otherClip.startTime;

          // 클립 시작점이 다른 클립 끝점 근처
          if (Math.abs(desiredTime - otherEnd) <= snapThresholdTime) {
            desiredTime = otherEnd;
            snapTo = otherEnd;
            break;
          }
          // 클립 끝점이 다른 클립 시작점 근처
          if (Math.abs(desiredTime + duration - otherStart) <= snapThresholdTime) {
            desiredTime = otherStart - duration;
            snapTo = otherStart;
            break;
          }
        }
      }

      // 삽입 위치 결정: 드래그 위치 기준으로 어느 클립 사이에 들어갈지 결정
      const insertTime = Math.max(0, desiredTime);

      // 밀어야 할 클립들 찾기 (삽입 위치 이후에 있고, 겹치는 클립들)
      const clipsToShift: Array<{ id: string; newStartTime: number }> = [];
      const newEndTime = insertTime + duration;

      for (const otherClip of remainingClips) {
        const otherStart = otherClip.startTime;
        const otherEnd = otherClip.startTime + otherClip.duration;

        // 겹치는 경우: 삽입하려는 클립의 끝이 다른 클립의 시작보다 뒤에 있고,
        // 삽입하려는 클립의 시작이 다른 클립의 끝보다 앞에 있으면 겹침
        if (insertTime < otherEnd && newEndTime > otherStart) {
          // 겹치는 클립과 그 이후의 클립들을 모두 밀어야 함
          clipsToShift.push({
            id: otherClip.id,
            newStartTime: newEndTime + (otherStart - otherStart), // 일단 겹침 시작점 기록
          });
        }
      }

      return {
        time: insertTime,
        snapTo,
        clipsToShift: clipsToShift.length > 0 ? clipsToShift : null
      };
    },
    [otherClips, zoom],
  );

  // 클립 드래그로 위치 이동 (겹침 방지)
  const handleDragStart = (e: React.MouseEvent) => {
    // 리사이즈 핸들 영역에서는 드래그 시작 안함
    const target = e.target as HTMLElement;
    if (target.classList.contains("resize-handle")) return;

    e.stopPropagation();

    // 마우스 다운 위치 저장 (클릭 vs 드래그 구분용)
    mouseDownRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
      event: e,
    };

    // 드래그 시작 시에는 선택하지 않음 (실제 이동이 있을 때만 드래그로 간주)

    // 선택된 클립들의 초기 위치 저장
    const initialPositions = new Map<string, number>();
    selectedClips.forEach((selectedClip) => {
      initialPositions.set(selectedClip.id, selectedClip.startTime);
    });
    initialPositions.set(clip.id, clip.startTime);

    // 선택된 클립 ID들 저장 (드래그 후에도 선택 상태 유지)
    const selectedClipIds = selectedClips.map((c) => c.id);
    if (!selectedClipIds.includes(clip.id)) {
      selectedClipIds.push(clip.id);
    }

    dragRef.current = {
      startX: e.clientX,
      startTime: clip.startTime,
      selectedClipIds,
      initialPositions,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragRef.current || !mouseDownRef.current) return;

      // 마우스 이동 거리 계산 (클릭 vs 드래그 구분)
      const moveDistance = Math.sqrt(
        Math.pow(moveEvent.clientX - mouseDownRef.current.x, 2) +
          Math.pow(moveEvent.clientY - mouseDownRef.current.y, 2),
      );

      // 5픽셀 이상 움직였을 때만 드래그로 간주
      const DRAG_THRESHOLD = 5;
      if (moveDistance < DRAG_THRESHOLD && !isDragging) {
        return; // 아직 클릭으로 간주, 드래그 시작 안함
      }

      // 실제 드래그 시작 (처음 이동할 때만 선택 처리)
      if (!isDragging && mouseDownRef.current?.event) {
        setIsDragging(true);
        // 드래그 시작 시 선택 (다중 선택 지원)
        onSelect(mouseDownRef.current.event);
      }

      const diff = moveEvent.clientX - dragRef.current.startX;
      const timeDiff = pixelsToTime(diff, zoom);
      const rawNewStartTime = Math.max(0, dragRef.current.startTime + timeDiff);

      // 다중 선택 여부
      const isMultiDrag = selectedClips.length > 1;
      const selectedClipIdsSet = new Set<string>(selectedClipIds);

      if (isMultiDrag) {
        // 다중 드래그: 모든 선택된 클립을 동일한 오프셋만큼 이동 (겹침 방지 포함)
        let baseOffset = rawNewStartTime - clip.startTime;

        // 선택된 클립들의 초기 그룹 범위 계산
        let groupMinInitialTime = Infinity;
        let groupMaxInitialEnd = 0;
        selectedClips.forEach((sc) => {
          const initialTime =
            dragRef.current!.initialPositions.get(sc.id) || sc.startTime;
          groupMinInitialTime = Math.min(groupMinInitialTime, initialTime);
          groupMaxInitialEnd = Math.max(
            groupMaxInitialEnd,
            initialTime + sc.duration,
          );
        });
        const groupWidth = groupMaxInitialEnd - groupMinInitialTime;

        // 새 그룹 위치 계산
        let newGroupStart = groupMinInitialTime + baseOffset;
        let newGroupEnd = newGroupStart + groupWidth;

        // 0초 이하로 가지 않도록
        if (newGroupStart < 0) {
          newGroupStart = 0;
          newGroupEnd = groupWidth;
          baseOffset = -groupMinInitialTime;
        }

        // 선택되지 않은 클립들과 겹침 검사
        const nonSelectedClips = otherClips.filter(
          (c) => !selectedClipIdsSet.has(c.id),
        );
        let snapTo: number | null = null;

        for (const otherClip of nonSelectedClips) {
          const otherStart = otherClip.startTime;
          const otherEnd = otherClip.startTime + otherClip.duration;

          // 겹침 검사
          if (newGroupStart < otherEnd && newGroupEnd > otherStart) {
            // 가장 가까운 유효 위치 찾기
            const beforePosition = otherStart - groupWidth; // 다른 클립 앞
            const afterPosition = otherEnd; // 다른 클립 뒤

            const distBefore = Math.abs(newGroupStart - beforePosition);
            const distAfter = Math.abs(newGroupStart - afterPosition);

            if (beforePosition >= 0 && distBefore <= distAfter) {
              newGroupStart = beforePosition;
              snapTo = otherStart;
            } else {
              newGroupStart = afterPosition;
              snapTo = otherEnd;
            }
            newGroupEnd = newGroupStart + groupWidth;
            baseOffset = newGroupStart - groupMinInitialTime;
            break;
          }
        }

        // 조정된 위치에서 다시 겹침 확인 (재귀적 충돌 해결)
        let iterations = 0;
        while (iterations < 10) {
          let stillOverlapping = false;
          for (const otherClip of nonSelectedClips) {
            const otherStart = otherClip.startTime;
            const otherEnd = otherClip.startTime + otherClip.duration;

            if (newGroupStart < otherEnd && newGroupEnd > otherStart) {
              stillOverlapping = true;
              // 오른쪽으로 밀기
              newGroupStart = otherEnd;
              newGroupEnd = newGroupStart + groupWidth;
              snapTo = otherEnd;
              baseOffset = newGroupStart - groupMinInitialTime;
              break;
            }
          }
          if (!stillOverlapping) break;
          iterations++;
        }

        // 0초 이하 방지
        if (newGroupStart < 0) {
          newGroupStart = 0;
          baseOffset = -groupMinInitialTime;
        }

        // 업데이트 생성
        const updates: Array<{ clipId: string; startTime: number }> = [];
        selectedClips.forEach((selectedClip) => {
          const initialTime =
            dragRef.current!.initialPositions.get(selectedClip.id) ||
            selectedClip.startTime;
          const newTime = Math.max(0, initialTime + baseOffset);
          updates.push({ clipId: selectedClip.id, startTime: newTime });
        });

        // 다중 선택 시 스냅 라인 표시
        if (onDragStateChange) {
          onDragStateChange(true, snapTo);
        }

        if (onUpdateMultipleClips) {
          onUpdateMultipleClips(updates);
        }
      } else {
        // 단일 드래그: 삽입 모드 (리플) 적용
        const validPosition = findValidPosition(
          rawNewStartTime,
          clip.duration,
          selectedClipIdsSet,
        );

        // 스냅 라인 표시
        if (onDragStateChange) {
          onDragStateChange(true, validPosition.snapTo);
        }

        // 겹치는 클립들을 밀어내기 위한 업데이트 생성
        if (validPosition.clipsToShift && onUpdateMultipleClips) {
          // 삽입 위치에 클립 배치하고, 겹치는 클립들 밀기
          const insertTime = validPosition.time;
          const insertEndTime = insertTime + clip.duration;

          // 밀어야 할 클립들 계산 (삽입 위치와 겹치는 클립들)
          const remainingClips = otherClips
            .filter((c) => !selectedClipIdsSet.has(c.id))
            .sort((a, b) => a.startTime - b.startTime);

          const updates: Array<{ clipId: string; startTime: number }> = [
            { clipId: clip.id, startTime: insertTime }
          ];

          let currentPushTime = insertEndTime;
          for (const otherClip of remainingClips) {
            const otherStart = otherClip.startTime;
            const otherEnd = otherClip.startTime + otherClip.duration;

            // 이 클립이 현재 푸시 시간보다 앞에서 시작하면 밀어야 함
            if (otherStart < currentPushTime && otherEnd > insertTime) {
              updates.push({ clipId: otherClip.id, startTime: currentPushTime });
              currentPushTime = currentPushTime + otherClip.duration;
            }
          }

          onUpdateMultipleClips(updates);
        } else {
          onPositionChange(validPosition.time);
        }
      }
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      // 마우스 이동 거리 확인
      if (mouseDownRef.current) {
        const moveDistance = Math.sqrt(
          Math.pow(upEvent.clientX - mouseDownRef.current.x, 2) +
            Math.pow(upEvent.clientY - mouseDownRef.current.y, 2),
        );
        const timeDiff = Date.now() - mouseDownRef.current.time;

        // 5픽셀 미만 이동이고 300ms 이내면 클릭으로 간주
        const DRAG_THRESHOLD = 5;
        const CLICK_TIME_THRESHOLD = 300;

        if (
          moveDistance < DRAG_THRESHOLD &&
          timeDiff < CLICK_TIME_THRESHOLD &&
          !isDragging
        ) {
          // 클릭으로 간주: 선택 처리
          if (mouseDownRef.current?.event) {
            onSelect(mouseDownRef.current.event);
          }
          mouseDownRef.current = null;
          document.removeEventListener("mousemove", handleMouseMove);
          document.removeEventListener("mouseup", handleMouseUp);
          return;
        }
      }

      // 실제 드래그였던 경우
      setIsDragging(false);
      // 스냅 라인 숨기기
      if (onDragStateChange) {
        onDragStateChange(false, null);
      }
      // 드래그 종료 후 선택 상태 유지
      if (dragRef.current && onMaintainSelection) {
        onMaintainSelection(dragRef.current.selectedClipIds);
      }
      dragRef.current = null;
      mouseDownRef.current = null;
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
      className={`absolute top-1 bottom-1 rounded cursor-grab active:cursor-grabbing ${getClipColor()} ${
        isSelected || isMultiSelected ? "ring-2 ring-teal-400" : ""
      } ${isDragging ? "opacity-90 shadow-lg shadow-black/30 z-20" : "transition-all"}`}
      style={{ left: `${left}px`, width: `${width}px`, minWidth: "20px" }}
      onMouseDown={handleDragStart}
      onClick={(e) => {
        e.stopPropagation();
        // onClick은 이미 handleMouseUp에서 처리되므로 여기서는 아무것도 하지 않음
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
          className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600 z-50"
          style={{ zIndex: 9999 }}
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
  selectedClipIds,
  onAddMultipleClips,
  onSelectClip,
  onDeleteClip,
  onUpdateClip,
  onUpdateMultipleClips,
  onMaintainSelection,
}: {
  track: TimelineState["tracks"][0];
  mediaItems: MediaItem[];
  timeline: TimelineState;
  zoom: number;
  selectedClipId: string | null;
  selectedClipIds: Set<string>;
  onAddMultipleClips: (
    trackId: string,
    clips: Array<{ mediaId: string; startTime: number }>,
  ) => void;
  onSelectClip: (clipId: string | null, e?: React.MouseEvent) => void;
  onDeleteClip: (trackId: string, clipId: string) => void;
  onUpdateClip: (
    trackId: string,
    clipId: string,
    updates: Partial<TimelineClip>,
  ) => void;
  onUpdateMultipleClips: (
    trackId: string,
    updates: Array<{ clipId: string; startTime: number }>,
  ) => void;
  onMaintainSelection?: (clipIds: string[]) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [snapLineTime, setSnapLineTime] = useState<number | null>(null);
  const [isDraggingClip, setIsDraggingClip] = useState(false);

  // 드래그 상태 변경 핸들러
  const handleDragStateChange = useCallback(
    (isDragging: boolean, snapTime?: number | null) => {
      setIsDraggingClip(isDragging);
      setSnapLineTime(snapTime ?? null);
    },
    [],
  );

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
        const mediaIdsToAdd =
          item.selectedMediaIds && item.selectedMediaIds.length > 0
            ? item.selectedMediaIds
            : item.mediaId
              ? [item.mediaId]
              : [];

        // 기존 클립의 마지막 끝 시간 찾기
        const existingClips = track.clips;
        const lastClipEnd =
          existingClips.length > 0
            ? Math.max(
                ...existingClips.map((clip) => clip.startTime + clip.duration),
              )
            : 0;

        // 드롭 위치와 기존 클립의 끝 시간 중 더 큰 값 사용
        let currentStartTime = Math.max(
          0,
          Math.max(baseStartTime, lastClipEnd),
        );
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
    [track, mediaItems, zoom, onAddMultipleClips],
  );

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      (trackRef as React.MutableRefObject<HTMLDivElement | null>).current =
        node;
      drop(node);
    },
    [drop],
  );

  // 트랙 너비: 타임라인에 미디어가 있으면 그 시간에 맞춰, 없으면 최소 10초
  // totalDuration 계산 (트랙의 모든 클립 중 최대 끝 시간)
  const trackTotalDuration = useMemo(() => {
    let maxEnd = 0;
    timeline.tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        const end = clip.startTime + clip.duration;
        if (end > maxEnd) maxEnd = end;
      });
    });
    return maxEnd || timeline.totalDuration;
  }, [timeline.tracks, timeline.totalDuration]);

  const trackWidth =
    trackTotalDuration > 0
      ? timeToPixels(trackTotalDuration + 10, zoom)
      : timeToPixels(10, zoom);

  return (
    <div
      className="flex border-b border-slate-700/50 relative"
      style={{
        width: `${trackWidth + 80}px`,
        minWidth: `${trackWidth + 80}px`,
      }}
    >
      {/* 트랙 라벨 */}
      <div className="w-20 flex-shrink-0 px-2 py-2 bg-slate-800/50 border-r border-slate-700/50 sticky left-0 z-10">
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
        className={`relative h-12 ${isOver ? "bg-teal-500/10" : ""}`}
        style={{
          width: `${trackWidth}px`,
          minWidth: `${trackWidth}px`,
        }}
        onClick={() => onSelectClip(null)}
      >
        {track.clips.map((clip) => (
          <ClipItem
            key={clip.id}
            clip={clip}
            media={mediaItems.find((m) => m.id === clip.mediaId)}
            zoom={zoom}
            isSelected={selectedClipId === clip.id}
            isMultiSelected={selectedClipIds.has(clip.id)}
            otherClips={track.clips.filter((c) => c.id !== clip.id)}
            selectedClips={track.clips.filter(
              (c) => selectedClipIds.has(c.id) || c.id === clip.id,
            )}
            onSelect={(e) => onSelectClip(clip.id, e)}
            onDelete={() => onDeleteClip(track.id, clip.id)}
            onDurationChange={(newDuration) =>
              onUpdateClip(track.id, clip.id, { duration: newDuration })
            }
            onPositionChange={(newStartTime) =>
              onUpdateClip(track.id, clip.id, { startTime: newStartTime })
            }
            onUpdateMultipleClips={(updates) => {
              onUpdateMultipleClips(track.id, updates);
            }}
            onMaintainSelection={onMaintainSelection}
            onDragStateChange={handleDragStateChange}
          />
        ))}

        {/* 스냅 라인 표시 */}
        {isDraggingClip && snapLineTime !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 pointer-events-none z-30"
            style={{ left: `${timeToPixels(snapLineTime, zoom)}px` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-yellow-400 rotate-45" />
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-yellow-400 rotate-45" />
          </div>
        )}
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
  const [scrollPosition, setScrollPosition] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  // 총 지속시간 계산 (timeline.totalDuration과 동기화)
  const totalDuration = useMemo(() => {
    // timeline.totalDuration이 있으면 우선 사용, 없으면 계산
    if (timeline.totalDuration > 0) {
      return timeline.totalDuration;
    }
    let maxEnd = 0;
    timeline.tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        const end = clip.startTime + clip.duration;
        if (end > maxEnd) maxEnd = end;
      });
    });
    return maxEnd;
  }, [timeline.tracks, timeline.totalDuration]);

  // 스크롤 위치 추적
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollPosition(container.scrollLeft);
    };

    const handleResize = () => {
      setContainerWidth(container.clientWidth);
    };

    container.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleResize);
    handleResize(); // 초기 크기 설정

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

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
          (a, b) => a.startTime - b.startTime,
        );

        // 각 새 클립을 순차적으로 배치하면서 겹침 확인
        newClips.forEach((newClip, index) => {
          if (index === 0) {
            // 첫 번째 클립은 기존 클립과 겹치는지 확인
            const overlappingClip = sortedExistingClips.find(
              (existingClip) =>
                (newClip.startTime >= existingClip.startTime &&
                  newClip.startTime <
                    existingClip.startTime + existingClip.duration) ||
                (existingClip.startTime >= newClip.startTime &&
                  existingClip.startTime <
                    newClip.startTime + newClip.duration),
            );

            if (overlappingClip) {
              // 겹치면 기존 클립의 끝 시간에 배치
              newClip.startTime =
                overlappingClip.startTime + overlappingClip.duration;
            }
          } else {
            // 이후 클립들은 이전 새 클립의 끝 시간에 배치
            const prevClip = newClips[index - 1];
            newClip.startTime = prevClip.startTime + prevClip.duration;

            // 여전히 기존 클립과 겹치는지 확인
            const overlappingClip = sortedExistingClips.find(
              (existingClip) =>
                (newClip.startTime >= existingClip.startTime &&
                  newClip.startTime <
                    existingClip.startTime + existingClip.duration) ||
                (existingClip.startTime >= newClip.startTime &&
                  existingClip.startTime <
                    newClip.startTime + newClip.duration),
            );

            if (overlappingClip) {
              // 겹치면 기존 클립의 끝 시간에 배치
              newClip.startTime =
                overlappingClip.startTime + overlappingClip.duration;
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
                  (a, b) => a.startTime - b.startTime,
                ),
              }
            : track,
        ),
        totalDuration: maxEndTime,
      });
    },
    [mediaItems, timeline, totalDuration, onTimelineUpdate],
  );

  // 클립 선택 (다중 선택 지원)
  const handleSelectClip = useCallback(
    (clipId: string | null, e?: React.MouseEvent) => {
      if (clipId === null) {
        // 빈 공간 클릭 시 선택 해제
        onSelectionUpdate({
          ...selection,
          selectedClipId: null,
          selectedClipIds: new Set(),
        });
        return;
      }

      const shiftKey = e?.shiftKey || false;
      const ctrlKey = e?.ctrlKey || false;
      const metaKey = e?.metaKey || false;

      if (shiftKey || ctrlKey || metaKey) {
        // 다중 선택
        const newSelectedIds = new Set(selection.selectedClipIds);
        if (newSelectedIds.has(clipId)) {
          newSelectedIds.delete(clipId);
        } else {
          newSelectedIds.add(clipId);
        }
        onSelectionUpdate({
          ...selection,
          selectedClipId: clipId,
          selectedClipIds: newSelectedIds,
        });
      } else {
        // 단일 선택
        onSelectionUpdate({
          ...selection,
          selectedClipId: clipId,
          selectedClipIds: new Set([clipId]),
        });
      }
    },
    [selection, onSelectionUpdate],
  );

  // 비디오 트랙의 모든 클립 선택
  const handleSelectAllVideoClips = useCallback(() => {
    const videoTrack = timeline.tracks.find((t) => t.type === "video");
    if (!videoTrack || videoTrack.clips.length === 0) return;

    const allVideoClipIds = new Set(videoTrack.clips.map((clip) => clip.id));
    const firstClipId = videoTrack.clips[0]?.id || null;

    onSelectionUpdate({
      ...selection,
      selectedClipId: firstClipId,
      selectedClipIds: allVideoClipIds,
    });
  }, [timeline.tracks, selection, onSelectionUpdate]);

  // 클립 삭제 (다중 삭제 지원)
  const handleDeleteClip = useCallback(
    (trackId: string, clipId: string) => {
      // 선택된 모든 클립 삭제
      const clipsToDelete =
        selection.selectedClipIds.size > 0
          ? Array.from(selection.selectedClipIds)
          : [clipId];

      const updatedTracks = timeline.tracks.map((track) => {
        const clipsToRemove = new Set(clipsToDelete);
        return {
          ...track,
          clips: track.clips.filter((clip) => !clipsToRemove.has(clip.id)),
        };
      });

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

      // 선택 해제
      onSelectionUpdate({
        ...selection,
        selectedClipId: null,
        selectedClipIds: new Set(),
      });
    },
    [timeline, selection, onTimelineUpdate, onSelectionUpdate],
  );

  // 여러 클립을 동시에 업데이트
  const handleUpdateMultipleClips = useCallback(
    (
      trackId: string,
      updates: Array<{ clipId: string; startTime: number }>,
    ) => {
      if (updates.length === 0) return;

      const updatedTracks = timeline.tracks.map((track) => {
        if (track.id !== trackId) return track;

        const updatedClips = track.clips.map((clip) => {
          const update = updates.find((u) => u.clipId === clip.id);
          if (update) {
            return { ...clip, startTime: Math.max(0, update.startTime) };
          }
          return clip;
        });

        return {
          ...track,
          clips: updatedClips.sort((a, b) => a.startTime - b.startTime),
        };
      });

      // 업데이트 후 총 지속시간 재계산
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
    },
    [timeline, onTimelineUpdate],
  );

  // 클립 업데이트 (리플 모드 - 후속 클립 자동 밀기)
  const handleUpdateClip = useCallback(
    (trackId: string, clipId: string, updates: Partial<TimelineClip>) => {
      const targetTrack = timeline.tracks.find((t) => t.id === trackId);
      if (!targetTrack) return;

      const targetClip = targetTrack.clips.find((c) => c.id === clipId);
      if (!targetClip) return;

      // 업데이트된 클립 정보
      const updatedClip = { ...targetClip, ...updates };

      // 같은 트랙의 다른 클립들 (시간순 정렬)
      const otherClips = targetTrack.clips
        .filter((c) => c.id !== clipId)
        .sort((a, b) => a.startTime - b.startTime);

      // startTime이 업데이트되는 경우: 삽입 모드 (리플)
      if (updates.startTime !== undefined) {
        const newStartTime = Math.max(0, updates.startTime);
        const newEndTime = newStartTime + updatedClip.duration;

        // 삽입 위치에서 겹치는 클립들을 뒤로 밀기
        const clipsAfterInsert = otherClips.filter(
          (c) => c.startTime < newEndTime && c.startTime + c.duration > newStartTime
        );

        if (clipsAfterInsert.length > 0) {
          // 밀어야 할 클립들 계산
          let pushTime = newEndTime;
          const clipUpdates = new Map<string, number>();

          // 시간순으로 정렬된 모든 클립들 중 삽입 위치와 겹치거나 그 뒤에 있는 것들
          for (const otherClip of otherClips) {
            const otherStart = otherClip.startTime;
            const otherEnd = otherStart + otherClip.duration;

            // 삽입 클립과 겹치는 경우 밀어내기
            if (otherStart < newEndTime && otherEnd > newStartTime) {
              clipUpdates.set(otherClip.id, pushTime);
              pushTime = pushTime + otherClip.duration;
            } else if (otherStart >= newEndTime && clipUpdates.size > 0) {
              // 이미 밀린 클립이 있고, 이 클립이 그 뒤에 있으면
              // 이전에 밀린 클립과 겹치는지 확인
              const lastPushEnd = pushTime;
              if (otherStart < lastPushEnd) {
                clipUpdates.set(otherClip.id, pushTime);
                pushTime = pushTime + otherClip.duration;
              }
            }
          }

          // 모든 클립 업데이트
          const finalClips = targetTrack.clips.map((clip) => {
            if (clip.id === clipId) {
              return { ...clip, ...updates, startTime: newStartTime };
            }
            const newTime = clipUpdates.get(clip.id);
            if (newTime !== undefined) {
              return { ...clip, startTime: newTime };
            }
            return clip;
          });

          const updatedTracks = timeline.tracks.map((track) =>
            track.id === trackId
              ? { ...track, clips: finalClips.sort((a, b) => a.startTime - b.startTime) }
              : track
          );

          let maxEnd = 0;
          updatedTracks.forEach((track) => {
            track.clips.forEach((clip) => {
              const end = clip.startTime + clip.duration;
              if (end > maxEnd) maxEnd = end;
            });
          });

          onTimelineUpdate({ ...timeline, tracks: updatedTracks, totalDuration: maxEnd });
          return;
        }

        updates.startTime = newStartTime;
      }

      // duration이 업데이트되는 경우: 리플 모드 (후속 클립 자동 밀기)
      if (updates.duration !== undefined) {
        const clipStart = targetClip.startTime;
        const newDuration = Math.max(0.5, updates.duration);
        const newEndTime = clipStart + newDuration;
        const oldEndTime = clipStart + targetClip.duration;

        // 지속시간이 늘어난 경우에만 밀기 적용
        if (newEndTime > oldEndTime) {
          // 뒤에 있는 클립들 중 겹치는 것들을 밀어내기
          const clipsToShift = otherClips.filter(
            (c) => c.startTime >= oldEndTime || (c.startTime < newEndTime && c.startTime + c.duration > clipStart)
          );

          if (clipsToShift.length > 0) {
            const clipUpdates = new Map<string, number>();
            let pushTime = newEndTime;

            for (const otherClip of otherClips) {
              const otherStart = otherClip.startTime;

              // 새 끝 시간과 겹치거나 그 뒤에 있는 클립들
              if (otherStart < pushTime && otherStart >= clipStart) {
                // 현재 클립 뒤에 있고, 새 끝 시간보다 앞에 시작하면 밀기
                if (otherStart < newEndTime) {
                  clipUpdates.set(otherClip.id, pushTime);
                  pushTime = pushTime + otherClip.duration;
                }
              } else if (clipUpdates.size > 0 && otherStart < pushTime) {
                // 이미 밀린 클립이 있고, 체인 효과로 밀어야 하는 경우
                clipUpdates.set(otherClip.id, pushTime);
                pushTime = pushTime + otherClip.duration;
              }
            }

            // 모든 클립 업데이트
            const finalClips = targetTrack.clips.map((clip) => {
              if (clip.id === clipId) {
                return { ...clip, duration: newDuration };
              }
              const newTime = clipUpdates.get(clip.id);
              if (newTime !== undefined) {
                return { ...clip, startTime: newTime };
              }
              return clip;
            });

            const updatedTracks = timeline.tracks.map((track) =>
              track.id === trackId
                ? { ...track, clips: finalClips.sort((a, b) => a.startTime - b.startTime) }
                : track
            );

            let maxEnd = 0;
            updatedTracks.forEach((track) => {
              track.clips.forEach((clip) => {
                const end = clip.startTime + clip.duration;
                if (end > maxEnd) maxEnd = end;
              });
            });

            onTimelineUpdate({ ...timeline, tracks: updatedTracks, totalDuration: maxEnd });
            return;
          }
        }

        updates.duration = newDuration;
      }

      // 기본 업데이트 (겹침 없는 경우)
      const updatedTracks = timeline.tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              clips: track.clips
                .map((clip) =>
                  clip.id === clipId ? { ...clip, ...updates } : clip,
                )
                .sort((a, b) => a.startTime - b.startTime),
            }
          : track,
      );

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
    },
    [timeline, onTimelineUpdate],
  );

  // 오디오에 맞춰 분배 가능 여부 계산
  const distributeInfo = useMemo(() => {
    const videoTrack = timeline.tracks.find((t) => t.type === "video");
    const audioTrack = timeline.tracks.find((t) => t.type === "audio");

    if (!videoTrack || !audioTrack) {
      return { canDistribute: false, reason: "트랙 없음" };
    }

    // 오디오 트랙 총 길이 계산
    const audioTotalDuration = audioTrack.clips.reduce((max, clip) => {
      const clipEnd = clip.startTime + clip.duration;
      return clipEnd > max ? clipEnd : max;
    }, 0);

    if (audioTotalDuration === 0) {
      return { canDistribute: false, reason: "오디오 없음" };
    }

    // 비디오 트랙 클립 확인
    const videoClips = videoTrack.clips;
    if (videoClips.length === 0) {
      return { canDistribute: false, reason: "비디오 클립 없음" };
    }

    // 비디오 클립 중 video 타입이 있는지 확인
    const hasVideoClip = videoClips.some((clip) => {
      const media = mediaItems.find((m) => m.id === clip.mediaId);
      return media?.type === "video";
    });

    if (hasVideoClip) {
      return { canDistribute: false, reason: "영상 클립 포함" };
    }

    // 이미지 클립 개수
    const imageClipCount = videoClips.length;

    return {
      canDistribute: true,
      audioDuration: audioTotalDuration,
      imageClipCount,
      durationPerClip: audioTotalDuration / imageClipCount,
    };
  }, [timeline.tracks, mediaItems]);

  // 오디오에 맞춰 이미지 클립 분배
  const handleDistributeToAudio = useCallback(() => {
    if (!distributeInfo.canDistribute ||
        distributeInfo.audioDuration === undefined ||
        distributeInfo.imageClipCount === undefined) return;

    const videoTrack = timeline.tracks.find((t) => t.type === "video");
    if (!videoTrack) return;

    const audioDuration = distributeInfo.audioDuration;
    const imageClipCount = distributeInfo.imageClipCount;
    const durationPerClip = audioDuration / imageClipCount;

    // 비디오 트랙의 클립들을 시간순 정렬 후 재배치
    const sortedClips = [...videoTrack.clips].sort(
      (a, b) => a.startTime - b.startTime
    );

    const updatedClips = sortedClips.map((clip, index) => ({
      ...clip,
      startTime: index * durationPerClip,
      duration: durationPerClip,
    }));

    const updatedTracks = timeline.tracks.map((track) =>
      track.type === "video"
        ? { ...track, clips: updatedClips }
        : track
    );

    onTimelineUpdate({
      ...timeline,
      tracks: updatedTracks,
      totalDuration: audioDuration,
    });
  }, [distributeInfo, timeline, onTimelineUpdate]);

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
    [timeline.zoom, playback, onPlaybackUpdate],
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
            onClick={() => onPlaybackUpdate({ ...playback, currentTime: 0 })}
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

        {/* 비디오 클립 전체 선택 버튼 */}
        <button
          onClick={handleSelectAllVideoClips}
          className="px-3 py-1 text-xs rounded bg-blue-500 hover:bg-blue-600 text-white transition-colors"
          title="비디오 트랙의 모든 클립 선택"
        >
          전체 선택
        </button>

        {/* 오디오에 맞춰 분배 버튼 */}
        <button
          onClick={handleDistributeToAudio}
          disabled={!distributeInfo.canDistribute}
          className={`px-3 py-1 text-xs rounded transition-colors ${
            distributeInfo.canDistribute
              ? "bg-purple-500 hover:bg-purple-600 text-white"
              : "bg-slate-700 text-slate-500 cursor-not-allowed"
          }`}
          title={
            distributeInfo.canDistribute
              ? `이미지 ${distributeInfo.imageClipCount}개를 오디오 길이에 맞춰 균등 분배`
              : distributeInfo.reason
          }
        >
          오디오에 맞춰 분배
        </button>

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
        className="flex-1 overflow-auto relative"
        onClick={handleTimelineClick}
      >
        <div className="relative">
          {/* 타임 눈금자 */}
          <div className="flex sticky top-0 z-10 bg-slate-800">
            <div className="w-20 flex-shrink-0 bg-slate-800/50 border-r border-slate-700/50 sticky left-0 z-20" />
            <TimeRuler
              duration={totalDuration || 0}
              zoom={timeline.zoom}
              scrollPosition={scrollPosition}
              containerWidth={containerWidth}
            />
          </div>

          {/* 트랙들 */}
          <div className="flex flex-col relative">
            {timeline.tracks.map((track) => (
              <TrackRow
                key={track.id}
                track={track}
                mediaItems={mediaItems}
                timeline={timeline}
                zoom={timeline.zoom}
                selectedClipId={selection.selectedClipId}
                selectedClipIds={selection.selectedClipIds}
                onAddMultipleClips={handleAddMultipleClips}
                onSelectClip={handleSelectClip}
                onDeleteClip={handleDeleteClip}
                onUpdateClip={handleUpdateClip}
                onUpdateMultipleClips={handleUpdateMultipleClips}
                onMaintainSelection={(clipIds) => {
                  onSelectionUpdate({
                    ...selection,
                    selectedClipIds: new Set(clipIds),
                  });
                }}
              />
            ))}
          </div>

          {/* 재생헤드 */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-30"
            style={{
              left: `${80 + playheadPosition}px`,
            }}
          >
            <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
