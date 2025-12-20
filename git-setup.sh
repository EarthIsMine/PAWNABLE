#!/bin/bash

echo "==================================="
echo "PAWNABLE GitHub 업로드 준비"
echo "==================================="
echo ""

# .env 파일이 Git에 포함되지 않았는지 확인
echo "1. .env 파일 보안 확인..."
if git ls-files | grep -q "^\.env$"; then
    echo "⚠️  경고: .env 파일이 Git에 추적되고 있습니다!"
    echo "   다음 명령어로 제거하세요:"
    echo "   git rm --cached .env"
    echo "   git commit -m 'Remove .env from repository'"
else
    echo "✅ .env 파일이 Git에서 안전하게 제외되어 있습니다."
fi
echo ""

# 현재 상태 확인
echo "2. Git 상태 확인..."
git status
echo ""

# 모든 변경사항 추가
echo "3. 모든 변경사항을 Git에 추가하시겠습니까? (y/n)"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    git add .
    echo "✅ 파일들이 staging area에 추가되었습니다."
    echo ""

    echo "4. 커밋 메시지를 입력하세요 (기본: 'feat: Complete PAWNABLE backend implementation'):"
    read -r commit_msg

    if [ -z "$commit_msg" ]; then
        commit_msg="feat: Complete PAWNABLE backend implementation

- Implement wallet-based authentication (JWT + signature verification)
- Add User, Asset, Loan, Collateral, OnchainTxLog models
- Create RESTful API with Express.js and TypeORM
- Add P2P loan matching system
- Configure PostgreSQL database
- Add seed script for initial assets
- Implement CORS and error handling middlewares

🤖 Generated with Claude Code"
    fi

    git commit -m "$commit_msg"
    echo "✅ 커밋이 완료되었습니다."
    echo ""
else
    echo "취소되었습니다."
    exit 0
fi

# GitHub 원격 저장소 설정
echo "5. GitHub 원격 저장소를 설정하시겠습니까? (y/n)"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    echo "   GitHub 저장소 URL을 입력하세요 (예: https://github.com/username/pawnable.git):"
    read -r repo_url

    if [ -z "$repo_url" ]; then
        echo "⚠️  URL이 입력되지 않았습니다. 건너뜁니다."
    else
        git remote add origin "$repo_url" 2>/dev/null || git remote set-url origin "$repo_url"
        echo "✅ 원격 저장소가 설정되었습니다: $repo_url"
        echo ""

        echo "6. GitHub에 푸시하시겠습니까? (y/n)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            git push -u origin main
            echo "✅ GitHub에 업로드되었습니다!"
        fi
    fi
fi

echo ""
echo "==================================="
echo "완료!"
echo "==================================="
echo ""
echo "다음 단계:"
echo "1. GitHub에서 저장소 확인"
echo "2. .env 파일이 업로드되지 않았는지 재확인"
echo "3. README.md가 정상적으로 표시되는지 확인"
echo ""
echo "협업자를 위한 안내:"
echo "- 프로젝트를 클론한 후 '.env.setup.md' 파일을 참고하여 .env 설정"
echo "- 'cp .env.example .env' 명령으로 환경 변수 파일 생성"
echo ""
