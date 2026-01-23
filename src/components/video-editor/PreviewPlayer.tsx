"use client";

import { useRef, useEffect, useCallback, useMemo } from "react";
import {
  MediaItem,
  TimelineState,
  PlaybackState,
  AspectRatio,
  ASPECT_RATIO_CONFIG,
  TimelineClip,
} from "@/types/video-editor.types";

interface PreviewPlayerProps {
  mediaItems: MediaItem[];
  timeline: TimelineState;
  playback: PlaybackState;
  aspectRatio: AspectRatio;
  onPlaybackUpdate: (playback: PlaybackState) => void;
}

export default function PreviewPlayer({
  mediaItems,
  timeline,
  playback,
  aspectRatio,
  onPlaybackUpdate,
}: PreviewPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // 오디오 상태 추적 (단순화)
  const currentAudioClipIdRef = useRef<string | null>(null);
  const currentAudioElementRef = useRef<HTMLAudioElement | null>(null);

  const aspectConfig = ASPECT_RATIO_CONFIG[aspectRatio];

  // 비디오 트랙의 클립들을 시간순으로 정렬
  const videoClips = useMemo(() => {
    const videoTrack = timeline.tracks.find((t) => t.type === "video");
    if (!videoTrack) return [];
    return [...videoTrack.clips].sort((a, b) => a.startTime - b.startTime);
  }, [timeline.tracks]);

  // 오디오 트랙의 클립들
  const audioClips = useMemo(() => {
    const audioTrack = timeline.tracks.find((t) => t.type === "audio");
    if (!audioTrack) return [];
    return [...audioTrack.clips].sort((a, b) => a.startTime - b.startTime);
  }, [timeline.tracks]);

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

  // 현재 시간에 해당하는 클립 찾기
  const getCurrentClip = useCallback(
    (time: number, clips: TimelineClip[]): TimelineClip | null => {
      return (
        clips.find(
          (clip) => time >= clip.startTime && time < clip.startTime + clip.duration
        ) || null
      );
    },
    []
  );

  // 미디어를 Canvas에 그리기
  const drawMediaToCanvas = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      source: HTMLImageElement | HTMLVideoElement,
      canvasWidth: number,
      canvasHeight: number
    ) => {
      const sourceWidth =
        source instanceof HTMLVideoElement
          ? source.videoWidth
          : source.naturalWidth;
      const sourceHeight =
        source instanceof HTMLVideoElement
          ? source.videoHeight
          : source.naturalHeight;

      if (!sourceWidth || !sourceHeight) return;

      const sourceRatio = sourceWidth / sourceHeight;
      const canvasRatio = canvasWidth / canvasHeight;

      let drawWidth: number;
      let drawHeight: number;
      let offsetX: number;
      let offsetY: number;

      if (sourceRatio > canvasRatio) {
        drawHeight = canvasHeight;
        drawWidth = canvasHeight * sourceRatio;
        offsetX = (canvasWidth - drawWidth) / 2;
        offsetY = 0;
      } else {
        drawWidth = canvasWidth;
        drawHeight = canvasWidth / sourceRatio;
        offsetX = 0;
        offsetY = (canvasHeight - drawHeight) / 2;
      }

      ctx.drawImage(source, offsetX, offsetY, drawWidth, drawHeight);
    },
    []
  );

  // 프레임 렌더링
  const renderFrame = useCallback(
    (currentTime: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const currentClip = getCurrentClip(currentTime, videoClips);
      if (!currentClip) return;

      const media = mediaItems.find((m) => m.id === currentClip.mediaId);
      if (!media) return;

      const clipTime = currentTime - currentClip.startTime + currentClip.trimStart;

      if (media.type === "image") {
        const img = media.element as HTMLImageElement;
        drawMediaToCanvas(ctx, img, canvas.width, canvas.height);
      } else if (media.type === "video") {
        const video = media.element as HTMLVideoElement;
        video.muted = true;
        video.volume = 0;

        if (Math.abs(video.currentTime - clipTime) > 0.1) {
          video.currentTime = clipTime;
        }

        drawMediaToCanvas(ctx, video, canvas.width, canvas.height);
      }
    },
    [videoClips, mediaItems, getCurrentClip, drawMediaToCanvas]
  );

  // 모든 오디오 정지 (단순화 - load() 제거)
  const stopAllAudio = useCallback(() => {
    mediaItems.forEach((media) => {
      if (media.type === "audio") {
        const audio = media.element as HTMLAudioElement;
        if (!audio.paused) {
          audio.pause();
        }
      } else if (media.type === "video") {
        const video = media.element as HTMLVideoElement;
        video.muted = true;
        video.volume = 0;
      }
    });
    currentAudioClipIdRef.current = null;
    currentAudioElementRef.current = null;
  }, [mediaItems]);

  // 오디오 동기화 (단순화)
  const syncAudio = useCallback(
    (currentTime: number, isPlaying: boolean) => {
      const currentAudioClip = getCurrentClip(currentTime, audioClips);

      // 오디오 클립이 없으면 현재 재생 중인 오디오 정지
      if (!currentAudioClip) {
        if (currentAudioElementRef.current && !currentAudioElementRef.current.paused) {
          currentAudioElementRef.current.pause();
        }
        currentAudioClipIdRef.current = null;
        currentAudioElementRef.current = null;
        return;
      }

      const media = mediaItems.find((m) => m.id === currentAudioClip.mediaId);
      if (!media || media.type !== "audio") {
        if (currentAudioElementRef.current && !currentAudioElementRef.current.paused) {
          currentAudioElementRef.current.pause();
        }
        currentAudioClipIdRef.current = null;
        currentAudioElementRef.current = null;
        return;
      }

      const audioElement = media.element as HTMLAudioElement;
      const clipTime = currentTime - currentAudioClip.startTime + currentAudioClip.trimStart;

      // 오디오 클립이 변경되었는지 확인
      const clipChanged = currentAudioClipIdRef.current !== currentAudioClip.id;

      if (clipChanged) {
        // 이전 오디오 정지 (현재 재생 중인 것만)
        if (currentAudioElementRef.current && currentAudioElementRef.current !== audioElement) {
          currentAudioElementRef.current.pause();
        }
        currentAudioClipIdRef.current = currentAudioClip.id;
        currentAudioElementRef.current = audioElement;

        // 새 오디오 시간 설정
        audioElement.currentTime = clipTime;
      }

      // 볼륨 설정
      audioElement.volume = playback.volume;

      if (isPlaying) {
        // 시간 동기화 (0.3초 이상 차이날 때만)
        if (!clipChanged && Math.abs(audioElement.currentTime - clipTime) > 0.3) {
          audioElement.currentTime = clipTime;
        }

        // 재생 시작 (정지 상태일 때만)
        if (audioElement.paused) {
          audioElement.play().catch(() => {
            // 자동재생 정책으로 인한 에러 무시
          });
        }
      } else {
        // 정지
        if (!audioElement.paused) {
          audioElement.pause();
        }
      }
    },
    [audioClips, mediaItems, getCurrentClip, playback.volume]
  );

  // 애니메이션 루프 - playback.isPlaying만 의존
  useEffect(() => {
    if (!playback.isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      stopAllAudio();
      renderFrame(playback.currentTime);
      return;
    }

    // 재생 시작 시 시간 초기화
    lastTimeRef.current = performance.now();
    let localCurrentTime = playback.currentTime;

    const animate = (now: number) => {
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      localCurrentTime += delta;

      if (localCurrentTime >= totalDuration) {
        onPlaybackUpdate({
          ...playback,
          isPlaying: false,
          currentTime: 0,
        });
        stopAllAudio();
        return;
      }

      // 상태 업데이트는 throttle (100ms마다)
      onPlaybackUpdate({
        ...playback,
        currentTime: localCurrentTime,
      });

      renderFrame(localCurrentTime);
      syncAudio(localCurrentTime, true);

      animationRef.current = requestAnimationFrame(animate);
    };

    // 오디오 시작
    syncAudio(playback.currentTime, true);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playback.isPlaying]); // playback.currentTime 제거!

  // 재생 위치 변경 시 (타임라인 클릭 등) - 정지 상태에서만
  useEffect(() => {
    if (!playback.isPlaying) {
      renderFrame(playback.currentTime);
      // 정지 상태에서는 오디오도 정지
      if (currentAudioElementRef.current && !currentAudioElementRef.current.paused) {
        currentAudioElementRef.current.pause();
      }
    }
  }, [playback.currentTime, playback.isPlaying, renderFrame]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      mediaItems.forEach((media) => {
        if (media.type === "audio") {
          (media.element as HTMLAudioElement).pause();
        }
      });
    };
  }, [mediaItems]);

  // 캔버스 크기 계산
  const canvasStyle = useMemo(() => {
    const maxWidth = 640;
    const maxHeight = 360;

    const ratio = aspectConfig.width / aspectConfig.height;

    let width: number;
    let height: number;

    if (ratio > maxWidth / maxHeight) {
      width = maxWidth;
      height = maxWidth / ratio;
    } else {
      height = maxHeight;
      width = maxHeight * ratio;
    }

    return { width, height };
  }, [aspectConfig]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center"
    >
      <div className="relative bg-black rounded-lg overflow-hidden shadow-lg">
        <canvas
          ref={canvasRef}
          width={aspectConfig.width / 2}
          height={aspectConfig.height / 2}
          style={{
            width: canvasStyle.width,
            height: canvasStyle.height,
          }}
          className="block"
        />

        {videoClips.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
            <svg
              className="w-12 h-12 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <span className="text-sm">미디어를 타임라인에 추가하세요</span>
          </div>
        )}
      </div>

      <div className="mt-2 text-xs text-slate-400">
        {aspectConfig.label} ({aspectConfig.width} × {aspectConfig.height})
      </div>
    </div>
  );
}
