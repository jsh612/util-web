# Util Web

Next.js로 구현된 유틸리티 웹 애플리케이션입니다.

## 주요 기능

1. Figma 컴포넌트 생성

   - Figma 파일에서 컴포넌트 정보를 가져와 프롬프트 생성
   - PDF 및 이미지 파일 첨부 지원
   - 생성된 프롬프트 파일 저장

2. 뉴스 크롤러
   - 네이버 뉴스 크롤링 지원
   - CNN 뉴스 크롤링 지원
   - 제목, 본문, 작성자, 날짜 등 정보 추출

## 기술 스택

- Next.js 14
- TypeScript
- TailwindCSS
- Axios
- Cheerio
- PDF Parse

## 시작하기

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

## API 엔드포인트

### 컴포넌트 생성

- POST `/api/v1/component`
  - 멀티파트 폼 데이터로 요청
  - 필수 필드: figmaFileId, nodeId, filePath, fileName
  - 선택 필드: description, files

### 뉴스 크롤링

- GET `/api/v1/crawler?url=[news-url]`
  - url: 네이버 뉴스 또는 CNN 뉴스 URL

## 라이선스

MIT
