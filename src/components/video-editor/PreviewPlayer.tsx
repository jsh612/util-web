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
import { downloadFile } from "@/utils/file-download";

interface ExportFunctions {
  exportStandard: () => Promise<void>;
  exportFast: () => Promise<void>;
}

interface PreviewPlayerProps {
  mediaItems: MediaItem[];
  timeline: TimelineState;
  playback: PlaybackState;
  aspectRatio: AspectRatio;
  onPlaybackUpdate: (playback: PlaybackState) => void;
  onExportReady?: (exportFns: ExportFunctions) => void;
}

export default function PreviewPlayer({
  mediaItems,
  timeline,
  playback,
  aspectRatio,
  onPlaybackUpdate,
  onExportReady,
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

  // 지원되는 mimeType 확인
  const getSupportedMimeType = useCallback(() => {
    const types = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
      "video/mp4",
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return null;
  }, []);

  // MP4로 내보내기 함수
  const exportToMP4 = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      alert("비디오를 내보낼 수 없습니다. 캔버스를 찾을 수 없습니다.");
      return;
    }

    // 브라우저 호환성 확인
    const supportedMimeType = getSupportedMimeType();
    if (!supportedMimeType) {
      alert("이 브라우저는 비디오 녹화를 지원하지 않습니다. Chrome 또는 Firefox를 사용해 주세요.");
      return;
    }

    // 비디오 트랙 확인
    const videoTrack = timeline.tracks.find((t) => t.type === "video");
    if (!videoTrack || videoTrack.clips.length === 0) {
      alert("타임라인에 비디오 클립이 없습니다.");
      return;
    }

    // 총 지속시간 계산
    let maxEnd = 0;
    timeline.tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        const end = clip.startTime + clip.duration;
        if (end > maxEnd) maxEnd = end;
      });
    });

    if (maxEnd === 0) {
      alert("내보낼 비디오가 없습니다.");
      return;
    }

    // 진행 상태 표시를 위한 요소들
    let progressDiv: HTMLDivElement | null = null;
    let progressBar: HTMLElement | null = null;
    let progressText: HTMLElement | null = null;
    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let isCancelled = false;

    // 리소스 정리 함수
    const cleanup = () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        stream = null;
      }
      if (audioContext && audioContext.state !== "closed") {
        audioContext.close().catch(() => {});
        audioContext = null;
      }
      if (progressDiv && document.body.contains(progressDiv)) {
        document.body.removeChild(progressDiv);
        progressDiv = null;
      }
    };

    try {
      // 진행 상태 표시
      progressDiv = document.createElement("div");
      progressDiv.className = "fixed inset-0 bg-black/70 flex items-center justify-center z-50";
      progressDiv.innerHTML = `
        <div class="bg-slate-800 p-6 rounded-lg text-center min-w-[320px]">
          <div class="text-white mb-2 font-medium text-lg">비디오 내보내기</div>

          <!-- 단계 표시 -->
          <div class="flex items-center justify-center gap-2 mb-4 text-xs">
            <div id="step-1" class="flex items-center gap-1 text-teal-400">
              <div class="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs font-bold">1</div>
              <span>렌더링</span>
            </div>
            <div class="w-8 h-0.5 bg-slate-600"></div>
            <div id="step-2" class="flex items-center gap-1 text-slate-500">
              <div class="w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center text-slate-400 text-xs font-bold">2</div>
              <span>MP4 변환</span>
            </div>
          </div>

          <div id="export-status" class="text-slate-300 mb-3 text-sm">프레임 렌더링 중...</div>
          <div class="w-64 h-2 bg-slate-700 rounded-full overflow-hidden mx-auto">
            <div id="export-progress-bar" class="h-full bg-teal-500 transition-all duration-100" style="width: 0%"></div>
          </div>
          <div id="export-progress-text" class="text-slate-400 text-sm mt-2">0% (0:00 / ${Math.floor(maxEnd / 60)}:${String(Math.floor(maxEnd % 60)).padStart(2, "0")})</div>
          <button id="export-cancel-btn" class="mt-4 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm transition-colors">취소</button>
        </div>
      `;
      document.body.appendChild(progressDiv);
      progressBar = progressDiv.querySelector("#export-progress-bar");
      progressText = progressDiv.querySelector("#export-progress-text");

      // 취소 버튼 이벤트
      const cancelBtn = progressDiv.querySelector("#export-cancel-btn");
      cancelBtn?.addEventListener("click", () => {
        isCancelled = true;
        cleanup();
      });

      // Canvas를 MediaStream으로 변환
      const fps = 30;
      stream = canvas.captureStream(fps);

      // 오디오 트랙 설정
      const audioTrackData = timeline.tracks.find((t) => t.type === "audio");
      const audioClipsList = audioTrackData?.clips.sort((a, b) => a.startTime - b.startTime) || [];

      // 오디오 믹싱을 위한 AudioContext (오디오가 있는 경우에만)
      if (audioClipsList.length > 0) {
        audioContext = new AudioContext({ sampleRate: 48000 });
        const destination = audioContext.createMediaStreamDestination();

        // 각 오디오 클립에 대해 새로운 Audio 요소 생성 (원본 보존)
        const audioSources: Array<{
          element: HTMLAudioElement;
          source: MediaElementAudioSourceNode;
          gainNode: GainNode;
          clip: TimelineClip;
        }> = [];

        for (const clip of audioClipsList) {
          const media = mediaItems.find((m) => m.id === clip.mediaId);
          if (media && media.type === "audio") {
            // 원본 오디오 요소를 복제하여 사용 (원본 보존)
            const originalAudio = media.element as HTMLAudioElement;
            const clonedAudio = new Audio(originalAudio.src);
            clonedAudio.crossOrigin = "anonymous";

            // 오디오가 로드될 때까지 대기
            await new Promise<void>((resolve) => {
              clonedAudio.addEventListener("loadeddata", () => resolve(), { once: true });
              clonedAudio.load();
            });

            const source = audioContext.createMediaElementSource(clonedAudio);
            const gainNode = audioContext.createGain();
            gainNode.gain.value = playback.volume;
            source.connect(gainNode);
            gainNode.connect(destination);

            audioSources.push({ element: clonedAudio, source, gainNode, clip });
          }
        }

        // 오디오 트랙을 비디오 스트림에 추가
        destination.stream.getAudioTracks().forEach((track) => {
          stream?.addTrack(track);
        });

        // 오디오 동기화 함수
        const syncAudioForExport = (time: number) => {
          for (const { element, gainNode, clip } of audioSources) {
            const clipStart = clip.startTime;
            const clipEnd = clip.startTime + clip.duration;

            if (time >= clipStart && time < clipEnd) {
              const clipTime = time - clipStart + clip.trimStart;
              gainNode.gain.value = playback.volume;

              if (Math.abs(element.currentTime - clipTime) > 0.15) {
                element.currentTime = clipTime;
              }
              if (element.paused) {
                element.play().catch(() => {});
              }
            } else {
              gainNode.gain.value = 0;
              if (!element.paused) {
                element.pause();
              }
            }
          }
        };

        // 렌더링 루프에서 사용할 오디오 동기화 함수 저장
        (window as unknown as Record<string, unknown>).__exportAudioSync = syncAudioForExport;
        (window as unknown as Record<string, unknown>).__exportAudioSources = audioSources;
      }

      // MediaRecorder 생성
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream, {
        mimeType: supportedMimeType,
        videoBitsPerSecond: 5000000, // 5Mbps
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      // 녹화 완료 Promise
      const recordingComplete = new Promise<Blob | null>((resolve) => {
        recorder.onstop = () => {
          if (isCancelled) {
            resolve(null);
            return;
          }
          const mimeType = supportedMimeType.includes("mp4") ? "video/mp4" : "video/webm";
          const blob = new Blob(chunks, { type: mimeType });
          resolve(blob);
        };
      });

      // 녹화 시작
      recorder.start(100);

      // 프레임별 렌더링
      const frameDuration = 1 / fps;
      let currentTime = 0;

      const renderLoop = () => {
        return new Promise<void>((resolve) => {
          const step = () => {
            if (isCancelled) {
              recorder.stop();
              resolve();
              return;
            }

            if (currentTime >= maxEnd) {
              recorder.stop();
              resolve();
              return;
            }

            // 비디오 프레임 렌더링
            renderFrame(currentTime);

            // 오디오 동기화
            const syncFn = (window as unknown as Record<string, unknown>).__exportAudioSync as ((time: number) => void) | undefined;
            if (syncFn) {
              syncFn(currentTime);
            }

            // 진행률 업데이트
            const progress = (currentTime / maxEnd) * 100;
            const currentMin = Math.floor(currentTime / 60);
            const currentSec = Math.floor(currentTime % 60);
            const totalMin = Math.floor(maxEnd / 60);
            const totalSec = Math.floor(maxEnd % 60);

            if (progressBar) progressBar.style.width = `${progress}%`;
            if (progressText) {
              progressText.textContent = `${Math.round(progress)}% (${currentMin}:${String(currentSec).padStart(2, "0")} / ${totalMin}:${String(totalSec).padStart(2, "0")})`;
            }

            currentTime += frameDuration;
            setTimeout(step, frameDuration * 1000);
          };

          step();
        });
      };

      await renderLoop();
      const blob = await recordingComplete;

      // 오디오 리소스 정리
      const audioSources = (window as unknown as Record<string, unknown>).__exportAudioSources as Array<{ element: HTMLAudioElement }> | undefined;
      if (audioSources) {
        audioSources.forEach(({ element }) => {
          element.pause();
          element.src = "";
        });
      }
      delete (window as unknown as Record<string, unknown>).__exportAudioSync;
      delete (window as unknown as Record<string, unknown>).__exportAudioSources;

      if (!blob || isCancelled) {
        cleanup();
        return;
      }

      // 2단계: 서버에서 MP4로 변환
      const step1El = progressDiv?.querySelector("#step-1");
      const step2El = progressDiv?.querySelector("#step-2");
      const statusEl = progressDiv?.querySelector("#export-status");

      if (step1El) {
        step1El.classList.remove("text-teal-400");
        step1El.classList.add("text-slate-500");
        const circle1 = step1El.querySelector("div");
        if (circle1) {
          circle1.classList.remove("bg-teal-500");
          circle1.classList.add("bg-green-500");
          circle1.innerHTML = "✓";
        }
      }
      if (step2El) {
        step2El.classList.remove("text-slate-500");
        step2El.classList.add("text-teal-400");
        const circle2 = step2El.querySelector("div");
        if (circle2) {
          circle2.classList.remove("bg-slate-600", "text-slate-400");
          circle2.classList.add("bg-teal-500", "text-white");
        }
      }
      if (statusEl) {
        statusEl.textContent = "MP4로 변환 중... (서버 처리)";
      }
      if (progressText) {
        progressText.textContent = "FFmpeg 인코딩 진행 중...";
      }
      if (progressBar) {
        progressBar.style.width = "100%";
        progressBar.classList.add("animate-pulse");
      }

      // API로 WebM 업로드 및 MP4 변환
      const formData = new FormData();
      formData.append("video", blob, "video.webm");
      formData.append("quality", "high");

      const response = await fetch("/api/v1/video/convert", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "변환 실패" }));
        throw new Error(errorData.error || "MP4 변환에 실패했습니다.");
      }

      // MP4 파일 다운로드
      const mp4Blob = await response.blob();
      const conversionTime = response.headers.get("X-Conversion-Time");

      // 파일명 생성
      const date = new Date();
      const fileName = `video-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}-${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}.mp4`;

      const sizeInfo = `${(mp4Blob.size / (1024 * 1024)).toFixed(2)}MB`;
      const timeInfo = conversionTime ? `, 변환 ${conversionTime}초` : "";

      // 완료 상태로 UI 업데이트
      if (step1El) {
        const circle1 = step1El.querySelector("div");
        if (circle1) {
          circle1.classList.remove("bg-teal-500");
          circle1.classList.add("bg-green-500");
          circle1.innerHTML = "✓";
        }
      }
      if (step2El) {
        step2El.classList.remove("text-slate-500");
        step2El.classList.add("text-green-400");
        const circle2 = step2El.querySelector("div");
        if (circle2) {
          circle2.classList.remove("bg-slate-600", "text-slate-400");
          circle2.classList.add("bg-green-500", "text-white");
          circle2.innerHTML = "✓";
        }
      }
      if (statusEl) {
        statusEl.textContent = `렌더링 완료! (${sizeInfo}${timeInfo})`;
      }
      if (progressText) {
        progressText.textContent = "다운로드 버튼을 클릭하세요";
      }
      if (progressBar) {
        progressBar.style.width = "100%";
        progressBar.classList.remove("animate-pulse");
        progressBar.classList.add("bg-green-500");
      }

      // 취소 버튼 제거하고 다운로드 버튼 추가
      const existingCancelBtn = progressDiv?.querySelector("#export-cancel-btn");
      if (existingCancelBtn) {
        existingCancelBtn.remove();
      }

      // 다운로드 버튼 추가
      const downloadBtn = document.createElement("button");
      downloadBtn.id = "export-download-btn";
      downloadBtn.className = "mt-4 px-6 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-medium transition-colors";
      downloadBtn.textContent = "다운로드";
      
      downloadBtn.addEventListener("click", async () => {
        try {
          await downloadFile(mp4Blob, fileName, {
            description: "MP4 Video",
            accept: { "video/mp4": [".mp4"] },
          });
          console.log(`✅ 일반 내보내기 완료: ${sizeInfo}${timeInfo}`);
          cleanup();
        } catch (error) {
          console.error("다운로드 오류:", error);
        }
      });

      const buttonContainer = progressDiv?.querySelector(".bg-slate-800");
      if (buttonContainer) {
        buttonContainer.appendChild(downloadBtn);
      }
    } catch (error) {
      console.error("비디오 내보내기 오류:", error);
      cleanup();
      alert("비디오 내보내기 중 오류가 발생했습니다: " + (error instanceof Error ? error.message : String(error)));
    }
  }, [timeline, mediaItems, renderFrame, playback.volume, getSupportedMimeType]);

  // FFmpeg 직접 렌더링 (빠른 내보내기)
  const exportWithFFmpeg = useCallback(async () => {
    // 비디오 트랙 확인
    const videoTrack = timeline.tracks.find((t) => t.type === "video");
    if (!videoTrack || videoTrack.clips.length === 0) {
      alert("타임라인에 비디오 클립이 없습니다.");
      return;
    }

    // 진행 상태 표시
    const progressDiv = document.createElement("div");
    progressDiv.className = "fixed inset-0 bg-black/70 flex items-center justify-center z-50";
    progressDiv.innerHTML = `
      <div class="bg-slate-800 p-6 rounded-lg text-center min-w-[320px]">
        <div class="text-white mb-2 font-medium text-lg">빠른 내보내기</div>
        <div class="flex items-center justify-center gap-2 mb-4">
          <div class="w-2 h-2 bg-teal-500 rounded-full animate-bounce"></div>
          <div class="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
          <div class="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
        </div>
        <div id="ffmpeg-status" class="text-slate-300 mb-3 text-sm">미디어 파일 업로드 중...</div>
        <div class="text-slate-500 text-xs">FFmpeg 서버 렌더링</div>
      </div>
    `;
    document.body.appendChild(progressDiv);
    const statusEl = progressDiv.querySelector("#ffmpeg-status");

    try {
      // FormData 구성
      const formData = new FormData();

      // 타임라인 데이터
      const timelineData = {
        tracks: timeline.tracks.map((track) => ({
          id: track.id,
          type: track.type,
          clips: track.clips,
        })),
        aspectRatio,
        outputWidth: aspectConfig.width,
        outputHeight: aspectConfig.height,
      };
      formData.append("timeline", JSON.stringify(timelineData));

      // 미디어 정보
      const mediaInfo: Record<string, { id: string; type: string; name: string; duration: number }> = {};

      // 사용 중인 미디어 ID 수집
      const usedMediaIds = new Set<string>();
      timeline.tracks.forEach((track) => {
        track.clips.forEach((clip) => {
          usedMediaIds.add(clip.mediaId);
        });
      });

      // 미디어 파일 추가
      for (const mediaId of usedMediaIds) {
        const media = mediaItems.find((m) => m.id === mediaId);
        if (media) {
          formData.append(`media_${mediaId}`, media.file);
          mediaInfo[mediaId] = {
            id: media.id,
            type: media.type,
            name: media.name,
            duration: media.duration,
          };
        }
      }
      formData.append("mediaInfo", JSON.stringify(mediaInfo));

      if (statusEl) statusEl.textContent = "서버에서 렌더링 중...";

      // API 호출
      const response = await fetch("/api/v1/video/render", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "렌더링 실패" }));
        throw new Error(errorData.error || "FFmpeg 렌더링에 실패했습니다.");
      }

      // MP4 파일 다운로드
      const mp4Blob = await response.blob();
      const renderTime = response.headers.get("X-Render-Time");

      // 파일명 생성
      const date = new Date();
      const fileName = `video-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}-${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}.mp4`;

      const sizeInfo = `${(mp4Blob.size / (1024 * 1024)).toFixed(2)}MB`;
      const timeInfo = renderTime ? ` (${renderTime}초)` : "";

      // 완료 상태로 UI 업데이트
      if (statusEl) {
        statusEl.textContent = `렌더링 완료! (${sizeInfo}${timeInfo})`;
      }

      // 다운로드 버튼 추가
      const downloadBtn = document.createElement("button");
      downloadBtn.id = "ffmpeg-download-btn";
      downloadBtn.className = "mt-4 px-6 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-medium transition-colors";
      downloadBtn.textContent = "다운로드";
      
      downloadBtn.addEventListener("click", async () => {
        try {
          await downloadFile(mp4Blob, fileName, {
            description: "MP4 Video",
            accept: { "video/mp4": [".mp4"] },
          });
          console.log(`✅ 빠른 내보내기 완료: ${sizeInfo}${timeInfo}`);
          if (document.body.contains(progressDiv)) {
            document.body.removeChild(progressDiv);
          }
        } catch (error) {
          console.error("다운로드 오류:", error);
        }
      });

      const buttonContainer = progressDiv.querySelector(".bg-slate-800");
      if (buttonContainer) {
        buttonContainer.appendChild(downloadBtn);
      }
    } catch (error) {
      console.error("FFmpeg 렌더링 오류:", error);
      if (document.body.contains(progressDiv)) {
        document.body.removeChild(progressDiv);
      }
      alert("FFmpeg 렌더링 중 오류가 발생했습니다: " + (error instanceof Error ? error.message : String(error)));
    }
  }, [timeline, mediaItems, aspectRatio, aspectConfig]);

  // Export 함수들을 부모에 전달
  useEffect(() => {
    if (onExportReady) {
      onExportReady({
        exportStandard: exportToMP4,
        exportFast: exportWithFFmpeg,
      });
    }
  }, [onExportReady, exportToMP4, exportWithFFmpeg]);

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
