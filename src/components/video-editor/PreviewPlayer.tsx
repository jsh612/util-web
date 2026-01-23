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
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

      // 비율 유지하면서 캔버스에 맞추기 (cover 방식)
      const sourceRatio = sourceWidth / sourceHeight;
      const canvasRatio = canvasWidth / canvasHeight;

      let drawWidth: number;
      let drawHeight: number;
      let offsetX: number;
      let offsetY: number;

      if (sourceRatio > canvasRatio) {
        // 소스가 더 넓음 -> 높이 맞추고 좌우 자르기
        drawHeight = canvasHeight;
        drawWidth = canvasHeight * sourceRatio;
        offsetX = (canvasWidth - drawWidth) / 2;
        offsetY = 0;
      } else {
        // 소스가 더 높음 -> 너비 맞추고 상하 자르기
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

      // 배경 클리어
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 현재 시간에 해당하는 비디오 클립 찾기
      const currentClip = getCurrentClip(currentTime, videoClips);

      if (!currentClip) {
        // 클립이 없으면 검은 화면
        return;
      }

      const media = mediaItems.find((m) => m.id === currentClip.mediaId);
      if (!media) return;

      // 클립 내부 시간 계산
      const clipTime = currentTime - currentClip.startTime + currentClip.trimStart;

      if (media.type === "image") {
        const img = media.element as HTMLImageElement;
        drawMediaToCanvas(ctx, img, canvas.width, canvas.height);
      } else if (media.type === "video") {
        const video = media.element as HTMLVideoElement;

        // 비디오 시간 설정 (seeking)
        if (Math.abs(video.currentTime - clipTime) > 0.1) {
          video.currentTime = clipTime;
        }

        drawMediaToCanvas(ctx, video, canvas.width, canvas.height);
      }
    },
    [videoClips, mediaItems, getCurrentClip, drawMediaToCanvas]
  );

  // 오디오 동기화
  const syncAudio = useCallback(
    (currentTime: number, isPlaying: boolean) => {
      const currentAudioClip = getCurrentClip(currentTime, audioClips);

      if (!currentAudioClip) {
        // 현재 오디오 클립이 없으면 오디오 정지
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        return;
      }

      const media = mediaItems.find((m) => m.id === currentAudioClip.mediaId);
      if (!media || media.type !== "audio") return;

      const audioElement = media.element as HTMLAudioElement;
      const clipTime =
        currentTime - currentAudioClip.startTime + currentAudioClip.trimStart;

      // 새로운 오디오 클립이면 교체
      if (audioRef.current !== audioElement) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        audioRef.current = audioElement;
      }

      // 시간 동기화
      if (Math.abs(audioElement.currentTime - clipTime) > 0.1) {
        audioElement.currentTime = clipTime;
      }

      // 재생 상태 동기화
      if (isPlaying && audioElement.paused) {
        audioElement.play().catch(() => {});
      } else if (!isPlaying && !audioElement.paused) {
        audioElement.pause();
      }
    },
    [audioClips, mediaItems, getCurrentClip]
  );

  // 애니메이션 루프
  useEffect(() => {
    if (!playback.isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      // 오디오 정지
      if (audioRef.current) {
        audioRef.current.pause();
      }
      // 현재 프레임만 렌더링
      renderFrame(playback.currentTime);
      return;
    }

    lastTimeRef.current = performance.now();

    const animate = (now: number) => {
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      const newTime = playback.currentTime + delta;

      if (newTime >= totalDuration) {
        // 재생 완료
        onPlaybackUpdate({
          ...playback,
          isPlaying: false,
          currentTime: 0,
        });
        return;
      }

      onPlaybackUpdate({
        ...playback,
        currentTime: newTime,
      });

      renderFrame(newTime);
      syncAudio(newTime, true);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    playback.isPlaying,
    playback.currentTime,
    totalDuration,
    onPlaybackUpdate,
    renderFrame,
    syncAudio,
    playback,
  ]);

  // 재생 상태가 아닐 때 현재 프레임 렌더링
  useEffect(() => {
    if (!playback.isPlaying) {
      renderFrame(playback.currentTime);
      syncAudio(playback.currentTime, false);
    }
  }, [playback.currentTime, playback.isPlaying, renderFrame, syncAudio]);

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
      {/* 미리보기 캔버스 */}
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

        {/* 클립 없음 표시 */}
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

      {/* 비율 표시 */}
      <div className="mt-2 text-xs text-slate-400">
        {aspectConfig.label} ({aspectConfig.width} × {aspectConfig.height})
      </div>
    </div>
  );
}
