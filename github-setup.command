#!/bin/bash
# GitHub 설정 — 더블클릭으로 실행하세요

set -e
cd "$(dirname "${BASH_SOURCE[0]}")"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Fitness Assessment → GitHub 업로드 시작"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 기존 .git 정리
if [ -d ".git" ]; then
  echo "⚠️  기존 .git 폴더 정리 중..."
  rm -rf .git
fi

echo "🔧 Git 초기화..."
git init
git branch -M main
git config user.email "seokj81@gmail.com"
git config user.name "오석종"

echo "📦 파일 추가 중..."
git add -A

echo "💾 커밋 중..."
git commit -m "Initial commit: Fitness Assessment App (Next.js 14 + Prisma + SQLite)"

echo ""
echo "✅ 로컬 Git 완료!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " 다음 단계"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. https://github.com/new 접속"
echo "   - Repository name: fitness-assessment-nextjs"
echo "   - ✅ Private (건강 데이터 보호)"
echo "   - README 추가 체크 해제"
echo "   - [Create repository] 클릭"
echo ""
echo "2. 생성 후 아래 명령어를 이 터미널에 붙여넣기:"
echo ""
echo "   git remote add origin https://github.com/[내GitHub아이디]/fitness-assessment-nextjs.git"
echo "   git push -u origin main"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " GitHub Codespaces (핸드폰 개발환경)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Push 완료 후:"
echo "📱 github.com → 저장소 → Code 버튼 → Codespaces → Create codespace"
echo "   브라우저 VS Code 열리면:"
echo "   npm install && npx prisma db push && npm run dev"
echo ""
read -p "완료! 아무 키나 눌러 닫기..."
