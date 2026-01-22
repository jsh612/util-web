/**
 * [사용 예시]
 * 음성 파일(.wav, .mp3, .m4a 등)에서 자동으로 자막 파일(.srt)을 생성합니다.
 * 
 * 필요 프로그램:
 * 1. Python 3.8 이상
 * 2. OpenAI Whisper (pip install openai-whisper)
 * 
 * 설치 방법:
 *   python3 -m pip install openai-whisper
 * 
 * 사용법:
 *   npx tsx scripts/generate-subtitle.ts <음성파일경로> [출력파일명] [모델크기] [언어] [상세도]
 * 
 * 모델 크기 옵션 (기본값: large):
 *   - tiny: 가장 빠름, 정확도 낮음
 *   - base: 빠름, 정확도 보통
 *   - small: 보통, 정확도 좋음
 *   - medium: 느림, 정확도 매우 좋음
 *   - large: 매우 느림, 정확도 최고 (기본값)
 * 
 * 언어 옵션 (기본값: ko):
 *   - ko: 한국어
 *   - en: 영어
 *   - auto: 자동 감지
 * 
 * 상세도 옵션 (기본값: detailed):
 *   - detailed: 매우 상세 (짧은 구간으로 분할, 숏폼 최적화) (기본값)
 *   - normal: 일반
 *   - simple: 간단 (긴 구간으로 묶음)
 * 
 * 예시:
 *   npx tsx scripts/generate-subtitle.ts temp-videos/audio.wav
 *   npx tsx scripts/generate-subtitle.ts temp-videos/audio.wav temp-videos/subtitle.srt
 *   npx tsx scripts/generate-subtitle.ts temp-videos/audio.wav temp-videos/subtitle.srt large ko detailed
 */


import { exec } from "child_process";
import fs from "fs";
import path from "path";
import util from "util";

const execPromise = util.promisify(exec);

/**
 * Whisper 모델 크기 옵션
 */
const WHISPER_MODELS = ["tiny", "base", "small", "medium", "large"] as const;
type WhisperModel = (typeof WHISPER_MODELS)[number];

/**
 * 자막 상세도 옵션
 */
const DETAIL_LEVELS = ["detailed", "normal", "simple"] as const;
type DetailLevel = (typeof DETAIL_LEVELS)[number];

/**
 * 상세도에 따른 Whisper 옵션 설정
 * 숏폼 콘텐츠 최적화: 한 블록당 1~2초, 10~15자 이내
 */
const getDetailOptions = (detailLevel: DetailLevel): string => {
  switch (detailLevel) {
    case "detailed":
      // 매우 상세: 숏폼 최적화 (10~15자, 1~2초)
      // word_timestamps가 필요함
      return "--word_timestamps True --max_line_width 15 --max_line_count 1 --max_words_per_line 3";
    case "normal":
      // 일반: 기본 설정 (20~25자)
      // word_timestamps가 필요함
      return "--word_timestamps True --max_line_width 25 --max_line_count 2";
    case "simple":
      // 간단: 긴 구간으로 묶음 (30~40자)
      // word_timestamps가 필요함
      return "--word_timestamps True --max_line_width 40 --max_line_count 3";
    default:
      return "--word_timestamps True --max_line_width 25 --max_line_count 2";
  }
};

/**
 * Whisper가 설치되어 있는지 확인
 */
