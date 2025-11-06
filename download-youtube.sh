#!/bin/bash

# ==============================================================================
# YouTube 다운로더 및 분할 스크립트 (for Video Editing)
#
# 설명:
#   이 스크립트는 유튜브 동영상을 재편집에 가장 적합한 최상의 화질로
#   다운로드합니다. 최고 화질의 비디오와 오디오를 각각 받은 후 하나로 합치고,
#   필요에 따라 지정된 개수의 파일로 분할할 수 있습니다.
#
# 필요 프로그램:
#   1. yt-dlp: 유튜브 및 여러 사이트에서 동영상을 다운로드하는 프로그램.
#   2. ffmpeg:  다운로드된 비디오와 오디오 파일을 합치고 분할하는 데 사용되는 프로그램.
#
# 설치 방법 (macOS에서 Homebrew 사용 시):
#   터미널에 아래 명령어를 입력하여 두 프로그램을 한 번에 설치할 수 있습니다.
#   brew install yt-dlp ffmpeg
#
# 저작권 경고:
#   타인의 저작물을 허락 없이 다운로드하여 재배포하는 것은 저작권법에
#   위배될 수 있습니다. 본 스크립트는 법적으로 허용된 범위 내에서만 사용해야 합니다.
# ==============================================================================


# --- 필요 프로그램 설치 확인 ---

# yt-dlp가 설치되어 있는지 확인합니다.
if ! command -v yt-dlp &> /dev/null
then
    echo "[오류] 'yt-dlp'가 설치되어 있지 않습니다."
    echo "이 스크립트를 실행하려면 yt-dlp가 필요합니다."
    echo "터미널에 'brew install yt-dlp'를 입력하여 설치해주세요."
    exit 1
fi

# ffmpeg이 설치되어 있는지 확인합니다.
if ! command -v ffmpeg &> /dev/null
then
    echo "[오류] 'ffmpeg'이 설치되어 있지 않습니다."
    echo "최고 화질의 영상과 음성을 합치고 분할하기 위해 ffmpeg가 필요합니다."
    echo "터미널에 'brew install ffmpeg'를 입력하여 설치해주세요."
    exit 1
fi

# --- 스크립트 주요 로직 ---

# 유튜브 URL, 분할 개수, 저장 경로 인자 확인
if [ -z "$1" ]; then
  echo ""
  echo "사용법: ./download-youtube.sh [유튜브 URL] [분할 개수(선택)] [저장 경로(선택)]"
  echo "예시 1: ./download-youtube.sh https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  echo "예시 2: ./download-youtube.sh https://www.youtube.com/watch?v=dQw4w9WgXcQ 3"
  echo "예시 3: ./download-youtube.sh https://www.youtube.com/watch?v=dQw4w9WgXcQ 3 ./downloads"
  exit 1
fi

YOUTUBE_URL="$1"
# 분할 개수가 입력되지 않으면 기본값 1로 설정
NUM_PARTS=${2:-1}
# 저장 경로가 입력되지 않으면 기본 다운로드 경로로 설정
SAVE_DIR=${3:-"/Users/admin_1/Desktop/쇼츠/youtube-source"}

# 저장 경로가 존재하지 않으면 생성
if [ ! -d "$SAVE_DIR" ]; then
    echo "저장 경로 '$SAVE_DIR'가 존재하지 않아 새로 생성합니다."
    mkdir -p "$SAVE_DIR"
fi

# yt-dlp가 사용할 다운로드 포맷 (우선순위 순서)
# 호환성이 높은 H.264(avc1) 코덱을 우선으로 하되, 없을 경우 차선책 선택
# YouTube의 SABR 스트리밍 강제로 인해 일부 포맷이 사용 불가능할 수 있으므로
# 여러 대체 옵션을 순차적으로 시도합니다.
DOWNLOAD_FORMAT_OPTIONS=(
    'bestvideo[vcodec^=avc1][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
    'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
    'bestvideo+bestaudio/best'
    'best'
)

# 파일명을 먼저 가져옵니다 (첫 번째 포맷 옵션 사용)
FILENAME_ONLY=$(yt-dlp --get-filename -o '%(title)s.%(ext)s' -- "$YOUTUBE_URL" 2>/dev/null)
if [ $? -ne 0 ] || [ -z "$FILENAME_ONLY" ]; then
    echo "[오류] 파일명을 가져오는 데 실패했습니다. URL을 확인해주세요."
    exit 1
fi

# 파일명에 포함될 수 있는 경로 정보(채널명 등)를 제거합니다.
FILENAME_ONLY=$(basename "$FILENAME_ONLY")

# 최종 저장 경로와 파일명을 조합합니다.
FULL_PATH="$SAVE_DIR/$FILENAME_ONLY"

echo "다운로드를 시작합니다: $YOUTUBE_URL"
echo "저장될 파일: $FULL_PATH"
echo ""

