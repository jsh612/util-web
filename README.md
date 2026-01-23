# Util-Web

Next.js 기반의 유틸리티 웹 애플리케이션입니다. Figma 디자인 추출, 웹 크롤링, PDF 파싱, 이미지 편집, PDF 기반 Q&A 챗봇 등 다양한 유틸리티 기능을 제공합니다.

## 주요 기능

### Figma 컴포넌트 Prompt 추출

- Figma API를 활용하여 디자인 컴포넌트를 추출하고 프롬프트로 변환
- 컴포넌트별 독립적인 디렉토리 구조 생성

  ```
  prompt-files/
    └── [component-name]/
        ├── prompt.txt      # 컴포넌트 생성 프롬프트
        └── attachments/    # 첨부 파일 디렉토리
            ├── file1.png
            ├── file2.pdf
            └── ...
  ```

- PDF 파일 자동 텍스트 추출 및 프롬프트 포함
- 최대 5개까지 첨부 파일 지원
- 생성된 파일들을 ZIP 형식으로 다운로드
  - 디렉토리 구조 유지
  - 컴포넌트 이름으로 ZIP 파일 생성

### 웹 뉴스 크롤링

- 네이버 뉴스, CNN 또는 AP News 웹사이트에서 뉴스 크롤링
- 크롤링한 뉴스 내용을 텍스트로 추출

### PDF 파싱

- PDF 문서의 텍스트 내용을 추출하고 처리

### 이미지 편집

- 이미지 리사이징, 포맷 변환 등 기본적인 이미지 편집 기능 제공

### 인스타그램 포스트 생성

- 템플릿 기반의 인스타그램 포스트 이미지 생성

### 자막 생성기

오디오 또는 비디오 파일에서 자동으로 자막을 생성하는 기능입니다. OpenAI Whisper 모델을 사용하여 음성을 텍스트로 변환합니다.

#### 주요 특징

- **다양한 파일 형식 지원**: WAV, MP3, M4A, FLAC, OGG, WMA, AAC, MP4, MOV, AVI, MKV 등
- **다양한 Whisper 모델**: tiny, base, small, medium, large 모델 선택 가능
- **다국어 지원**: 한국어, 영어, 일본어, 중국어 등 다양한 언어 지원
- **상세도 조절**: 간단/일반/상세 모드로 자막의 상세도 조절 가능
- **SRT 형식 출력**: 표준 SRT 자막 파일 형식으로 다운로드

#### 사용 방법

1. **Whisper 설치**: 시스템에 OpenAI Whisper가 설치되어 있어야 합니다.
   ```bash
   pip install openai-whisper
   # 또는
   pipx install openai-whisper
   ```

2. **웹 인터페이스 사용**:
   - `/subtitle-generator` 페이지 접속
   - 오디오 또는 비디오 파일 업로드
   - 모델, 언어, 상세도 선택
   - "자막 생성" 버튼 클릭
   - 생성된 SRT 파일 다운로드

#### API 엔드포인트

- `POST /api/v1/subtitle/generate`: 자막 생성
  - 요청 파라미터 (FormData):
    - `audioFile`: 오디오/비디오 파일 (필수)
    - `model`: Whisper 모델 (tiny, base, small, medium, large, 기본값: large)
    - `language`: 언어 코드 (ko, en, ja, zh 등, 기본값: ko)
    - `detailLevel`: 상세도 (simple, normal, detailed, 기본값: detailed)
  - 응답: SRT 형식의 자막 텍스트

### 자막 합성기

비디오 파일에 자막 파일(.srt)을 합성하여 자막이 포함된 비디오를 생성하는 기능입니다. FFmpeg를 사용하여 고품질의 자막 합성 비디오를 생성합니다.

#### 주요 특징

- **화자별 자동 색상**: 자막의 `[화자명]`을 인식하여 화자별로 고유한 파스텔톤 색상을 자동으로 적용
- **쇼츠 최적화 스타일**: 모바일 화면에 최적화된 폰트 크기, 위치, 가독성 좋은 테두리 스타일 적용
- **줄바꿈 지원**: 자막 파일 내 `\n` 입력을 통해 원하는 위치에서 줄바꿈 가능
- **고품질 출력**: FFmpeg를 사용한 고품질 MP4 비디오 생성

#### 사용 방법

1. **FFmpeg 설치**: 시스템에 FFmpeg가 설치되어 있어야 합니다. (설치 가이드: `scripts/INSTALL_FFMPEG.md`)
2. **웹 인터페이스 사용**:
   - `/subtitle-burn` 페이지 접속
   - 비디오 파일 업로드
   - SRT 자막 파일 업로드
   - "자막 합성" 버튼 클릭
   - 합성된 비디오 다운로드

