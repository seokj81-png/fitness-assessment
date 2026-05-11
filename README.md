# 종합 체력평가 시스템 · Fitness Assessment (Next.js)

ACSM · NSCA · NASM · FMS 가이드라인에 기반한 운동 처방 전 체력평가/스크리닝 웹앱입니다.
피검자(Client) 관리 + 다회차 평가(Assessment) 기록 + 가이드라인 기반 자동 권장사항 생성을 지원합니다.

## 기능 개요

- **8개 탭 종합 평가**: 기본정보/PAR-Q+ → 신체조성 → 심폐지구력 → 근력 → 근지구력 → 자세 → 움직임 → 종합 보고서
- **자동 계산/분류**
  - BMI (Asia-Pacific 기준) · WHR · Jackson-Pollock 3-site 체지방률 · Siri 방정식
  - Rockport / 1.5-mile Run / Cooper 12-min / YMCA Step VO₂max 추정
  - 1RM 추정 (Epley · Brzycki · Lombardi 평균)
  - 악력·푸시업·YMCA 벤치프레스·컬업·McGill 플랭크·Biering-Sørensen 규준 분류
- **자세 분석**: NASM 5 Kinetic Chain Checkpoints × 3 뷰 → Pronation Distortion / Lower Crossed / Upper Crossed Syndrome 자동 매칭
- **움직임 스크린**: FMS 2.0 — 7가지 테스트 + 3가지 Clearing Tests · 좌우 비대칭/0점 자동 감지
- **자동 운동처방 방향**: 가이드라인 임계치 기반 우선순위(critical/high/medium/low) 권장사항 생성
- **인쇄/PDF 저장** 지원

## 기반 가이드라인

| 영역 | 가이드라인 |
|------|-----------|
| 신체조성 · 심폐지구력 · PAR-Q+ · 혈압 분류 | ACSM's Guidelines for Exercise Testing and Prescription (11판) |
| 근력 · 근지구력 · 1RM 추정 | NSCA's Essentials of Personal Training (4판), Essentials of Strength Training and Conditioning |
| 자세 분석 · 보상 패턴 · 교정 운동 | NASM CPT (7판) — Kinetic Chain Checkpoints / Overhead Squat Assessment |
| 움직임 스크리닝 | Functional Movement Screen 2.0 (Cook et al., 2014) |

## 기술 스택

- Next.js 14 (App Router) · React 18 · TypeScript
- Prisma 5 + SQLite (로컬 파일 DB)
- Tailwind CSS 3

## 빠른 시작

### 1. 의존성 설치

```bash
cd fitness-assessment-nextjs
npm install
```

`postinstall`에서 `prisma generate`가 자동 실행됩니다.

### 2. 환경변수 준비

`.env.example`을 복사해서 `.env`를 만듭니다(이미 포함되어 있음).

```
DATABASE_URL="file:./dev.db"
```

### 3. DB 초기화

```bash
npm run db:push      # prisma/schema.prisma → SQLite 파일 동기화 (빠른 방법)
# 또는 마이그레이션으로 관리
# npm run db:migrate
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000`에 접속합니다.

### 5. (선택) Prisma Studio로 DB 보기

```bash
npm run db:studio
```

## 사용 흐름

1. 메인 화면(`/`) → **+ 새 피검자** 버튼으로 피검자 등록 (이름, 성별, 생년월일, 신장/체중, 운동경력, 목적 등)
2. 피검자 상세 화면에서 **+ 새 체력평가** 클릭 → 8개 탭을 차례로 채움
3. 각 입력란은 자동으로 분류 결과(우수/양호/보통/미흡/열악)와 가이드라인 태그를 표시합니다.
4. ⑧ 종합 탭에서 자동 권장사항 + 메모 작성 → **평가 저장**
5. 이후 평가는 `피검자 상세 → 평가 이력` 목록에서 열람/수정/삭제 가능
6. 상세 페이지에서 **🖨 인쇄/PDF** 버튼으로 보고서 출력

## 폴더 구조

```
fitness-assessment-nextjs/
├── prisma/
│   └── schema.prisma           # Client · Assessment 모델
├── src/
│   ├── app/
│   │   ├── layout.tsx          # 상단 헤더 + 네비게이션
│   │   ├── page.tsx            # 피검자 목록
│   │   ├── globals.css         # Tailwind + 커스텀 클래스 (pill-*, guideline-tag, card 등)
│   │   ├── api/
│   │   │   ├── clients/        # GET/POST, [id] GET/PATCH/DELETE
│   │   │   └── assessments/    # GET/POST, [id] GET/PATCH/DELETE (JSON 직렬화 처리)
│   │   └── clients/
│   │       ├── new/            # 신규 피검자
│   │       └── [id]/
│   │           ├── page.tsx                         # 피검자 상세
│   │           ├── edit/                            # 피검자 정보 수정
│   │           └── assessment/
│   │               ├── new/                         # 새 평가
│   │               └── [aid]/
│   │                   ├── page.tsx                 # 평가 보고서 (읽기)
│   │                   └── edit/                    # 평가 수정
│   ├── components/
│   │   ├── assessment/
│   │   │   ├── AssessmentForm.tsx   # 8개 탭 입력 + 자동계산
│   │   │   └── classification.ts    # 분류 pill 클래스 매퍼
│   │   └── ui/
│   │       └── ResultBox.tsx
│   └── lib/
│       ├── db.ts                    # Prisma 클라이언트 싱글톤
│       ├── types.ts                 # 도메인 타입
│       ├── norms.ts                 # 규준 테이블 (VO2max/grip/pushup/curlup/FMS/자세 증후군)
│       ├── calculations.ts          # 계산 및 분류 함수, 권장사항 엔진
│       └── parse-assessment.ts      # DB row → AssessmentInput 역직렬화
├── package.json
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.js
└── .env / .env.example
```

## 데이터 모델 요약

- `Client`: id, name, sex(M/F), dob, height, weight, occupation, smoking, experience, goal, medical
- `Assessment`: clientId(FK), date, assessor, PAR-Q+ 답안(JSON), 안정시 vitals, 신체조성 일체, 심폐지구력 테스트, 1RM/악력, 근지구력, 자세 체크플래그(JSON), FMS 점수/clearing tests(JSON), OHSA 플래그(JSON), ROM(JSON), notes

JSON 형태 필드(`parq`, `postureFlags`, `fms`, `ohsaFlags`, `rom`)는 API 계층에서 문자열로 직렬화/역직렬화합니다.

## 배포 시 주의

- 기본 SQLite는 단일 파일 기반이므로 다중 인스턴스/Serverless 환경에서는 Postgres 등으로 전환을 권장합니다.
  - `schema.prisma`의 `provider`를 `postgresql`로 변경하고 `DATABASE_URL`을 연결 문자열로 교체 → `npx prisma migrate deploy`
- 의료 정보(`medical`, `parq`)는 민감정보입니다. 실제 운영 시 접근 통제/암호화/보관기간 정책을 반드시 적용하세요.

## 면책

본 앱은 **운동 처방 참고용** 도구이며 의료 진단·치료를 대체하지 않습니다. PAR-Q+ 양성 문항, 흉통·현기증 등 위험 신호가 있을 경우 반드시 의료 전문가 상담 후 운동을 진행하세요.
