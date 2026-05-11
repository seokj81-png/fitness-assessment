#!/bin/bash
# GitHub 설정 스크립트 — fitness-assessment-nextjs

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "📁 프로젝트 디렉토리: $PROJECT_DIR"
echo ""

# .git 폴더가 있으면 삭제 후 재초기화
if [ -d ".git" ]; then
  echo "⚠️  기존 .git 폴더 정리 중..."
  rm -rf .git
fi

echo "🔧 Git 초기화..."
git init
git branch -M main
git config user.email "seokj81@gmail.com"
git config user.name "오석종"

echo ""
echo "📦 파일 스테이징..."
git add -A
git status --short

echo ""
echo "💾 초기 커밋..."
git commit -m "Initial commit: Fitness Assessment App (Next.js 14 + Prisma + SQLite)"

echo ""
echo "✅ 로컬 Git 설정 완료!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "다음 단계: GitHub에 올리기"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. https://github.com/new 에서 새 저장소 만들기"
echo "   - Repository name: fitness-assessment-nextjs"
echo "   - Private 선택 (건강 데이터이므로)"
echo "   - README 추가 체크 해제"
echo ""
echo "2. 저장소 만든 후 아래 명령어 실행 (YOUR_USERNAME 교체):"
echo ""
echo "   git remote add origin https://github.com/YOUR_USERNAME/fitness-assessment-nextjs.git"
echo "   git push -u origin main"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "GitHub Codespaces로 폰에서 개발하는 방법:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. 핸드폰에서 github.com 접속"
echo "2. fitness-assessment-nextjs 저장소 열기"
echo "3. 초록색 'Code' 버튼 → 'Codespaces' 탭 → 'Create codespace'"
echo "4. 브라우저에서 VS Code 환경 열림"
echo "5. 터미널에서: npm install && npx prisma db push && npm run dev"
echo ""
