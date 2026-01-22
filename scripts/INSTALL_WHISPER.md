# OpenAI Whisper 설치 가이드

이 문서는 음성 파일에서 자막을 자동 생성하는 스크립트를 사용하기 위한 Whisper 설치 방법을 안내합니다.

## 📋 필요 사항

- Python 3.8 이상
- pip (Python 패키지 관리자)

## 🚀 설치 방법

### 1. Python 설치 확인

터미널에서 다음 명령어로 Python이 설치되어 있는지 확인합니다:

```bash
python3 --version
```

Python이 설치되어 있지 않다면 [Python 공식 웹사이트](https://www.python.org/downloads/)에서 다운로드하여 설치하세요.

### 2. OpenAI Whisper 설치

#### macOS (권장 - pipx 사용)

최신 macOS에서는 시스템 Python 패키지 설치가 제한되어 있습니다. `pipx`를 사용하는 것을 권장합니다:

```bash
# pipx 설치 (Homebrew 필요)
brew install pipx

# Whisper 설치
pipx install openai-whisper

# PATH에 추가
pipx ensurepath
```

설치 후 **새 터미널을 열거나** 다음 명령어를 실행하세요:
```bash
source ~/.zshrc   # 또는 source ~/.bashrc
```

#### Linux 또는 가상환경 사용 시

```bash
python3 -m pip install openai-whisper
```

#### "externally-managed-environment" 오류 발생 시

macOS에서 pip 설치 시 이 오류가 발생하면 위의 pipx 방법을 사용하세요.

### 3. 설치 확인

설치가 완료되었는지 확인합니다:

```bash
whisper --help
```

pipx로 설치한 경우 PATH가 적용되기 전에는 다음 경로로 확인할 수 있습니다:

```bash
~/.local/bin/whisper --help
```

## 📝 사용 방법

### 기본 사용법

```bash
npx tsx scripts/generate-subtitle.ts <음성파일경로>
```

### 예시

```bash
# 기본 사용 (base 모델, 한국어)
npx tsx scripts/generate-subtitle.ts temp-videos/audio.wav

# 출력 파일명 지정
npx tsx scripts/generate-subtitle.ts temp-videos/audio.wav temp-videos/subtitle.srt

# 모델 크기 지정 (small 모델 사용)
npx tsx scripts/generate-subtitle.ts temp-videos/audio.wav temp-videos/subtitle.srt small

# 영어 음성 인식
npx tsx scripts/generate-subtitle.ts temp-videos/audio.wav temp-videos/subtitle.srt base en
```

## 🎯 모델 크기 옵션

| 모델 | 속도 | 정확도 | 용량 | 추천 용도 |
|------|------|--------|------|----------|
| tiny | 매우 빠름 | 낮음 | ~39MB | 빠른 테스트 |
| base | 빠름 | 보통 | ~74MB | 일반 사용 (기본값) |
| small | 보통 | 좋음 | ~244MB | 정확도가 중요한 경우 |
| medium | 느림 | 매우 좋음 | ~769MB | 고품질 자막 필요 |
| large | 매우 느림 | 최고 | ~1550MB | 최고 품질 필요 |

## 🌍 지원 언어

Whisper는 99개 이상의 언어를 지원합니다. 주요 언어 코드:

- `ko`: 한국어 (기본값)
- `en`: 영어
- `ja`: 일본어
- `zh`: 중국어
- `auto`: 자동 감지

전체 언어 목록은 [Whisper GitHub](https://github.com/openai/whisper)에서 확인할 수 있습니다.

## 🔧 문제 해결

### "whisper: command not found" 오류

Whisper가 설치되었지만 명령어를 찾을 수 없는 경우:

1. Python 경로 확인:
   ```bash
   which python3
   ```

2. pip로 설치된 패키지 경로 확인:
   ```bash
   python3 -m pip show openai-whisper
   ```

3. PATH에 Python 스크립트 경로 추가 (필요한 경우)

### 메모리 부족 오류

큰 모델(large, medium)을 사용할 때 메모리 부족이 발생할 수 있습니다:

- 더 작은 모델 사용 (base, small)
- 다른 프로그램 종료
- 시스템 메모리 확인

### 느린 처리 속도

처리 속도가 느린 경우:

- 더 작은 모델 사용 (tiny, base)
- GPU 가속 사용 (CUDA 지원 GPU가 있는 경우)
- 오디오 파일 길이 확인

## 📚 참고 자료

- [OpenAI Whisper GitHub](https://github.com/openai/whisper)
- [Whisper 모델 정보](https://github.com/openai/whisper#available-models-and-languages)
