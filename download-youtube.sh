#!/bin/bash

# ==============================================================================
# YouTube 다운로더 스크립트 (for Video Editing)
#
# 설명:
#   이 스크립트는 유튜브 동영상을 재편집에 가장 적합한 최상의 화질로
#   다운로드합니다. 최고 화질의 비디오와 오디오를 각각 받은 후 하나로 합칩니다.
#
# 필요 프로그램:
#   1. yt-dlp: 유튜브 및 여러 사이트에서 동영상을 다운로드하는 프로그램.
#   2. ffmpeg:  다운로드된 비디오와 오디오 파일을 합치는 데 사용되는 프로그램.
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
    echo "최고 화질의 영상과 음성을 합치기 위해 ffmpeg가 필요합니다."
    echo "터미널에 'brew install ffmpeg'를 입력하여 설치해주세요."
    exit 1
fi

# --- 스크립트 주요 로직 ---

# 유튜브 URL이 인자로 제공되었는지 확인합니다.
if [ -z "$1" ]; then
  echo ""
  echo "사용법: ./download-youtube.sh [유튜브 동영상 URL]"
  echo "예시:   ./download-youtube.sh https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  exit 1
fi

YOUTUBE_URL="$1"

echo "다운로드를 시작합니다: $YOUTUBE_URL"
echo "선택한 옵션: 호환성 높은 최고화질 (H.264 비디오 + m4a 오디오)"

# 호환성이 높은 H.264 코덱을 우선으로 최적의 화질 옵션으로 yt-dlp를 실행합니다.
yt-dlp -f 'bestvideo[vcodec^=avc1][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best' -- "$YOUTUBE_URL"

echo ""
echo "다운로드가 성공적으로 완료되었습니다." 