#!/usr/bin/env bash
# 로컬 개발 환경 원클릭 셋업 — LOCAL_DEV.md 2번 자동화
# 사용법: npm run setup:local   (clone + npm install 후 1회 실행)
set -euo pipefail
cd "$(dirname "$0")/.."

echo "── 파프짐 체력평가 로컬 셋업 ──"

# ① .env 생성 (로컬 SQLite, 이미 있으면 건너뜀)
if [ ! -f .env ]; then
  echo 'DATABASE_URL="file:./dev.db"' > .env
  echo "✓ .env 생성 (SQLite)"
else
  echo "· .env 이미 존재 — 건너뜀"
fi

# ② provider를 로컬에서만 sqlite로 변경 (perl: macOS/Linux sed 호환)
if grep -q 'provider = "postgresql"' prisma/schema.prisma; then
  perl -pi -e 's/provider = "postgresql"/provider = "sqlite"/' prisma/schema.prisma
  echo "✓ prisma provider → sqlite (로컬 전용)"
else
  echo "· provider 이미 sqlite"
fi

# ③ git이 이 파일의 로컬 변경을 무시하도록 설정 (실수 커밋 방지)
git update-index --skip-worktree prisma/schema.prisma
echo "✓ git skip-worktree 설정 (schema.prisma 로컬 변경 무시)"

# ④ 로컬 DB 생성 + Prisma 클라이언트 생성
npx prisma db push --skip-generate
npx prisma generate

echo ""
echo "✅ 셋업 완료!  npm run dev  →  http://localhost:3000"
echo "   (배포는 git push — 자동배포 연동됨. 스키마 변경 시 LOCAL_DEV.md 5번 참조)"
