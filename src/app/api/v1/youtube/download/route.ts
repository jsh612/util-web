import { exec } from "child_process";
import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import os from "os";
import path from "path";
import util from "util";

const execPromise = util.promisify(exec);

/**
 * YouTube 다운로드 API
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const youtubeUrl = formData.get("youtubeUrl") as string;
    const numParts = parseInt((formData.get("numParts") as string) || "1", 10);

    if (!youtubeUrl) {
      return NextResponse.json(
        { error: "YouTube URL이 필요합니다." },
        { status: 400 },
      );
    }

    // URL 유효성 검사
    if (
      !youtubeUrl.includes("youtube.com") &&
      !youtubeUrl.includes("youtu.be")
    ) {
      return NextResponse.json(
        { error: "유효한 YouTube URL이 아닙니다." },
        { status: 400 },
      );
    }

    // yt-dlp 설치 확인
    try {
      await execPromise("which yt-dlp");
    } catch {
      return NextResponse.json(
        {
          error:
            "yt-dlp가 설치되어 있지 않습니다. 'brew install yt-dlp'로 설치해주세요.",
        },
        { status: 500 },
      );
    }

    // ffmpeg 설치 확인 (분할 기능 사용 시)
    if (numParts > 1) {
      try {
        await execPromise("which ffmpeg");
      } catch {
        return NextResponse.json(
          {
            error:
              "ffmpeg이 설치되어 있지 않습니다. 'brew install ffmpeg'로 설치해주세요.",
          },
          { status: 500 },
        );
      }
    }

    // 임시 디렉토리 생성
    const tempDir = path.join(os.tmpdir(), `youtube-dl-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    try {
      // 프로젝트 루트의 temp-videos 디렉토리 경로
      const projectRoot = process.cwd();
      const saveDir = path.join(projectRoot, "temp-videos");

      // 저장 경로가 없으면 생성
      if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir, { recursive: true });
      }

      // 다운로드 포맷 옵션 (우선순위 순서)
      const downloadFormatOptions = [
        "bestvideo[vcodec^=avc1][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "bestvideo+bestaudio/best",
        "best",
      ];

      // 파일명 먼저 가져오기
      let filenameOnly: string;
      try {
        const { stdout } = await execPromise(
          `yt-dlp --get-filename -o '%(title)s.%(ext)s' -- "${youtubeUrl}"`,
        );
        filenameOnly = stdout.trim();
        filenameOnly = path.basename(filenameOnly);
      } catch {
        throw new Error(
          "파일명을 가져오는 데 실패했습니다. URL을 확인해주세요.",
        );
      }

      const fullPath = path.join(saveDir, filenameOnly);

      // 여러 포맷 옵션을 순차적으로 시도
      let downloadSuccess = false;
      for (const formatOption of downloadFormatOptions) {
        try {
          await execPromise(
            `yt-dlp -o "${fullPath}" -f "${formatOption}" --no-write-subs --no-write-auto-subs -- "${youtubeUrl}"`,
          );

          if (fs.existsSync(fullPath)) {
            downloadSuccess = true;
            break;
          }
        } catch {
          // 다음 옵션 시도
          continue;
        }
      }

      if (!downloadSuccess) {
        throw new Error(
          "다운로드에 실패했습니다. 동영상이 비공개이거나 제한되어 있을 수 있습니다.",
        );
      }

      const result: {
        success: boolean;
        filePath: string;
        fileName: string;
        fileSize: number;
        parts?: Array<{ path: string; name: string; size: number }>;
      } = {
        success: true,
        filePath: fullPath,
        fileName: filenameOnly,
        fileSize: fs.statSync(fullPath).size,
      };

      // 분할 처리
      if (numParts > 1) {
        // ffprobe로 동영상 길이 가져오기
        let duration: number;
        try {
          const { stdout } = await execPromise(
            `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${fullPath}"`,
          );
          duration = parseFloat(stdout.trim());
        } catch {
          throw new Error("동영상의 길이를 가져올 수 없습니다.");
        }

        const durationInt = Math.floor(duration);
        const partDuration = Math.floor(durationInt / numParts);

        if (partDuration === 0) {
          throw new Error(
            `동영상 길이가 너무 짧아 ${numParts}개로 분할할 수 없습니다.`,
          );
        }

        const basename = fullPath.substring(0, fullPath.lastIndexOf("."));
        const extension = path.extname(filenameOnly);

        const parts: Array<{ path: string; name: string; size: number }> = [];

        for (let i = 1; i <= numParts; i++) {
          const startTime = (i - 1) * partDuration;
          const outputFilename = `${basename}_part${i}${extension}`;

          try {
            if (i < numParts) {
              await execPromise(
                `ffmpeg -y -i "${fullPath}" -ss ${startTime} -t ${partDuration} -c copy "${outputFilename}"`,
              );
            } else {
              await execPromise(
                `ffmpeg -y -i "${fullPath}" -ss ${startTime} -c copy "${outputFilename}"`,
              );
            }

            if (fs.existsSync(outputFilename)) {
              parts.push({
                path: outputFilename,
                name: path.basename(outputFilename),
                size: fs.statSync(outputFilename).size,
              });
            }
          } catch (error) {
            console.error(`파트 ${i} 생성 실패:`, error);
          }
        }

        result.parts = parts;
      }

      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof Error) {
        console.error("YouTube 다운로드 오류:", error.message);
        return NextResponse.json(
          { error: `다운로드 실패: ${error.message}` },
          { status: 500 },
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("API 오류:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
