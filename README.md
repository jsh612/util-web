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

### YouTube Shorts 자동 자막 생성 (FFmpeg)

로컬 비디오 파일과 자막 파일(.srt)을 결합하여 유튜브 쇼츠에 최적화된 스타일리시한 자막 영상을 생성합니다.

#### 주요 특징

- **화자별 자동 색상**: 자막의 `[화자명]`을 인식하여 화자별로 고유한 파스텔톤 색상을 자동으로 적용
- **쇼츠 최적화 스타일**: 모바일 화면에 최적화된 폰트 크기, 위치, 가독성 좋은 테두리 스타일 적용
- **줄바꿈 지원**: 자막 파일 내 `\n` 입력을 통해 원하는 위치에서 줄바꿈 가능

#### 사용 방법

1. **FFmpeg 설치**: 시스템에 FFmpeg가 설치되어 있어야 합니다. (설치 가이드: `scripts/INSTALL_FFMPEG.md`)
2. **자막 준비**: `.srt` 형식으로 준비하며, `[화자명] 대사 내용` 형식으로 작성합니다.
3. **명령어 실행**:

   ```bash
   npx tsx scripts/burn-subtitle.ts <비디오경로> <자막경로> [출력파일명]
   # 예시: npx tsx scripts/burn-subtitle.ts video.mp4 subtitle.srt output.mp4
   ```

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
│   │       └── gemini/     # Gemini 챗봇 API
│   ├── components/         # 컴포넌트
│   │   ├── layout/        # 레이아웃 컴포넌트
│   │   └── ui/            # UI 컴포넌트
│   ├── utils/             # 유틸리티 함수
│   │   ├── gemini.ts      # Gemini API 관련 유틸
│   │   └── pdf.ts         # PDF 처리 유틸
│   ├── crawler/           # 뉴스 크롤러 페이지
│   ├── figma/             # Figma 관련 페이지
│   ├── instagram-post/    # 인스타그램 포스트 생성 페이지
│   └── gemini-chat/       # PDF Q&A 챗봇 페이지
├── constants/            # 상수 정의
└── types/               # TypeScript 타입 정의
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