3. **명령어 사용** (선택):
   ```bash
   npx tsx scripts/burn-subtitle.ts <비디오경로> <자막경로> [출력파일명]
   # 예시: npx tsx scripts/burn-subtitle.ts video.mp4 subtitle.srt output.mp4
   ```

#### API 엔드포인트

- `POST /api/v1/subtitle/burn`: 자막 합성
  - 요청 파라미터 (FormData):
    - `videoFile`: 비디오 파일 (필수)
    - `srtFile`: SRT 자막 파일 (필수)
  - 응답: 자막이 합성된 MP4 비디오 파일

### YouTube 다운로더

YouTube 동영상을 최고 화질로 다운로드하고, 필요시 여러 파일로 분할할 수 있는 기능입니다.

#### 주요 특징

- **최고 화질 다운로드**: 최고 품질의 비디오와 오디오를 자동으로 선택하여 다운로드
- **MP4 형식**: 최종적으로 MP4 형식으로 변환하여 제공
- **파일 분할**: 긴 동영상을 여러 개의 파일로 분할 가능
- **자동 파일명**: YouTube 동영상 제목을 파일명으로 자동 설정

#### 사용 방법

1. **yt-dlp 설치**: 시스템에 yt-dlp가 설치되어 있어야 합니다.
   ```bash
   brew install yt-dlp
   ```

2. **FFmpeg 설치** (파일 분할 기능 사용 시):
   ```bash
   brew install ffmpeg
   ```

3. **웹 인터페이스 사용**:
   - `/youtube-downloader` 페이지 접속
   - YouTube URL 입력
   - 분할 개수 선택 (선택사항)
   - "다운로드" 버튼 클릭
   - 다운로드된 파일 저장

#### API 엔드포인트

- `POST /api/v1/youtube/download`: YouTube 동영상 다운로드
  - 요청 파라미터 (FormData):
    - `youtubeUrl`: YouTube URL (필수)
    - `numParts`: 분할 개수 (기본값: 1)
  - 응답:
    - `success`: 성공 여부
    - `filePath`: 다운로드된 파일 경로
    - `fileName`: 파일명
    - `fileSize`: 파일 크기 (바이트)
    - `parts`: 분할된 파일 정보 (분할 시)

### 영상 편집기

웹 기반의 비디오 편집 도구로, 타임라인 기반의 직관적인 인터페이스를 제공합니다.

#### 주요 특징

- **타임라인 편집**: 드래그 앤 드롭으로 클립을 배치하고 편집
- **다중 미디어 지원**: 이미지, 비디오, 오디오 파일 지원
- **다중 트랙**: 비디오 트랙과 오디오 트랙 분리 관리
- **자동 정렬**: CapCut 스타일의 자동 정렬 및 스냅 기능
- **리플 모드**: 클립 이동 시 뒤의 클립들을 자동으로 밀어내는 기능
- **다중 선택**: Command 키로 여러 클립을 선택하여 한 번에 편집
- **속성 편집**: 시작 시간, 지속 시간 등 클립 속성 편집
- **비율 선택**: 16:9, 9:16, 1:1 비율 선택 가능
- **실시간 미리보기**: Canvas 기반의 실시간 미리보기
- **MP4 내보내기**: 
  - **일반 내보내기**: 브라우저에서 렌더링 후 서버에서 MP4 변환
  - **빠른 내보내기**: FFmpeg 서버 렌더링 (더 빠르고 고품질)

#### 주요 기능

1. **미디어 라이브러리**:
   - 이미지, 비디오, 오디오 파일 업로드
   - 미리보기 썸네일 표시
   - 다중 선택 및 일괄 추가

2. **타임라인 편집**:
   - 클립 드래그 앤 드롭으로 위치 변경
   - 클립 리사이즈로 지속 시간 조절
   - 자동 스냅 및 정렬
   - 리플 모드: 클립 이동/크기 변경 시 뒤의 클립 자동 이동

3. **클립 선택 및 편집**:
   - 단일 선택: 일반 클릭
   - 다중 선택: Command 키 + 클릭
   - 속성 패널에서 선택된 클립의 속성 편집
   - 복수 선택 시 모든 클립에 동일한 속성 적용

4. **키보드 단축키**:
   - `Space`: 재생/정지
   - `Delete` / `Backspace`: 선택된 클립 삭제
   - `Backspace` (미디어 라이브러리): 선택된 미디어 제거

