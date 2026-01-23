"use client";

import { ChangeEvent, useRef, useCallback, useEffect } from "react";
import { useDrag } from "react-dnd";
import {
  MediaItem,
  MediaType,
  DRAG_TYPES,
  DEFAULT_IMAGE_DURATION,
} from "@/types/video-editor.types";

interface MediaLibraryProps {
  mediaItems: MediaItem[];
  selectedMediaIds: Set<string>;
  onAddMedia: (media: MediaItem) => void;
  onRemoveMedia: (mediaId: string) => void;
  onSelectMedia: (
    mediaId: string,
    options?: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean }
  ) => void;
  onSelectAll: () => void;
  onAddToTimeline: () => void;
}

// 미디어 타입 판별
function getMediaType(file: File): MediaType | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return null;
}

// 이미지 로드
async function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// 비디오 로드
async function loadVideo(file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true; // 비디오 오디오 트랙 음소거 (별도 오디오 트랙과 중복 재생 방지)
    video.volume = 0; // 볼륨도 0으로 설정
    video.onloadedmetadata = () => {
      // 메타데이터 로드 후에도 muted 상태 유지
      video.muted = true;
      video.volume = 0;
      resolve(video);
    };
    video.onerror = reject;
    video.src = URL.createObjectURL(file);
  });
}

// 오디오 로드
async function loadAudio(file: File): Promise<HTMLAudioElement> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    // 오디오 품질 개선을 위한 설정
    audio.preload = "auto"; // 전체 파일 미리 로드
    audio.volume = 1.0; // 볼륨 설정
    audio.playbackRate = 1.0; // 재생 속도
    audio.crossOrigin = "anonymous"; // CORS 설정
    
    audio.onloadedmetadata = () => {
      // 메타데이터 로드 후 추가 설정
      audio.volume = 1.0;
      resolve(audio);
    };
    audio.onerror = reject;
    audio.src = URL.createObjectURL(file);
  });
}

// 비디오 썸네일 생성
async function generateVideoThumbnail(
  video: HTMLVideoElement
): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 90;
    const ctx = canvas.getContext("2d");

    video.currentTime = 0;
    video.onseeked = () => {
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
      video.onseeked = null;
    };
  });
}