# 여러 포맷 옵션을 순차적으로 시도합니다.
DOWNLOAD_SUCCESS=false
for FORMAT_OPTION in "${DOWNLOAD_FORMAT_OPTIONS[@]}"; do
    echo "포맷 시도 중: $FORMAT_OPTION"
    
    # yt-dlp를 실행하여 지정된 경로에 동영상을 다운로드합니다.
    # 에러 메시지는 stderr로 리다이렉트하여 출력을 깔끔하게 유지합니다.
    if yt-dlp -o "$FULL_PATH" -f "$FORMAT_OPTION" -- "$YOUTUBE_URL" >/dev/null 2>&1; then
        # 다운로드가 성공했는지 파일 존재 여부로 확인
        if [ -f "$FULL_PATH" ]; then
            DOWNLOAD_SUCCESS=true
            echo ""
            echo "✓ 다운로드 성공!"
            break
        fi
    fi
    
    echo "  → 이 포맷으로는 다운로드할 수 없습니다. 다음 옵션을 시도합니다..."
    echo ""
done

if [ "$DOWNLOAD_SUCCESS" = false ]; then
    echo "[오류] 모든 포맷 옵션으로 다운로드에 실패했습니다."
    echo "동영상이 비공개이거나 제한되어 있을 수 있습니다."
    echo "yt-dlp를 최신 버전으로 업데이트해보세요: yt-dlp -U"
    exit 1
fi

echo ""
echo "=========================================="
echo "✓ 다운로드가 성공적으로 완료되었습니다!"
echo "=========================================="
echo ""
echo "📁 저장 위치:"
echo "   $FULL_PATH"
echo ""

# 파일 크기 확인 및 표시
if [ -f "$FULL_PATH" ]; then
    FILE_SIZE=$(ls -lh "$FULL_PATH" | awk '{print $5}')
    echo "📊 파일 크기: $FILE_SIZE"
    echo ""
    echo "💡 Finder에서 열기:"
    echo "   open \"$SAVE_DIR\""
    echo ""
fi

# 분할 개수가 1보다 큰 경우에만 분할 로직 실행
if [ "$NUM_PARTS" -gt 1 ]; then
    echo ""
    echo "이제 동영상을 ${NUM_PARTS}개의 파일로 분할합니다..."

    # ffprobe로 동영상 총 길이(초)를 가져옵니다.
    DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$FULL_PATH")
    if [ -z "$DURATION" ]; then
        echo "[오류] 동영상의 길이를 가져올 수 없습니다. 파일이 손상되었을 수 있습니다."
        exit 1
    fi

    # bash는 소수점 계산을 못하므로 정수 부분만 사용합니다.
    DURATION_INT=${DURATION%.*}

    # 각 분할 파일의 길이를 계산합니다 (마지막 파일 제외).
    PART_DURATION=$((DURATION_INT / NUM_PARTS))
    
    # 0으로 나눠지는 경우 방지
    if [ "$PART_DURATION" -eq 0 ]; then
        echo "[오류] 동영상 길이가 너무 짧아 ${NUM_PARTS}개로 분할할 수 없습니다."
        exit 1
    fi

    # 파일 이름과 확장자를 분리합니다.
    BASENAME="${FULL_PATH%.*}"
    EXTENSION="${FILENAME_ONLY##*.}"

    # 반복문을 통해 파일을 분할합니다.
    for i in $(seq 1 $NUM_PARTS)
    do
        # 각 파트의 시작 시간을 계산합니다.
        START_TIME=$(((i-1) * PART_DURATION))
        OUTPUT_FILENAME="${BASENAME}_part${i}.${EXTENSION}"
        echo " - '${OUTPUT_FILENAME}' 생성 중..."

        # ffmpeg 실행 (에러 출력을 숨겨 깔끔하게 표시)
        if [ "$i" -lt "$NUM_PARTS" ]; then
            # 마지막 파트가 아니면 계산된 길이만큼 자릅니다.
            ffmpeg -y -i "$FULL_PATH" -ss "$START_TIME" -t "$PART_DURATION" -c copy "$OUTPUT_FILENAME" >/dev/null 2>&1
        else
            # 마지막 파트이면 시작 시간부터 영상 끝까지 자릅니다.
            ffmpeg -y -i "$FULL_PATH" -ss "$START_TIME" -c copy "$OUTPUT_FILENAME" >/dev/null 2>&1
        fi
    done

    echo ""
    echo "=========================================="
    echo "✓ 동영상 분할이 완료되었습니다!"
    echo "=========================================="
    echo ""
    echo "📁 저장된 파일들:"
    echo "   원본: $FULL_PATH"
    for i in $(seq 1 $NUM_PARTS); do
        PART_FILE="${BASENAME}_part${i}.${EXTENSION}"
        if [ -f "$PART_FILE" ]; then
            PART_SIZE=$(ls -lh "$PART_FILE" | awk '{print $5}')
            echo "   파트 ${i}: $PART_FILE ($PART_SIZE)"
        fi
    done
    echo ""
    echo "💡 Finder에서 열기:"
    echo "   open \"$SAVE_DIR\""
    echo ""
fi 