5. **오디오에 맞춰 분배**:
   - 이미지 클립들을 오디오 길이에 맞춰 균등 분배
   - 비디오 클립이 포함된 경우 비활성화

6. **비디오 내보내기**:
   - **일반 내보내기**: 브라우저에서 Canvas를 MediaStream으로 녹화 → WebM 생성 → 서버에서 MP4 변환
   - **빠른 내보내기**: 타임라인 데이터와 미디어 파일을 서버로 전송 → FFmpeg로 직접 렌더링 → MP4 생성

#### 사용 방법

1. **미디어 추가**:
   - 좌측 미디어 라이브러리에서 파일 업로드
   - 이미지, 비디오, 오디오 파일 지원

2. **타임라인에 배치**:
   - 미디어를 드래그하여 타임라인에 드롭
   - 여러 미디어를 선택하여 한 번에 추가 가능

3. **편집**:
   - 클립을 드래그하여 위치 변경
   - 클립 우측 끝을 드래그하여 지속 시간 조절
   - 클립 클릭하여 선택 후 속성 패널에서 편집

4. **내보내기**:
   - 헤더의 "빠른 내보내기" 또는 "일반 내보내기" 버튼 클릭
   - 렌더링 완료 후 MP4 파일 다운로드

#### API 엔드포인트

- `POST /api/v1/video/render`: FFmpeg 빠른 렌더링
  - 요청 파라미터 (FormData):
    - `timeline`: 타임라인 데이터 (JSON)
    - `media_*`: 미디어 파일들
    - `mediaInfo`: 미디어 정보 (JSON)
  - 응답: 렌더링된 MP4 비디오 파일

- `POST /api/v1/video/convert`: WebM을 MP4로 변환
  - 요청 파라미터 (FormData):
    - `video`: WebM 비디오 파일
    - `quality`: 품질 설정 (high, medium, low)
  - 응답: 변환된 MP4 비디오 파일

### PDF 기반 Q&A 챗봇

PDF 문서를 업로드하고 해당 문서의 내용을 기반으로 질문과 답변을 할 수 있는 챗봇 기능을 제공합니다.

#### 주요 기능

- PDF 문서 업로드 및 텍스트 추출
- 사용자별 채팅 세션 관리
- 문서 컨텍스트 기반 Q&A
- 대화 기록 유지

#### 사용 방법

1. 사용자 이름 입력
2. PDF 파일 선택
3. "챗봇 설정" 버튼 클릭하여 초기화
4. 문서 내용에 대해 질문 입력

#### 기술적 특징

- Gemini API를 활용한 자연어 처리
- 문서 컨텍스트 기반 응답 생성
- 로컬 스토리지를 활용한 사용자 설정 저장
- 실시간 대화형 인터페이스

#### 제한사항

- 업로드된 PDF 문서 내용에 대한 질문만 답변 가능
- 문서 크기에 따른 처리 시간 차이 발생 가능
- API 키는 서버 사이드에서 관리 필요

## 기술 스택

- **프레임워크**: Next.js 15.1.6
- **언어**: TypeScript
- **스타일링**: TailwindCSS
- **주요 라이브러리**:
  - axios: HTTP 클라이언트
  - cheerio: 웹 크롤링
  - pdf-parse: PDF 파싱
  - sharp: 이미지 처리
  - react-dnd: 드래그 앤 드롭 기능
  - class-validator: 데이터 유효성 검증
  - @google/generative-ai: Gemini API 클라이언트
  - openai-whisper: 자막 생성 (Whisper 모델)
  - yt-dlp: YouTube 다운로드
  - ffmpeg: 비디오 처리 및 자막 합성

## 시작하기

### 환경 설정

1. 저장소 클론

   ```bash
   git clone [repository-url]
   cd util-web
   ```

2. 의존성 설치

   ```bash
   yarn install
   ```

3. 환경 변수 설정

   ```bash
   cp .env.example .env
   ```

   `.env` 파일에 필요한 환경 변수를 설정하세요:

   - `FIGMA_ACCESS_TOKEN`: Figma API 접근 토큰
   - `FIGMA_ACCESS_TOKEN_SECONDARY`: 보조 Figma API 접근 토큰 (선택)
   - `NEXT_PUBLIC_API_URL`: API 엔드포인트 URL
   - `GEMINI_API_KEY`: Google Gemini API 키
   - `GEMINI_MODEL`: 사용할 Gemini 모델 (예: gemini-2.0-flash-lite)