// 미디어 썸네일 컴포넌트
function MediaThumbnail({
  media,
  isSelected,
  selectedMediaIds,
  onSelect,
  onRemove,
}: {
  media: MediaItem;
  isSelected: boolean;
  selectedMediaIds: Set<string>;
  onSelect: (e: React.MouseEvent) => void;
  onRemove: () => void;
}) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: DRAG_TYPES.MEDIA_THUMBNAIL,
    // item을 함수로 만들어서 드래그 시작 시점의 최신 selectedMediaIds를 가져옴
    item: () => {
      return {
        type: DRAG_TYPES.MEDIA_THUMBNAIL,
        id: media.id,
        mediaId: media.id,
        // 선택된 미디어가 있으면 선택된 모든 미디어 포함
        // 선택된 미디어가 없으면 현재 드래그한 미디어만 포함
        selectedMediaIds:
          selectedMediaIds.size > 0
            ? Array.from(selectedMediaIds)
            : undefined, // undefined면 Timeline에서 현재 미디어만 처리
      };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [selectedMediaIds, media.id]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getTypeIcon = () => {
    switch (media.type) {
      case "image":
        return (
          <svg
            className="w-3 h-3"
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
            className="w-3 h-3"
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
            className="w-3 h-3"
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
    <div
      ref={drag as unknown as React.RefObject<HTMLDivElement>}
      onClick={onSelect}
      className={`relative group cursor-pointer rounded-lg overflow-hidden bg-slate-700/50 transition-all ${
        isDragging ? "opacity-50" : ""
      } ${isSelected ? "ring-2 ring-teal-400 ring-offset-1 ring-offset-slate-800" : "hover:ring-1 hover:ring-slate-500"}`}
    >
      {/* 썸네일 */}
      <div className="aspect-video bg-slate-800 flex items-center justify-center">
        {media.type === "audio" ? (
          <div className="flex flex-col items-center text-slate-400">
            <svg
              className="w-6 h-6"
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
          </div>
        ) : (
          <img
            src={media.thumbnail}
            alt={media.name}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* 오버레이 정보 */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
        <div className="flex items-center gap-1 text-white text-[10px]">
          {getTypeIcon()}
          <span className="truncate flex-1">{media.name}</span>
        </div>
        <div className="text-slate-300 text-[10px]">
          {formatDuration(media.duration)}
        </div>
      </div>

      {/* 삭제 버튼 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500/80 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <svg
          className="w-2.5 h-2.5 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}

export default function MediaLibrary({
  mediaItems,
  selectedMediaIds,
  onAddMedia,
  onRemoveMedia,
  onSelectMedia,
  onSelectAll,
  onAddToTimeline,
}: MediaLibraryProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      for (const file of Array.from(files)) {
        const type = getMediaType(file);
        if (!type) {
          alert(`지원하지 않는 파일 형식입니다: ${file.name}`);
          continue;
        }

        const id = `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        try {
          let element: HTMLImageElement | HTMLVideoElement | HTMLAudioElement;
          let duration: number;
          let thumbnail: string;
          let width: number | undefined;
          let height: number | undefined;

          if (type === "image") {
            const img = await loadImage(file);
            element = img;
            duration = DEFAULT_IMAGE_DURATION;
            thumbnail = URL.createObjectURL(file);
            width = img.naturalWidth;
            height = img.naturalHeight;
          } else if (type === "video") {
            const video = await loadVideo(file);
            element = video;
            duration = video.duration;
            thumbnail = await generateVideoThumbnail(video);
            width = video.videoWidth;
            height = video.videoHeight;
          } else {
            const audio = await loadAudio(file);
            element = audio;
            duration = audio.duration;
            thumbnail = "";
          }

          onAddMedia({
            id,
            type,
            file,
            name: file.name,
            thumbnail,
            duration,
            width,
            height,
            element,
          });
        } catch (error) {
          console.error(`파일 로드 실패: ${file.name}`, error);
          alert(`파일을 로드할 수 없습니다: ${file.name}`);
        }
      }

      // 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [onAddMedia]
  );

  const isAllSelected =
    mediaItems.length > 0 && selectedMediaIds.size === mediaItems.length;

  // 키보드 단축키 처리 (Ctrl+A / Cmd+A)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        if (mediaItems.length > 0) {
          onSelectAll();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mediaItems.length, onSelectAll]);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-200">미디어</h2>
        <div className="flex items-center gap-2">
          {mediaItems.length > 0 && (
            <button
              onClick={onSelectAll}
              className="px-2 py-1 text-xs bg-slate-600 hover:bg-slate-500 text-white rounded transition-colors"
              title={isAllSelected ? "전체 해제 (Ctrl+A)" : "전체 선택 (Ctrl+A)"}
            >
              {isAllSelected ? "전체 해제" : "전체 선택"}
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2 py-1 text-xs bg-teal-500 hover:bg-teal-600 text-white rounded transition-colors"
          >
            + 추가
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* 미디어 목록 */}
      <div className={mediaItems.length === 0 ? "" : "grid grid-cols-2 gap-2"}>
        {mediaItems.length === 0 ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="aspect-video border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:border-teal-500 hover:text-teal-400 cursor-pointer transition-colors"
          >
            <svg
              className="w-8 h-8 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="text-xs">미디어 추가</span>
            <span className="text-xs text-slate-500 mt-1">
              이미지, 영상, 음악
            </span>
          </div>
        ) : (
          mediaItems.map((media, index) => (
            <MediaThumbnail
              key={media.id}
              media={media}
              isSelected={selectedMediaIds.has(media.id)}
              selectedMediaIds={selectedMediaIds}
              onSelect={(e) => {
                onSelectMedia(media.id, {
                  shiftKey: e.shiftKey,
                  ctrlKey: e.ctrlKey,
                  metaKey: e.metaKey,
                });
              }}
              onRemove={() => onRemoveMedia(media.id)}
            />
          ))
        )}
      </div>

      {/* 선택된 미디어가 있을 때 타임라인 추가 버튼 */}
      {selectedMediaIds.size > 0 && (
        <button
          onClick={onAddToTimeline}
          className="w-full mt-3 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          타임라인에 추가 ({selectedMediaIds.size}개)
        </button>
      )}

      {/* 추가 버튼 (미디어가 있을 때) */}
      {mediaItems.length > 0 && (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full mt-2 py-2 border border-dashed border-slate-600 rounded-lg text-slate-400 hover:border-teal-500 hover:text-teal-400 text-xs transition-colors"
        >
          + 미디어 추가
        </button>
      )}
    </div>
  );
}
