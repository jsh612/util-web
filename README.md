# Util-Web

Next.js 기반의 유틸리티 웹 애플리케이션입니다. Figma 디자인 추출, 웹 크롤링, PDF 파싱, 이미지 편집 등 다양한 유틸리티 기능을 제공합니다.

## 주요 기능

### Figma 컴포넌트 추출

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

### 웹 크롤링

- 지정된 웹사이트의 데이터를 수집하고 분석

### PDF 파싱

- PDF 문서의 텍스트 내용을 추출하고 처리

### 이미지 편집

- 이미지 리사이징, 포맷 변환 등 기본적인 이미지 편집 기능 제공

### 인스타그램 포스트 생성

- 템플릿 기반의 인스타그램 포스트 이미지 생성

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

## 프로젝트 구조

```
src/
├── app/
│   ├── api/                # API 라우트
│   │   └── v1/
│   │       ├── crawler/    # 크롤러 API
│   │       ├── figma/      # Figma API
│   │       └── pdf/        # PDF API
│   ├── components/        # 컴포넌트
│   ├── utils/             # 유틸리티 함수
│   ├── crawler/           # 크롤러 페이지
│   ├── figma/             # Figma 관련 페이지
│   ├── image-editor/      # 이미지 편집 페이지
│   └── instagram-post/    # 인스타그램 포스트 생성 페이지
├── constants/            # 상수 정의
└── types/               # TypeScript 타입 정의
```

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.
