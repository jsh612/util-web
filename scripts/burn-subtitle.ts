/**
 * [사용 예시]
 * 1. 자막 파일(.srt)을 수동으로 준비합니다. (화자 정보 포함: [화자명] 내용)
 * 2. SRT 파일 텍스트 내에서 줄바꿈이 필요한 곳에 '\n' 문자를 직접 입력합니다. (예: 안녕\n하세요)
 * 3. 아래 명령어로 실행합니다:
 *    npx tsx scripts/burn-subtitle.ts <비디오경로> <자막경로> [출력파일명]
 *
 * 예: npx tsx scripts/burn-subtitle.ts temp-videos/input.mp4 temp-videos/test.srt temp-videos/output.mp4
 */

/**
 * [자막 파일(.srt) 작성 예시]
 * ----------------------------------------
 * 1
 * 00:00:00,500 --> 00:00:02,800
 * [진행자] 자! 판\n이 깔렸다!
 *
 * 2
 * 00:00:03,800 --> 00:00:06,500
 * [진행자] 조선 팔도 최고의 국물은 누구냐!
 * ----------------------------------------
 */

import { exec } from "child_process";
import fs from "fs";
import path from "path";
import util from "util";

const execPromise = util.promisify(exec);

/**
 * 자막 스타일 설정
 */
const FONT_NAME = "Arial";
const FONT_SIZE = 13;

// 기준 해상도 (유튜브 쇼츠 FHD)
const REF_WIDTH = 1080;
const REF_HEIGHT = 1920;

// 위치 설정 (화면 높이 대비 상대값)
// 0.05 = 하단에서 5% 지점에 자막 표시 (테스트용: 아주 낮게 설정)
const MARGIN_BOTTOM_RATIO = 0.05;

// 픽셀 값 자동 계산
const MARGIN_V = Math.floor(REF_HEIGHT * MARGIN_BOTTOM_RATIO);

// 스타일 옵션들을 배열로 정의
const STYLE_OPTIONS = [
  `Fontname=${FONT_NAME}`,
  `Fontsize=${FONT_SIZE}`,
  `PrimaryColour=&H00FFFFFF`, // 기본 흰색
  `OutlineColour=&H00000000`, // 검은색 테두리
  `BackColour=&H80000000`, // 반투명 그림자
  `Bold=1`,
  `Italic=0`,
  `Alignment=2`, // 하단 중앙
  `BorderStyle=1`, // 1: 일반 외곽선
  `Outline=4`, // 아주 두꺼운 테두리
  `Shadow=0`, // 그림자 제거
  `MarginV=${MARGIN_V}`,
  `MarginL=20`,
  `MarginR=20`,
];

// 콤마(,)를 이스케이프(\,)하여 하나의 문자열로 결합
const FORCE_STYLE = STYLE_OPTIONS.join("\\,");

/**
 * 화자별 고정 색상 팔레트 (눈이 편안한 파스텔톤 + 가독성)
 */
const SPEAKER_PALETTE = [
  "#FFE082", // 1. 웜 옐로우 (Warm Yellow)
  "#80DEEA", // 2. 소프트 시안 (Soft Cyan)
  "#FFAB91", // 3. 애프리콧 (Apricot)
  "#CE93D8", // 4. 라벤더 (Lavender)
  "#A5D6A7", // 5. 파스텔 그린 (Pastel Green)
];

// 화자 이름과 할당된 색상을 매핑하는 객체
const speakerColorMap: Record<string, string> = {
  내레이션: "#FFFFFF", // 내레이션은 항상 흰색 고정
};

let paletteIndex = 0;

/**
 * 화자 이름에 따라 색상을 반환하는 함수
 * (등장 순서대로 팔레트 색상 할당)
 */
const getColorForSpeaker = (name: string): string => {
  if (speakerColorMap[name]) {
    return speakerColorMap[name];
  }

  // 새로운 화자라면 팔레트에서 다음 색상 할당
  const color = SPEAKER_PALETTE[paletteIndex % SPEAKER_PALETTE.length];
  speakerColorMap[name] = color;
  paletteIndex++;

  return color;
};

/**
 * SRT 파일 전처리 함수
 * [화자] 태그를 찾아 색상을 입히고 텍스트에서 제거합니다.
 */
const processSrtFile = (inputSrtPath: string, outputSrtPath: string) => {
  const content = fs.readFileSync(inputSrtPath, "utf-8");
  const lines = content.split("\n");

  const processedLines = lines.map((line) => {
    // 타임스탬프나 숫자는 그대로 반환
    if (!line || /^\d+$/.test(line) || line.includes("-->")) {
      return line;
    }

    // [화자] 패턴 찾기
    const match = line.match(/^\[(.*?)\]\s*(.*)/);

    let color = speakerColorMap["내레이션"]; // 기본값: 내레이션 색상
    let text = line;

    if (match) {
      const speaker = match[1];
      text = match[2]; // 화자 태그 제거한 텍스트
      color = getColorForSpeaker(speaker);
    }

    // \n 문자열을 실제 줄바꿈 문자로 변환
    text = text.replace(/\\n/g, "\n");

    // FFmpeg 자막 필터가 인식하는 HTML font 태그 적용
    return `<font color="${color}">${text}</font>`;
  });

  fs.writeFileSync(outputSrtPath, processedLines.join("\n"), "utf-8");
  console.log(`✅ 자막 전처리 완료: ${outputSrtPath}`);
};

