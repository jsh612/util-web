#!/usr/bin/env bash
# Figma 노드 이미지를 REST API로 받아 design-references/<nodeId>/reference_ui.png 로 저장한다.
# nodeId = URL의 node-id (하이픈 형식, 예: 4555-301010) 기준으로 개별 디렉터리 생성.
# .env 의 FIGMA_ACCESS_TOKEN 을 사용한다. (.env.example 참고 후 cp .env.example .env && 값 설정)

set -e

# 프로젝트 루트 = 이 스크립트가 있는 디렉터리의 상위
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT/.env"

# .env 로드 (FIGMA_ACCESS_TOKEN)
if [ ! -f "$ENV_FILE" ]; then
  echo "Error: .env not found at $ENV_FILE"
  echo "Copy .env.example to .env and set FIGMA_ACCESS_TOKEN."
  exit 1
fi
set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

if [ -z "${FIGMA_ACCESS_TOKEN:-}" ]; then
  echo "Error: FIGMA_ACCESS_TOKEN is not set in .env"
  exit 1
fi

# 인자: (1) Figma URL 한 개  또는  (2) fileKey nodeId 두 개
if [ $# -eq 1 ]; then
  URL="$1"
  # URL에서 fileKey: design/ 다음부터 다음 / 전까지
  if [[ "$URL" =~ https://www\.figma\.com/design/([^/]+) ]]; then
    FILE_KEY="${BASH_REMATCH[1]}"
  else
    echo "Error: Could not parse fileKey from URL: $URL"
    exit 1
  fi
  # node-id=4555-301010 -> 4555:301010
  if [[ "$URL" =~ node-id=([0-9]+)-([0-9]+) ]]; then
    NODE_ID="${BASH_REMATCH[1]}:${BASH_REMATCH[2]}"
  else
    echo "Error: Could not parse node-id from URL: $URL"
    exit 1
  fi
elif [ $# -eq 2 ]; then
  FILE_KEY="$1"
  NODE_ID="$2"
  # nodeId가 하이픈이면 콜론으로 치환 (API용)
  NODE_ID="${NODE_ID/-/:}"
else
  echo "Usage: $0 <Figma URL>"
  echo "   or: $0 <fileKey> <nodeId>"
  echo "Example: $0 'https://www.figma.com/design/bQDIvnkz3am0q59QmVQQyg/...?node-id=4555-301010'"
  echo "Example: $0 bQDIvnkz3am0q59QmVQQyg 4555:301010"
  exit 1
fi

# API 호출용 nodeId(콜론), 디렉터리명용(하이픈)
NODE_ID_API="$NODE_ID"
NODE_DIR="${NODE_ID_API/:/-}"
OUTPUT_DIR="$ROOT/design-references/$NODE_DIR"
OUTPUT_FILE="$OUTPUT_DIR/reference_ui.png"

API_URL="https://api.figma.com/v1/images/${FILE_KEY}?ids=${NODE_ID_API}&format=png"
mkdir -p "$OUTPUT_DIR"

echo "Requesting image for node $NODE_ID_API..."
RESPONSE="$(curl -s -H "X-Figma-Token: $FIGMA_ACCESS_TOKEN" "$API_URL")"

# JSON에서 이미지 URL 추출 (Python 기본 설치 가정)
export NODE_ID="$NODE_ID_API"
IMAGE_URL="$(echo "$RESPONSE" | python3 -c "
import os, sys, json
node_id = os.environ.get('NODE_ID', '')
try:
    d = json.load(sys.stdin)
    images = d.get('images') or {}
    err = d.get('err')
    if err:
        print('API Error: ' + err, file=sys.stderr)
        sys.exit(1)
    url = images.get(node_id) or (list(images.values())[0] if images else None)
    if url:
        print(url)
    else:
        print('No image URL in response', file=sys.stderr)
        sys.exit(1)
except Exception as e:
    print('Parse error: ' + str(e), file=sys.stderr)
    sys.exit(1)
")"

if [ -z "$IMAGE_URL" ]; then
  exit 1
fi

echo "Downloading to $OUTPUT_FILE"
curl -s -o "$OUTPUT_FILE" "$IMAGE_URL"
echo "Done: $OUTPUT_FILE"
