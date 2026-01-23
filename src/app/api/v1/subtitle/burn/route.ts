import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import util from "util";

const execPromise = util.promisify(exec);

/**
 * 자막 스타일 설정
 */
const FONT_NAME = "Arial";
const FONT_SIZE = 13;
const REF_WIDTH = 1080;
const REF_HEIGHT = 1920;
const MARGIN_BOTTOM_RATIO = 0.05;
const MARGIN_V = Math.floor(REF_HEIGHT * MARGIN_BOTTOM_RATIO);

const STYLE_OPTIONS = [
  `Fontname=${FONT_NAME}`,
  `Fontsize=${FONT_SIZE}`,
  `PrimaryColour=&H00FFFFFF`,
  `OutlineColour=&H00000000`,
  `BackColour=&H80000000`,
  `Bold=1`,
  `Italic=0`,
  `Alignment=2`,
  `BorderStyle=1`,
  `Outline=4`,
  `Shadow=0`,
  `MarginV=${MARGIN_V}`,
  `MarginL=20`,
  `MarginR=20`,
];

const FORCE_STYLE = STYLE_OPTIONS.join("\\,");

/**
 * 화자별 색상 팔레트
 */
const SPEAKER_PALETTE = [
  "#FFE082",
  "#80DEEA",
  "#FFAB91",
  "#CE93D8",
  "#A5D6A7",
];

const speakerColorMap: Record<string, string> = {
  내레이션: "#FFFFFF",
};

let paletteIndex = 0;

function getColorForSpeaker(name: string): string {
  if (speakerColorMap[name]) {
    return speakerColorMap[name];
  }
  const color = SPEAKER_PALETTE[paletteIndex % SPEAKER_PALETTE.length];
  speakerColorMap[name] = color;
  paletteIndex++;
  return color;
}

/**
 * SRT 파일 전처리 (화자별 색상 적용)
 */
function processSrtFile(inputSrtPath: string, outputSrtPath: string) {
  const content = fs.readFileSync(inputSrtPath, "utf-8");
  const lines = content.split("\n");

  const processedLines = lines.map((line) => {
    if (!line || /^\d+$/.test(line) || line.includes("-->")) {
      return line;
    }

    const match = line.match(/^\[(.*?)\]\s*(.*)/);
    let color = speakerColorMap["내레이션"];
    let text = line;

    if (match) {
      const speaker = match[1];
      text = match[2];
      color = getColorForSpeaker(speaker);
    }

    text = text.replace(/\\n/g, "\n");
    return `<font color="${color}">${text}</font>`;
  });

  fs.writeFileSync(outputSrtPath, processedLines.join("\n"), "utf-8");
}

/**
 * 자막 합성 API
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get("videoFile") as File;
    const srtFile = formData.get("srtFile") as File;

    if (!videoFile) {
      return NextResponse.json(
        { error: "비디오 파일이 필요합니다." },
        { status: 400 }
      );
    }

    if (!srtFile) {
      return NextResponse.json(
        { error: "자막 파일이 필요합니다." },
        { status: 400 }
      );
    }

    // 임시 디렉토리 생성
    const tempDir = path.join(os.tmpdir(), `burn-subtitle-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    try {
      // 파일 저장
      const videoPath = path.join(tempDir, videoFile.name);
      const srtPath = path.join(tempDir, srtFile.name);

      const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
      const srtBuffer = Buffer.from(await srtFile.arrayBuffer());

      fs.writeFileSync(videoPath, videoBuffer);
      fs.writeFileSync(srtPath, srtBuffer, "utf-8");

      // 처리된 자막 파일 경로
      const processedSrtPath = path.join(
        tempDir,
        path.basename(srtFile.name, ".srt") + "_processed.srt"
      );

      // 자막 전처리
      processSrtFile(srtPath, processedSrtPath);

      // 출력 파일 경로
      const outputName =
        path.basename(videoFile.name, path.extname(videoFile.name)) +
        "_subtitled.mp4";
      const outputPath = path.join(tempDir, outputName);

      // FFmpeg 명령어 구성
      const safeSrtPath = processedSrtPath
        .replace(/\\/g, "/")
        .replace(/:/g, "\\:");
      const filterString = `subtitles='${safeSrtPath}':original_size=${REF_WIDTH}x${REF_HEIGHT}:force_style='${FORCE_STYLE}'`;
      const command = `ffmpeg -i "${videoPath}" -y -acodec copy -vcodec libx264 -filter:v "${filterString}" "${outputPath}"`;

      console.log(`🎬 자막 합성 시작: ${videoFile.name}`);
      await execPromise(command);

      // 결과 파일 확인
      if (!fs.existsSync(outputPath)) {
        throw new Error("비디오 파일이 생성되지 않았습니다.");
      }

      // 비디오 파일 읽기
      const videoContent = fs.readFileSync(outputPath);

      // 임시 파일 정리
      fs.rmSync(tempDir, { recursive: true, force: true });

      // 비디오 파일 반환
      return new NextResponse(videoContent, {
        headers: {
          "Content-Type": "video/mp4",
          "Content-Disposition": `attachment; filename="${outputName}"`,
        },
      });
    } catch (error) {
      // 임시 파일 정리
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }

      if (error instanceof Error) {
        console.error("자막 합성 오류:", error.message);
        return NextResponse.json(
          { error: `자막 합성 실패: ${error.message}` },
          { status: 500 }
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
      { status: 500 }
    );
  }
}