**참고**: 다음 도구들이 시스템에 설치되어 있어야 합니다:
   - `ffmpeg`: 비디오 처리 및 자막 합성 (설치 가이드: `scripts/INSTALL_FFMPEG.md`)
   - `whisper`: 자막 생성 (설치: `pip install openai-whisper` 또는 `pipx install openai-whisper`)
   - `yt-dlp`: YouTube 다운로드 (설치: `brew install yt-dlp`)

4. 개발 서버 실행

   ```bash
   yarn dev
   ```

5. 브라우저에서 `http://localhost:3000` 접속

### 빌드 및 프로덕션 실행

```bash
yarn build
yarn start
```

## API 엔드포인트

### Figma API

- `POST /api/v1/figma`: Figma 파일에서 컴포넌트 추출
  - 요청 파라미터:
    - `figmaUrl`: Figma 파일 URL (필수)
    - `fileName`: 생성할 컴포넌트 이름 (기본값: prompt-file)
    - `description`: 컴포넌트 설명 (선택)
    - `files`: 첨부 파일 (최대 5개)
  - 응답:
    - `message`: 처리 결과 메시지
    - `path`: 생성된 프롬프트 파일 경로
    - `attachments`: 저장된 첨부 파일 경로 목록

### 크롤러 API

- `POST /api/v1/crawler`: 웹사이트 크롤링 및 데이터 추출

### PDF API

- `POST /api/v1/pdf`: PDF 파일 파싱 및 텍스트 추출

### 자막 생성 API

- `POST /api/v1/subtitle/generate`: 오디오/비디오에서 자막 생성
  - 요청 파라미터 (FormData):
    - `audioFile`: 오디오/비디오 파일 (필수)
    - `model`: Whisper 모델 (tiny, base, small, medium, large, 기본값: large)
    - `language`: 언어 코드 (ko, en, ja, zh 등, 기본값: ko)
    - `detailLevel`: 상세도 (simple, normal, detailed, 기본값: detailed)
  - 응답: SRT 형식의 자막 텍스트

### 자막 합성 API

- `POST /api/v1/subtitle/burn`: 비디오에 자막 합성
  - 요청 파라미터 (FormData):
    - `videoFile`: 비디오 파일 (필수)
    - `srtFile`: SRT 자막 파일 (필수)
  - 응답: 자막이 합성된 MP4 비디오 파일

### YouTube 다운로드 API

- `POST /api/v1/youtube/download`: YouTube 동영상 다운로드
  - 요청 파라미터 (FormData):
    - `youtubeUrl`: YouTube URL (필수)
    - `numParts`: 분할 개수 (기본값: 1)
  - 응답:
    - `success`: 성공 여부
    - `filePath`: 다운로드된 파일 경로
    - `fileName`: 파일명
    - `fileSize`: 파일 크기 (바이트)
    - `parts`: 분할된 파일 정보 (분할 시)

### 비디오 편집 API

- `POST /api/v1/video/render`: FFmpeg 빠른 렌더링
  - 요청 파라미터 (FormData):
    - `timeline`: 타임라인 데이터 (JSON)
    - `media_*`: 미디어 파일들
    - `mediaInfo`: 미디어 정보 (JSON)
  - 응답: 렌더링된 MP4 비디오 파일

- `POST /api/v1/video/convert`: WebM을 MP4로 변환
  - 요청 파라미터 (FormData):
    - `video`: WebM 비디오 파일
    - `quality`: 품질 설정 (high, medium, low)
  - 응답: 변환된 MP4 비디오 파일

### 챗봇 API

- `POST /api/v1/gemini/document`: PDF 문서 업로드 및 처리

  - 요청 파라미터 (FormData):
    - `username`: 사용자 이름 (필수)
    - `file`: PDF 파일 (필수, 최대 10MB)
  - 응답:
    - `success`: 처리 성공 여부
    - `message`: 처리 결과 메시지
    - `textLength`: 추출된 텍스트 길이
    - `isInitialized`: 문서 초기화 상태
    - `documentKey`: 문서 식별 키
    - `documentPreview`: 문서 미리보기
    - `documentText`: 전체 문서 텍스트
    - `metadata`: 파일 메타데이터 (파일명, 크기 등)
    - `error`: 오류 발생 시 오류 메시지

- `GET /api/v1/gemini/document`: 문서 컨텍스트 조회

  - 요청 파라미터 (Query):
    - `username`: 사용자 이름 (필수)
  - 응답:
    - `success`: 조회 성공 여부
    - `hasDocument`: 문서 존재 여부
    - `textLength`: 문서 텍스트 길이
    - `isInitialized`: 초기화 상태
    - `preview`: 문서 미리보기
    - `error`: 오류 발생 시 오류 메시지