const burnSubtitles = async (
  videoPath: string,
  srtPath: string,
  outputPath: string
) => {
  // 절대 경로 변환
  const absVideoPath = path.resolve(videoPath);
  const absOutputPath = path.resolve(outputPath);

  // 출력 폴더가 없으면 생성
  const outputDir = path.dirname(absOutputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📂 출력 폴더 생성됨: ${outputDir}`);
  }

  // 임시 처리된 자막 파일 생성
  const dir = path.dirname(srtPath);
  const name = path.basename(srtPath, ".srt");
  const processedSrtPath = path.join(dir, `${name}_processed.srt`);
  const absSrtPath = path.resolve(processedSrtPath);

  try {
    // 1. 자막 전처리 (화자별 색상 적용 및 태그 제거)
    processSrtFile(srtPath, processedSrtPath);

    console.log(`🎬 자막 합성 시작...`);
    console.log(`   - 비디오: ${path.basename(videoPath)}`);
    console.log(`   - 원본 자막: ${path.basename(srtPath)}`);
    console.log(`   - 처리된 자막: ${path.basename(processedSrtPath)}`);
    console.log(
      `   - 폰트: ${FONT_NAME}, 크기: ${FONT_SIZE}, 여백: ${MARGIN_V}`
    );

    // FFmpeg 명령어 구성
    const safeSrtPath = absSrtPath.replace(/\\/g, "/").replace(/:/g, "\\:");

    // 전체 필터 문자열 구성
    const filterString = `subtitles='${safeSrtPath}':original_size=${REF_WIDTH}x${REF_HEIGHT}:force_style='${FORCE_STYLE}'`;

    // 최종 명령어 조합
    const command = `ffmpeg -i "${absVideoPath}" -y -acodec copy -vcodec libx264 -filter:v "${filterString}" "${absOutputPath}"`;

    console.log("\n🚀 실행 명령어:");
    console.log(command);
    console.log("\n⏳ 처리 중... (시간이 걸릴 수 있습니다)");

    const {  stderr } = await execPromise(command);

    // FFmpeg 로그 출력 (디버깅용)
    if (stderr) {
      // 에러는 아니지만 stderr로 로그가 나옴
      // console.log("\n[FFmpeg Log]...");
    }

    console.log("\n✅ 자막 합성 완료!");
    console.log(`🎉 결과 파일: ${absOutputPath}`);
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error("\n❌ 오류 발생:");
    console.error(error.message);

    // 실패 시 출력 파일이 어정쩡하게 생성되었다면 삭제 고려 (선택 사항)
    if (fs.existsSync(absOutputPath)) {
      try {
        fs.unlinkSync(absOutputPath);
      } catch (e) {
        console.error(e);
      }
    }

    process.exit(1);
  } finally {
    // 3. 임시 파일 정리 (성공/실패 여부 상관없이 삭제)
    if (fs.existsSync(processedSrtPath)) {
      try {
        fs.unlinkSync(processedSrtPath);
        console.log(`🧹 임시 파일 삭제됨: ${path.basename(processedSrtPath)}`);
      } catch (e) { // eslint-disable-line @typescript-eslint/no-unused-vars
        console.warn(`⚠️ 임시 파일 삭제 실패: ${processedSrtPath}`);
      }
    }
  }
};

const main = async () => {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(
      "\n사용법: npx tsx scripts/burn-subtitle.ts <비디오파일> <자막파일> [출력파일]"
    );
    process.exit(1);
  }

  const videoPath = args[0];
  const srtPath = args[1];

  // 확장자 유효성 검사
  if (!srtPath.toLowerCase().endsWith(".srt")) {
    console.error(
      "❌ 오류: 두 번째 인자는 반드시 .srt 자막 파일이어야 합니다."
    );
    process.exit(1);
  }

  // 비디오 파일 확장자 경고 (필수는 아님)
  if (!videoPath.match(/\.(mp4|mov|avi|mkv|webm|m4v)$/i)) {
    console.warn(
      `⚠️ 경고: 비디오 파일 확장자가 일반적이지 않습니다 (${path.extname(
        videoPath
      )}).`
    );
  }

  const customOutputPath = args[2];

  if (!fs.existsSync(videoPath)) {
    console.error(`❌ 비디오 파일을 찾을 수 없습니다: ${videoPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(srtPath)) {
    console.error(`❌ 자막 파일을 찾을 수 없습니다: ${srtPath}`);
    process.exit(1);
  }

  const dir = path.dirname(videoPath);
  const ext = path.extname(videoPath);
  const name = path.basename(videoPath, ext);

  const outputPath = customOutputPath
    ? path.resolve(customOutputPath)
    : path.join(dir, `${name}_subtitled${ext}`);

  await burnSubtitles(videoPath, srtPath, outputPath);
};

main();
