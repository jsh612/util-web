# 🎥 FFmpeg 설치 가이드 (macOS)

이 프로젝트의 자막 합성 스크립트(`burn-subtitle.ts`)를 실행하려면 **FFmpeg**가 반드시 설치되어 있어야 합니다.

## 1. Homebrew로 설치 (권장)

Mac에서는 패키지 관리자인 [Homebrew](https://brew.sh/index_ko)를 사용하는 것이 가장 간편합니다.

1.  터미널(Terminal)을 엽니다.
2.  아래 명령어를 입력하여 FFmpeg를 설치합니다.

```bash
brew install ffmpeg
```

> **참고:** Homebrew가 설치되어 있지 않다면, 아래 명령어로 먼저 설치하세요.
> ```bash
> /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
> ```

## 2. 설치 확인

설치가 완료되면, 터미널에서 다음 명령어를 입력하여 정상적으로 설치되었는지 확인합니다.

```bash
ffmpeg -version
```

정상적으로 설치되었다면 아래와 같이 버전 정보가 출력됩니다.

```text
ffmpeg version 6.x.x Copyright (c) 2000-2023 the FFmpeg developers
built with Apple clang version ...
...
```

## 3. 문제 해결

### "command not found: ffmpeg" 오류가 뜰 때
설치 직후에는 터미널이 FFmpeg 경로를 인식하지 못할 수 있습니다.
- 사용 중인 터미널 창을 모두 닫고 다시 열어서 시도해 보세요.
- VS Code 내의 터미널이라면, VS Code를 재시작해 보세요.