const checkWhisperInstalled = async (): Promise<boolean> => {
  try {
    // whisper --version은 지원하지 않으므로 --help로 확인
    await execPromise("whisper --help");
    return true;
  } catch {
    // whisper 명령어 자체가 없는 경우도 확인
    try {
      await execPromise("which whisper");
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Python이 설치되어 있는지 확인
 */
const checkPythonInstalled = async (): Promise<boolean> => {
  try {
    const { stdout } = await execPromise("python3 --version");
    return stdout.includes("Python");
  } catch {
    try {
      const { stdout } = await execPromise("python --version");
      return stdout.includes("Python");
    } catch {
      return false;
    }
  }
};

/**
 * Whisper를 사용하여 음성 파일에서 자막 생성
 */
const generateSubtitle = async (
  audioPath: string,
  outputPath: string,
  model: WhisperModel = "large", // 최고 정확도 모델 기본값
  language: string = "ko", // 한국어 기본값
  detailLevel: DetailLevel = "detailed" // 상세도 기본값 (숏폼 최적화)
): Promise<void> => {
  const absAudioPath = path.resolve(audioPath);
  const absOutputPath = path.resolve(outputPath);

  // 출력 폴더가 없으면 생성
  const outputDir = path.dirname(absOutputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📂 출력 폴더 생성됨: ${outputDir}`);
  }

  console.log(`🎤 음성 인식 시작...`);
  console.log(`   - 입력 파일: ${path.basename(audioPath)}`);
  console.log(`   - 출력 파일: ${path.basename(outputPath)}`);
  console.log(`   - 모델: ${model}`);
  console.log(`   - 언어: ${language}`);
  console.log(`   - 상세도: ${detailLevel}`);
  console.log(`\n⏳ 처리 중... (시간이 걸릴 수 있습니다)`);

  try {
    // 상세도에 따른 옵션 가져오기
    const detailOptions = getDetailOptions(detailLevel);
    
    // Whisper 명령어 실행
    // --output_dir: 출력 디렉토리
    // --output_format: srt 형식
    // --language: 언어 코드 (ko=한국어, en=영어, auto=자동감지)
    // --max_line_width: 한 줄의 최대 문자 수
    // --max_line_count: 한 자막 블록의 최대 줄 수
    // --max_words_per_line: 한 줄의 최대 단어 수
    const command = `whisper "${absAudioPath}" --model ${model} --language ${language} --output_dir "${outputDir}" --output_format srt --verbose False ${detailOptions}`;

    console.log(`\n🚀 실행 명령어:`);
    console.log(command);

    await execPromise(command);

    // Whisper는 입력 파일명과 동일한 이름으로 출력 파일을 생성
    // 예: audio.wav -> audio.srt
    const inputName = path.basename(absAudioPath, path.extname(absAudioPath));
    const generatedSrtPath = path.join(outputDir, `${inputName}.srt`);

    // 생성된 파일을 원하는 출력 경로로 이동
    if (fs.existsSync(generatedSrtPath)) {
      if (generatedSrtPath !== absOutputPath) {
        fs.renameSync(generatedSrtPath, absOutputPath);
        console.log(`\n✅ 파일 이름 변경: ${path.basename(generatedSrtPath)} -> ${path.basename(outputPath)}`);
      }
      console.log(`\n✅ 자막 생성 완료!`);
      console.log(`🎉 결과 파일: ${absOutputPath}`);
    } else {
      throw new Error(`자막 파일이 생성되지 않았습니다: ${generatedSrtPath}`);
    }
  } catch (error: unknown) {
    console.error("\n❌ 오류 발생:");
    
    if (error instanceof Error) {
      console.error(error.message);

      // execPromise의 에러는 stderr 속성을 가질 수 있음
      const execError = error as Error & { stderr?: string };
      if (execError.stderr) {
        console.error("\n[오류 상세 정보]:");
        console.error(execError.stderr);
      }
    } else {
      console.error(String(error));
    }

    process.exit(1);
  }
};

const main = async () => {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log(
      "\n사용법: npx tsx scripts/generate-subtitle.ts <음성파일> [출력파일] [모델크기] [언어] [상세도]"
    );
    console.log("\n예시:");
    console.log("  npx tsx scripts/generate-subtitle.ts temp-videos/audio.wav");
    console.log("  npx tsx scripts/generate-subtitle.ts temp-videos/audio.wav temp-videos/subtitle.srt");
    console.log("  npx tsx scripts/generate-subtitle.ts temp-videos/audio.wav temp-videos/subtitle.srt large ko detailed");
    console.log("  npx tsx scripts/generate-subtitle.ts temp-videos/audio.wav temp-videos/subtitle.srt base ko detailed");
    console.log("\n모델 크기: tiny, base, small, medium, large (기본값, 최고 정확도)");
    console.log("언어 코드: ko (한국어, 기본값), en (영어), auto (자동감지)");
    console.log("상세도: detailed (매우 상세, 기본값, 숏폼 최적화), normal, simple (간단)");
    console.log("\n⚠️  large 모델은 정확도가 높지만 처리 시간이 오래 걸립니다.");
    console.log("   빠른 처리가 필요하면 'base' 또는 'small' 모델을 사용하세요.");
    process.exit(1);
  }

  const audioPath = args[0];
  const customOutputPath = args[1];
  const model = (args[2] as WhisperModel) || "large"; // 최고 정확도 모델 기본값
  const language = args[3] || "ko";
  const detailLevel = (args[4] as DetailLevel) || "detailed"; // 숏폼 최적화 기본값

  // 모델 크기 유효성 검사
  if (!WHISPER_MODELS.includes(model)) {
    console.error(
      `❌ 오류: 잘못된 모델 크기입니다. 사용 가능한 옵션: ${WHISPER_MODELS.join(", ")}`
    );
    process.exit(1);
  }

  // 상세도 유효성 검사
  if (!DETAIL_LEVELS.includes(detailLevel)) {
    console.error(
      `❌ 오류: 잘못된 상세도입니다. 사용 가능한 옵션: ${DETAIL_LEVELS.join(", ")}`
    );
    process.exit(1);
  }

  // 파일 존재 확인
  if (!fs.existsSync(audioPath)) {
    console.error(`❌ 오류: 음성 파일을 찾을 수 없습니다: ${audioPath}`);
    process.exit(1);
  }

  // 지원하는 오디오 형식 확인
  const audioExt = path.extname(audioPath).toLowerCase();
  const supportedFormats = [".wav", ".mp3", ".m4a", ".flac", ".ogg", ".wma", ".aac"];
  if (!supportedFormats.includes(audioExt)) {
    console.warn(
      `⚠️ 경고: 지원하지 않는 오디오 형식입니다 (${audioExt}). 계속 진행합니다...`
    );
  }

  // Python 설치 확인
  const pythonInstalled = await checkPythonInstalled();
  if (!pythonInstalled) {
    console.error("❌ 오류: Python이 설치되어 있지 않습니다.");
    console.error("   Python 3.8 이상을 설치해주세요: https://www.python.org/downloads/");
    process.exit(1);
  }

  // Whisper 설치 확인
  const whisperInstalled = await checkWhisperInstalled();
  if (!whisperInstalled) {
    console.error("❌ 오류: OpenAI Whisper가 설치되어 있지 않습니다.");
    console.error("   다음 명령어로 설치해주세요: python3 -m pip install openai-whisper");
    console.error("   또는: pip3 install openai-whisper");
    process.exit(1);
  }

  // NumPy 버전 확인 및 경고
  try {
    const { stdout } = await execPromise("python3 -c 'import numpy; print(numpy.__version__)'");
    const numpyVersion = stdout.trim();
    const majorVersion = parseInt(numpyVersion.split(".")[0]);
    
    if (majorVersion >= 2) {
      console.error("\n❌ 오류: NumPy 2.x가 설치되어 있어 Whisper 실행에 문제가 발생합니다.");
      console.error("   다음 명령어로 NumPy를 1.x 버전으로 다운그레이드하세요:");
      console.error("   python3 -m pip install \"numpy<2\"");
      console.error("\n   자세한 내용은 scripts/FIX_NUMPY.md 파일을 참고하세요.");
      process.exit(1);
    }
  } catch {
    // NumPy가 설치되지 않은 경우 무시 (Whisper가 자동으로 설치할 수 있음)
  }

  // NumPy 버전 확인 및 경고
  try {
    const { stdout } = await execPromise("python3 -c 'import numpy; print(numpy.__version__)'");
    const numpyVersion = stdout.trim();
    const majorVersion = parseInt(numpyVersion.split(".")[0]);
    
    if (majorVersion >= 2) {
      console.warn("\n⚠️  경고: NumPy 2.x가 설치되어 있어 Whisper 실행에 문제가 발생할 수 있습니다.");
      console.warn("   NumPy를 1.x 버전으로 다운그레이드하는 것을 권장합니다:");
      console.warn("   python3 -m pip install \"numpy<2\"");
      console.warn("\n   계속 진행하시겠습니까? (오류가 발생하면 위 명령어를 실행하세요)\n");
    }
  } catch {
    // NumPy가 설치되지 않은 경우 무시
  }

  // 출력 파일 경로 결정
  const dir = path.dirname(audioPath);
  const name = path.basename(audioPath, audioExt);
  const outputPath = customOutputPath
    ? path.resolve(customOutputPath)
    : path.join(dir, `${name}.srt`);

  await generateSubtitle(audioPath, outputPath, model, language, detailLevel);
};

main();
