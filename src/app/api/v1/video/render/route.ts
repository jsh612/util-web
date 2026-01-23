import { exec } from "child_process";
import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import os from "os";
import path from "path";
import util from "util";

const execPromise = util.promisify(exec);

// 타임라인 클립 타입
interface TimelineClipData {
  id: string;
  mediaId: string;
  trackId: string;
  startTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
}

// 미디어 정보 타입
interface MediaInfo {
  id: string;
  type: "image" | "video" | "audio";
  name: string;
  duration: number;
}

// 타임라인 데이터 타입
interface TimelineData {
  tracks: Array<{
    id: string;
    type: "video" | "audio";
    clips: TimelineClipData[];
  }>;
  aspectRatio: string;
  outputWidth: number;
  outputHeight: number;
}

/**
 * 서버 FFmpeg 직접 렌더링 API
 * 원본 미디어 파일 + 타임라인 JSON을 받아서 FFmpeg로 직접 합성
 */
export async function POST(request: NextRequest) {
  const tempDir = path.join(os.tmpdir(), `video-render-${Date.now()}`);

  try {
    const formData = await request.formData();
    const timelineJson = formData.get("timeline") as string;
    const mediaInfoJson = formData.get("mediaInfo") as string;

    if (!timelineJson) {
      return NextResponse.json(
        { error: "타임라인 데이터가 필요합니다." },
        { status: 400 }
      );
    }

    const timeline: TimelineData = JSON.parse(timelineJson);
    const mediaInfoMap: Record<string, MediaInfo> = JSON.parse(mediaInfoJson || "{}");

    // 임시 디렉토리 생성
    fs.mkdirSync(tempDir, { recursive: true });

    // 미디어 파일들 저장 및 경로 매핑
    const mediaPathMap: Record<string, string> = {};
    const entries = Array.from(formData.entries());

    for (const [key, value] of entries) {
      if (key.startsWith("media_") && value instanceof File) {
        const mediaId = key.replace("media_", "");
        const ext = path.extname(value.name) || getExtensionFromType(value.type);
        const filePath = path.join(tempDir, `${mediaId}${ext}`);
        const buffer = Buffer.from(await value.arrayBuffer());
        fs.writeFileSync(filePath, buffer);
        mediaPathMap[mediaId] = filePath;
      }
    }

    // 비디오/오디오 트랙 분리
    const videoTrack = timeline.tracks.find((t) => t.type === "video");
    const audioTrack = timeline.tracks.find((t) => t.type === "audio");

    if (!videoTrack || videoTrack.clips.length === 0) {
      throw new Error("비디오 클립이 없습니다.");
    }

    const outputPath = path.join(tempDir, "output.mp4");
    const { width, height } = { width: timeline.outputWidth, height: timeline.outputHeight };

    console.log(`🎬 FFmpeg 직접 렌더링 시작 (${width}x${height})`);
    const startTime = Date.now();

    // 비디오 클립들을 시간순 정렬
    const sortedVideoClips = [...videoTrack.clips].sort((a, b) => a.startTime - b.startTime);

    // 각 클립을 개별 파일로 처리
    const clipPaths: string[] = [];

    for (let i = 0; i < sortedVideoClips.length; i++) {
      const clip = sortedVideoClips[i];
      const mediaPath = mediaPathMap[clip.mediaId];
      const mediaInfo = mediaInfoMap[clip.mediaId];

      if (!mediaPath) {
        console.warn(`미디어 파일을 찾을 수 없음: ${clip.mediaId}`);
        continue;
      }

      const clipOutputPath = path.join(tempDir, `clip_${i}.mp4`);

      if (mediaInfo?.type === "image") {
        // 이미지를 비디오로 변환
        const cmd = [
          "ffmpeg -y",
          `-loop 1 -t ${clip.duration} -i "${mediaPath}"`,
          `-vf "scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1"`,
          "-c:v libx264 -preset fast -crf 18",
          "-pix_fmt yuv420p",
          "-r 30",
          `"${clipOutputPath}"`,
        ].join(" ");

        await execPromise(cmd, { maxBuffer: 50 * 1024 * 1024 });
      } else {
        // 비디오 클립 처리 (트림 적용)
        const cmd = [
          "ffmpeg -y",
          `-ss ${clip.trimStart} -t ${clip.duration} -i "${mediaPath}"`,
          `-vf "scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1"`,
          "-c:v libx264 -preset fast -crf 18",
          "-pix_fmt yuv420p",
          "-an", // 비디오 트랙의 오디오는 제거 (별도 오디오 트랙 사용)
          "-r 30",
          `"${clipOutputPath}"`,
        ].join(" ");

        await execPromise(cmd, { maxBuffer: 50 * 1024 * 1024 });
      }

      clipPaths.push(clipOutputPath);
    }

    if (clipPaths.length === 0) {
      throw new Error("처리할 클립이 없습니다.");
    }

    // 클립들을 concat으로 합치기
    const concatListPath = path.join(tempDir, "concat_list.txt");
    const concatContent = clipPaths.map((p) => `file '${p}'`).join("\n");
    fs.writeFileSync(concatListPath, concatContent);

    const videoOnlyPath = path.join(tempDir, "video_only.mp4");
    const concatCmd = [
      "ffmpeg -y",
      `-f concat -safe 0 -i "${concatListPath}"`,
      "-c:v libx264 -preset fast -crf 18",
      "-pix_fmt yuv420p",
      `"${videoOnlyPath}"`,
    ].join(" ");

    await execPromise(concatCmd, { maxBuffer: 50 * 1024 * 1024 });

    // 오디오 트랙 처리
    let finalOutputPath = videoOnlyPath;

    if (audioTrack && audioTrack.clips.length > 0) {
      const sortedAudioClips = [...audioTrack.clips].sort((a, b) => a.startTime - b.startTime);

      // 총 비디오 길이 계산
      const totalDuration = sortedVideoClips.reduce(
        (max, clip) => Math.max(max, clip.startTime + clip.duration),
        0
      );

      // 복잡한 오디오 필터 구성
      const audioInputs: string[] = [];
      const filterParts: string[] = [];

      for (let i = 0; i < sortedAudioClips.length; i++) {
        const clip = sortedAudioClips[i];
        const mediaPath = mediaPathMap[clip.mediaId];

        if (!mediaPath) continue;

        audioInputs.push(`-ss ${clip.trimStart} -t ${clip.duration} -i "${mediaPath}"`);
        // adelay는 밀리초 단위
        const delayMs = Math.round(clip.startTime * 1000);
        filterParts.push(`[${i + 1}:a]adelay=${delayMs}|${delayMs}[a${i}]`);
      }

      if (audioInputs.length > 0) {
        const mixInputs = filterParts.map((_, i) => `[a${i}]`).join("");
        const filterComplex = [
          ...filterParts,
          `${mixInputs}amix=inputs=${audioInputs.length}:duration=longest[aout]`,
        ].join(";");

        const audioMixCmd = [
          "ffmpeg -y",
          `-i "${videoOnlyPath}"`,
          audioInputs.join(" "),
          `-filter_complex "${filterComplex}"`,
          `-map 0:v -map "[aout]"`,
          "-c:v copy",
          "-c:a aac -b:a 192k",
          `-t ${totalDuration}`,
          `"${outputPath}"`,
        ].join(" ");

        try {
          await execPromise(audioMixCmd, { maxBuffer: 50 * 1024 * 1024 });
          finalOutputPath = outputPath;
        } catch (audioError) {
          console.warn("오디오 믹싱 실패, 비디오만 출력:", audioError);
          // 오디오 믹싱 실패 시 비디오만 출력
          fs.copyFileSync(videoOnlyPath, outputPath);
          finalOutputPath = outputPath;
        }
      }
    } else {
      // 오디오 없이 비디오만
      fs.copyFileSync(videoOnlyPath, outputPath);
      finalOutputPath = outputPath;
    }

    // 최종 출력 파일에 faststart 적용
    const finalPath = path.join(tempDir, "final.mp4");
    const faststartCmd = [
      "ffmpeg -y",
      `-i "${finalOutputPath}"`,
      "-c copy -movflags +faststart",
      `"${finalPath}"`,
    ].join(" ");

    await execPromise(faststartCmd, { maxBuffer: 50 * 1024 * 1024 });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ FFmpeg 렌더링 완료: ${duration}초 소요`);

    // 결과 파일 읽기
    if (!fs.existsSync(finalPath)) {
      throw new Error("렌더링된 비디오 파일이 생성되지 않았습니다.");
    }

    const outputContent = fs.readFileSync(finalPath);
    const outputSize = outputContent.length;

    // 임시 파일 정리
    fs.rmSync(tempDir, { recursive: true, force: true });

    // 파일명 생성
    const date = new Date();
    const fileName = `video-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}-${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}.mp4`;

    console.log(`📦 출력 파일 크기: ${(outputSize / (1024 * 1024)).toFixed(2)}MB`);

    return new NextResponse(new Uint8Array(outputContent), {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "X-File-Size": outputSize.toString(),
        "X-Render-Time": duration,
      },
    });
  } catch (error) {
    // 임시 파일 정리
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    console.error("FFmpeg 렌더링 오류:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "렌더링 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}

function getExtensionFromType(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "audio/ogg": ".ogg",
    "audio/aac": ".aac",
  };
  return map[mimeType] || ".bin";
}
