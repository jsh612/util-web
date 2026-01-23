import { exec } from "child_process";
import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import os from "os";
import path from "path";
import util from "util";

const execPromise = util.promisify(exec);

// 최대 파일 크기 (500MB)
const MAX_FILE_SIZE = 500 * 1024 * 1024;

/**
 * WebM을 유튜브 업로드용 MP4로 변환
 * - 비디오 코덱: H.264 (libx264)
 * - 오디오 코덱: AAC
 * - 컨테이너: MP4
 */
export async function POST(request: NextRequest) {
  const tempDir = path.join(os.tmpdir(), `video-convert-${Date.now()}`);

  try {
    const formData = await request.formData();
    const videoFile = formData.get("video") as File;
    const quality = (formData.get("quality") as string) || "high";

    if (!videoFile) {
      return NextResponse.json(
        { error: "비디오 파일이 필요합니다." },
        { status: 400 }
      );
    }

    // 파일 크기 체크
    if (videoFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "파일 크기가 500MB를 초과합니다." },
        { status: 400 }
      );
    }

    // 임시 디렉토리 생성
    fs.mkdirSync(tempDir, { recursive: true });

    // 입력 파일 저장
    const inputExt = path.extname(videoFile.name) || ".webm";
    const inputPath = path.join(tempDir, `input${inputExt}`);
    const outputPath = path.join(tempDir, "output.mp4");

    const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
    fs.writeFileSync(inputPath, videoBuffer);

    // 품질별 설정
    const qualitySettings: Record<string, { crf: number; preset: string; audioBitrate: string }> = {
      low: { crf: 28, preset: "faster", audioBitrate: "128k" },
      medium: { crf: 23, preset: "medium", audioBitrate: "192k" },
      high: { crf: 18, preset: "slow", audioBitrate: "256k" },
    };

    const settings = qualitySettings[quality] || qualitySettings.high;

    // FFmpeg 명령어 구성 (유튜브 권장 사양)
    const command = [
      "ffmpeg",
      `-i "${inputPath}"`,
      "-y", // 덮어쓰기
      // 비디오 설정
      "-c:v libx264", // H.264 코덱
      `-crf ${settings.crf}`, // 품질 (낮을수록 고품질)
      `-preset ${settings.preset}`, // 인코딩 속도/품질 트레이드오프
      "-profile:v high", // H.264 프로파일
      "-level:v 4.1", // H.264 레벨
      "-pix_fmt yuv420p", // 픽셀 포맷 (호환성)
      "-movflags +faststart", // 웹 스트리밍 최적화
      // 오디오 설정
      "-c:a aac", // AAC 코덱
      `-b:a ${settings.audioBitrate}`, // 오디오 비트레이트
      "-ar 48000", // 샘플레이트
      "-ac 2", // 스테레오
      `"${outputPath}"`,
    ].join(" ");

    console.log(`🎬 비디오 변환 시작: ${videoFile.name} (${quality} 품질)`);
    const startTime = Date.now();

    await execPromise(command, {
      maxBuffer: 50 * 1024 * 1024, // 50MB 버퍼
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ 비디오 변환 완료: ${duration}초 소요`);

    // 결과 파일 확인
    if (!fs.existsSync(outputPath)) {
      throw new Error("변환된 비디오 파일이 생성되지 않았습니다.");
    }

    // 파일 읽기
    const outputContent = fs.readFileSync(outputPath);
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
        "X-Conversion-Time": duration,
      },
    });
  } catch (error) {
    // 임시 파일 정리
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    console.error("비디오 변환 오류:", error);

    if (error instanceof Error) {
      // FFmpeg 관련 오류 메시지 파싱
      if (error.message.includes("ffmpeg")) {
        return NextResponse.json(
          { error: "비디오 변환 중 오류가 발생했습니다. FFmpeg 처리 실패." },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "알 수 없는 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * FFmpeg 설치 여부 확인
 */
export async function GET() {
  try {
    const { stdout } = await execPromise("ffmpeg -version");
    const versionMatch = stdout.match(/ffmpeg version (\S+)/);
    const version = versionMatch ? versionMatch[1] : "unknown";

    // libx264 지원 확인
    const hasH264 = stdout.includes("libx264");

    return NextResponse.json({
      available: true,
      version,
      h264Support: hasH264,
      maxFileSize: MAX_FILE_SIZE,
    });
  } catch {
    return NextResponse.json({
      available: false,
      error: "FFmpeg가 설치되어 있지 않습니다.",
    });
  }
}
