#!/bin/zsh
# 체력평가 시스템 — 개발 서버 시작
# Finder에서 더블클릭하면 자동으로 서버가 시작됩니다.

# ── PATH 설정: 일반적인 Node.js 설치 경로를 모두 추가 ──────────────────

# 1) 사용자 shell 프로파일 소스 (nvm, nodenv 등 설정 로드)
[[ -f "$HOME/.zprofile" ]] && source "$HOME/.zprofile"
[[ -f "$HOME/.zshrc"   ]] && source "$HOME/.zshrc"

# 2) Homebrew (Intel Mac: /usr/local, Apple Silicon: /opt/homebrew)
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/local/sbin:$PATH"

# 3) nvm 수동 로드 (nvm이 .zshrc에 없는 경우 대비)
export NVM_DIR="$HOME/.nvm"
[[ -s "$NVM_DIR/nvm.sh" ]] && source "$NVM_DIR/nvm.sh"

# 4) nodenv
export PATH="$HOME/.nodenv/bin:$HOME/.nodenv/shims:$PATH"

# 5) asdf (node 플러그인)
[[ -f "$HOME/.asdf/asdf.sh" ]] && source "$HOME/.asdf/asdf.sh"

# ── 프로젝트 폴더로 이동 ───────────────────────────────────────────────
cd "$(dirname "$0")"

echo "================================================"
echo "  체력평가 시스템 — 서버 시작 중..."
echo "================================================"
echo ""

# Node.js 확인
if ! command -v npm &>/dev/null; then
  echo "❌ npm을 찾을 수 없습니다."
  echo ""
  echo "  Node.js가 설치되어 있지 않거나,"
  echo "  PATH에 등록되지 않은 것 같습니다."
  echo ""
  echo "  해결 방법:"
  echo "  1) https://nodejs.org 에서 Node.js LTS 설치"
  echo "  2) 또는 터미널에서 직접 실행:"
  echo "     cd $(pwd) && npm run dev"
  echo ""
  read -r -p "아무 키나 누르면 창이 닫힙니다..."
  exit 1
fi

echo "✅ Node.js $(node -v) / npm $(npm -v) 확인"
echo ""

# DB가 없으면 초기화
if [ ! -f "prisma/dev.db" ]; then
  echo "▶ DB 초기화 중 (최초 1회)..."
  npx prisma db push --skip-generate
  echo ""
fi

echo "▶ 개발 서버 시작..."
echo "▶ 브라우저에서 http://localhost:3000 으로 접속하세요"
echo ""

# 브라우저 자동 오픈 (3초 후)
(sleep 3 && open "http://localhost:3000") &

npm run dev
