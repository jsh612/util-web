#!/bin/zsh

# 사용법을 출력하는 함수
print_usage() {
    echo "사용법: ./install-arm64-node.sh [노드버전]"
    echo "예시: ./install-arm64-node.sh v21.7.3"
}

# 버전 인자가 없으면 사용법 출력 후 종료
if [ -z "$1" ]; then
    print_usage
    exit 1
fi

NODE_VERSION=$1

# 현재 아키텍처 확인
CURRENT_ARCH=$(arch)
echo "현재 아키텍처: $CURRENT_ARCH"

# arm64 쉘로 전환
echo "arm64 쉘로 전환 중..."
arch -arm64 zsh << EOF
    # 현재 아키텍처 확인
    echo "전환된 아키텍처: \$(arch)"
    
    # 이미 설치된 버전인지 확인
    if nvm ls | grep -q "${NODE_VERSION}"; then
        echo "Node.js ${NODE_VERSION}이(가) 이미 설치되어 있습니다."
    else
        # 지정된 버전의 Node.js 설치
        echo "Node.js ${NODE_VERSION} arm64 버전 설치 중..."
        nvm install ${NODE_VERSION}
    fi
    
    # 설치된 버전으로 전환
    nvm use ${NODE_VERSION}
    
    # 설치 확인
    echo "설치된 Node.js 정보:"
    node -v
    echo "아키텍처: \$(node -p "process.arch")"
EOF

echo "설치 완료!"