- `POST /api/v1/gemini/chat`: 챗봇 메시지 처리
  - 요청 파라미터:
    - `messages`: 대화 메시지 배열 (필수)
    - `documentText`: 문서 텍스트 (선택)
  - 응답:
    - `response`: 챗봇 응답 메시지
    - `error`: 오류 발생 시 오류 메시지

## 프로젝트 구조

```
src/
├── app/
│   ├── api/                # API 라우트
│   │   └── v1/
│   │       ├── crawler/    # 크롤러 API
│   │       ├── figma/      # Figma API
│   │       ├── pdf/        # PDF API
│   │       ├── gemini/     # Gemini 챗봇 API
│   │       ├── subtitle/   # 자막 생성/합성 API
│   │       ├── youtube/    # YouTube 다운로드 API
│   │       └── video/      # 비디오 렌더링/변환 API
│   ├── components/         # 컴포넌트
│   │   ├── layout/         # 레이아웃 컴포넌트
│   │   └── ui/             # UI 컴포넌트
│   ├── utils/              # 유틸리티 함수
│   │   ├── gemini.ts       # Gemini API 관련 유틸
│   │   └── pdf.ts          # PDF 처리 유틸
│   ├── crawler/            # 뉴스 크롤러 페이지
│   ├── figma/              # Figma 관련 페이지
│   ├── instagram-post/     # 인스타그램 포스트 생성 페이지
│   ├── gemini-chat/        # PDF Q&A 챗봇 페이지
│   ├── photo-booth/        # 포토 부스 페이지
│   ├── retro-image/        # 레트로 이미지 페이지
│   ├── subtitle-generator/ # 자막 생성기 페이지
│   ├── subtitle-burn/      # 자막 합성기 페이지
│   ├── youtube-downloader/ # YouTube 다운로더 페이지
│   └── video-editor/       # 영상 편집기 페이지
├── constants/              # 상수 정의
├── types/                  # TypeScript 타입 정의
└── scripts/                # 유틸리티 스크립트
    ├── burn-subtitle.ts    # 자막 합성 스크립트
    ├── download-youtube.sh # 유튜브 다운로드 스크립트
    └── INSTALL_FFMPEG.md   # FFmpeg 설치 가이드
```

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 개발 환경 설정

### 로컬 개발

```bash
# 종속성 설치
yarn install

# 개발 서버 실행
yarn dev
```

### Docker를 사용한 개발

```bash
# 개발 환경 컨테이너 실행
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d web-dev

# 로그 확인
docker-compose logs -f web-dev
```

## 프로덕션 배포

### Docker를 사용한 배포

```bash
# 프로덕션 빌드 및 실행
docker-compose up -d --build

# 로그 확인
docker-compose logs -f web
```

## 폰트 관리

이 프로젝트는 다음 폰트를 사용합니다:

- Noto Sans KR
- Nanum Gothic
- Nanum Myeongjo
- Nanum Pen Script
- Nanum Brush Script
- Pretendard
- Spoqa Han Sans
- Wanted Sans

모든 폰트는 `src/fonts` 디렉토리에 로컬로 저장되어 있으며, Next.js의 `next/font` 기능을 사용하여 최적화됩니다.

## 환경 변수 설정

### Docker 컨테이너에서 환경 변수 관리

환경 변수 파일(.env)을 Docker 이미지에 포함시키지 않고 관리하는 방법은 여러 가지가 있습니다:

#### 1. docker-compose.yml 파일에 직접 설정

```yaml
services:
  web:
    environment:
      - NODE_ENV=production
      - API_URL=https://api.example.com
      - NEXT_PUBLIC_ANALYTICS_ID=abcdef
```

#### 2. 외부 .env 파일 사용 (env_file 옵션)

```yaml
services:
  web:
    env_file:
      - .env.production
```

#### 3. Docker 실행 시 환경 변수 파일 지정

```bash
# docker-compose 사용 시
docker-compose --env-file .env.production up -d

# docker run 사용 시
docker run --env-file .env.production -p 4000:4000 util-web
```

#### 4. 볼륨을 통한 환경 변수 파일 마운트

```yaml
services:
  web:
    volumes:
      - ./config/.env.production:/app/.env.production:ro
```

#### 5. 컨테이너 실행 시 환경 변수 직접 전달

```bash
# docker-compose 사용 시
docker-compose run -e API_KEY=your_api_key -e DB_URL=your_db_url web

# docker run 사용 시
docker run -e API_KEY=your_api_key -e DB_URL=your_db_url -p 4000:4000 util-web
```
