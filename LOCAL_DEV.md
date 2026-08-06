# 로컬 개발 환경 셋업 (노트북 이어받기용)

파프짐 체력 평가 시스템 · Next.js + Prisma
- 라이브: https://fitness-assessment-nextjs.vercel.app
- 저장소: https://github.com/seokj81-png/fitness-assessment

## 1. 최초 셋업

```bash
git clone https://github.com/seokj81-png/fitness-assessment.git
cd fitness-assessment
npm install
```

## 2. 로컬 DB 설정 (중요 ⚠️)

**운영은 PostgreSQL(Vercel), 로컬 개발은 SQLite**를 씁니다.
저장소의 `prisma/schema.prisma`는 `provider = "postgresql"`로 고정돼 있고,
로컬에서만 sqlite로 바꿔 쓰되 **git이 그 변경을 무시하도록** 설정합니다.

```bash
# ① .env 생성 (로컬 전용, gitignore 됨)
echo 'DATABASE_URL="file:./dev.db"' > .env

# ② provider를 로컬에서만 sqlite로 변경
sed -i '' 's/provider = "postgresql"/provider = "sqlite"/' prisma/schema.prisma

# ③ git이 이 파일의 로컬 변경을 영영 무시하게 설정 (실수 커밋 방지)
git update-index --skip-worktree prisma/schema.prisma

# ④ 로컬 DB 생성 + 클라이언트 생성
npx prisma db push
npx prisma generate
```

## 3. 개발 서버

```bash
npm run dev   # http://localhost:3000
```

## 4. 배포 = git push (자동배포)

```bash
git push origin master
```

GitHub → Vercel 자동배포 연동됨(2026-06-29). push하면 자동으로 빌드·운영 반영.
`prisma/schema.prisma`는 skip-worktree라 로컬 sqlite 변경이 커밋될 일 없음.

## 5. DB 스키마를 진짜 바꿀 때 (컬럼 추가 등) — 예외 절차

```bash
# ① 추적 복원 후 provider를 postgresql로 되돌림
git update-index --no-skip-worktree prisma/schema.prisma
sed -i '' 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma

# ② 스키마 수정 후 커밋 전 확인: provider 변경이 diff에 없어야 함!
git diff prisma/schema.prisma   # 새 컬럼만 보여야 정상

# ③ 커밋·push (자동배포가 prisma db push로 운영 DB 마이그레이션)
git add prisma/schema.prisma && git commit && git push

# ④ 로컬 복원
sed -i '' 's/provider = "postgresql"/provider = "sqlite"/' prisma/schema.prisma
git update-index --skip-worktree prisma/schema.prisma
npx prisma db push && npx prisma generate   # 로컬 sqlite에도 새 컬럼 반영
# dev 서버 재시작 필수 (구버전 Prisma 클라이언트가 메모리에 남음)
```

## 6. 배포 검증 팁

- GitHub 커밋 status가 `Vercel => success`인지 확인
- 스키마 변경 시 운영 API로 확인: `/api/assessments`에 새 필드 POST → GET → DELETE
- 폼 UI는 RSC 지연로드라 curl로 청크 grep해도 안 잡힘 — 브라우저로 확인
