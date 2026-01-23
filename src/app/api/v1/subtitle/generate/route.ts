import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import util from "util";

const execPromise = util.promisify(exec);

// pipx로 설치된 whisper 경로 우선 사용
const WHISPER_PATH = path.join(os.homedir(), ".local/bin/whisper");

/**
 * Whisper 명령어 경로 찾기
 */
function getWhisperCommand(): string {
  // pipx로 설치된 whisper 우선 확인
  if (fs.existsSync(WHISPER_PATH)) {
    return WHISPER_PATH;
  }
  // 시스템 PATH에서 whisper 사용
  return "whisper";
}

/**
 * 자막 생성 API
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audioFile") as File;
    const model = (formData.get("model") as string) || "large";
    const language = (formData.get("language") as string) || "ko";
    const detailLevel = (formData.get("detailLevel") as string) || "detailed";

    if (!audioFile) {
      return NextResponse.json(
        { error: "오디오 파일이 필요합니다." },
        { status: 400 }
      );
    }

    // 지원하는 파일 형식 확인
    const supportedFormats = [
      ".wav",
      ".mp3",
      ".m4a",
      ".flac",
      ".ogg",
      ".wma",
      ".aac",
      ".mp4",
      ".mov",
      ".avi",
      ".mkv",
    ];
    const fileExt = path.extname(audioFile.name).toLowerCase();
    if (!supportedFormats.includes(fileExt)) {
      return NextResponse.json(
        { error: `지원하지 않는 파일 형식입니다: ${fileExt}` },
        { status: 400 }
      );
    }

    // 임시 디렉토리 생성
    const tempDir = path.join(os.tmpdir(), `subtitle-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    try {
      // 업로드된 파일 저장
      const inputPath = path.join(tempDir, audioFile.name);
      const buffer = Buffer.from(await audioFile.arrayBuffer());
      fs.writeFileSync(inputPath, buffer);

      // 출력 파일 경로
      const outputName = path.basename(audioFile.name, fileExt) + ".srt";
      const outputPath = path.join(tempDir, outputName);

      // 상세도 옵션 설정
      const getDetailOptions = (level: string): string => {
        switch (level) {
          case "detailed":
            return "--word_timestamps True --max_line_width 15 --max_line_count 1 --max_words_per_line 3";
          case "normal":
            return "--word_timestamps True --max_line_width 25 --max_line_count 2";
          case "simple":
            return "--word_timestamps True --max_line_width 40 --max_line_count 3";
          default:
            return "--word_timestamps True --max_line_width 25 --max_line_count 2";
        }
      };

      const detailOptions = getDetailOptions(detailLevel);
      const whisperCmd = getWhisperCommand();

      // Whisper 명령어 실행
      const command = `"${whisperCmd}" "${inputPath}" --model ${model} --language ${language} --output_dir "${tempDir}" --output_format srt --verbose False ${detailOptions}`;

      console.log(`🎤 자막 생성 시작: ${audioFile.name}`);
      await execPromise(command);

      // 생성된 SRT 파일 확인
      if (!fs.existsSync(outputPath)) {
        // Whisper가 입력 파일명 기반으로 생성할 수 있음
        const inputName = path.basename(audioFile.name, fileExt);
        const altOutputPath = path.join(tempDir, `${inputName}.srt`);
        if (fs.existsSync(altOutputPath)) {
          fs.renameSync(altOutputPath, outputPath);
        } else {
          throw new Error("자막 파일이 생성되지 않았습니다.");
        }
      }

      // SRT 파일 읽기
      const srtContent = fs.readFileSync(outputPath, "utf-8");

      // 임시 파일 정리
      fs.rmSync(tempDir, { recursive: true, force: true });

      // SRT 파일 반환
      return new NextResponse(srtContent, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="${outputName}"`,
        },
      });
    } catch (error) {
      // 임시 파일 정리
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }

      if (error instanceof Error) {
        console.error("자막 생성 오류:", error.message);
        return NextResponse.json(
          { error: `자막 생성 실패: ${error.message}` },
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
