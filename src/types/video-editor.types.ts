// 미디어 타입
export type MediaType = "image" | "video" | "audio";

// 영상 비율 타입
export type AspectRatio = "16:9" | "9:16" | "1:1";

export const ASPECT_RATIO_CONFIG: Record<
  AspectRatio,
  { width: number; height: number; label: string }
> = {
  "16:9": { width: 1920, height: 1080, label: "가로형 (16:9)" },
  "9:16": { width: 1080, height: 1920, label: "세로형 (9:16)" },
  "1:1": { width: 1080, height: 1080, label: "정사각형 (1:1)" },
};

// 미디어 아이템 (라이브러리에 저장된 원본)
export interface MediaItem {
  id: string;
  type: MediaType;
  file: File;
  name: string;
  thumbnail: string;
  duration: number;
  width?: number;
  height?: number;
  element: HTMLImageElement | HTMLVideoElement | HTMLAudioElement;
}

// 타임라인 클립 (타임라인에 배치된 인스턴스)
export interface TimelineClip {
  id: string;
  mediaId: string;
  trackId: string;
  startTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
}

// 트랙 타입
export type TrackType = "video" | "audio";

// 트랙
export interface Track {
  id: string;
  type: TrackType;
  name: string;
  clips: TimelineClip[];
  muted: boolean;
  locked: boolean;
}

// 전체 타임라인 상태
export interface TimelineState {
  tracks: Track[];
  totalDuration: number;
  zoom: number;
  scrollPosition: number;
}

// 재생 상태
export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  volume: number;
}

// 선택 상태
export interface SelectionState {
  selectedClipId: string | null;
  selectedTrackId: string | null;
}

// 드래그 앤 드롭 아이템
export interface DragItem {
  type: "media-thumbnail" | "timeline-clip";
  id: string;
  mediaId?: string;
  trackId?: string;
}

// 드래그 타입 상수
export const DRAG_TYPES = {
  MEDIA_THUMBNAIL: "media-thumbnail",
  TIMELINE_CLIP: "timeline-clip",
} as const;

// 기본 설정
export const DEFAULT_IMAGE_DURATION = 5; // 이미지 기본 지속시간 (초)
export const PIXELS_PER_SECOND = 50; // 타임라인 기본 줌 레벨
export const MIN_CLIP_DURATION = 0.5; // 최소 클립 지속시간 (초)
