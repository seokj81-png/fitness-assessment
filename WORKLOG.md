# Fitness Assessment App – 작업 로그

## 프로젝트 개요

- **경로**: `/Users/ohseokjong/Documents/Claude/Projects/운동검사/fitness-assessment-nextjs`
- **스택**: Next.js 14 (App Router) · TypeScript · Prisma (SQLite) · Tailwind CSS · Recharts
- **기준**: ACSM 11th Ed. · NSCA 4th Ed. · NASM 7th Ed. · FMS

---

## 완료된 작업 목록

### 1. 초기 환경 세팅
- Node.js v24.15.0 설치 (pkg 직접 설치)
- `npm install` 및 `npx prisma db push` 실행
- 개발 서버 구동 확인

---

### 2. 용어 수정
- 전체 코드에서 **"피검자"** → **"회원님"** 일괄 변경

---

### 3. 탭 순서 변경
기존 순서 → 새 순서:

| 순서 | 탭 |
|------|----|
| 1 | 기본 (기초정보 · PAR-Q+) |
| 2 | 신체조성 |
| **3** | **자세 (이전 6번)** |
| **4** | **움직임 (이전 7번)** |
| 5 | 심폐 |
| 6 | 근력 |
| 7 | 근지구력 |
| 8 | 종합평가 |

---

### 4. BIA 자동 계산
체지방률(%) 입력 시 나머지 항목 자동 계산:

| 항목 | 공식 |
|------|------|
| 체지방량 (FM) | 체중 × (BF% / 100) |
| 제지방량 (FFM) | 체중 − FM |
| 체수분 (TBW) | Watson 공식 (남/여 구분) |
| 기초대사량 (BMR) | Mifflin-St Jeor 공식 |

**Watson TBW 공식**
- 남: `2.447 − 0.09156×나이 + 0.1074×키 + 0.3362×체중`
- 여: `−2.097 + 0.1069×키 + 0.2466×체중`

---

### 5. 정적 자세 평가 일러스트 추가
- `public/body-posture.png` — 원본 HTML에서 추출한 전면·측면·후면 신체 일러스트 (1900×1076px)
- `src/components/assessment/BodyPostureViewer.tsx` 컴포넌트 신규 생성
- 전면(파랑) · 측면(청록) · 후면(보라) 헤더 컬러바와 함께 표시
- "3-1." 번호 제거, 범례(Kinetic Chain 설명) 제거

---

### 6. 기본 탭 — 심박/혈압 결과 즉시 표시
- 안정 심박수 · 수축기/이완기 혈압 입력 시 **기본 탭** 내에서 바로 등급 결과(ResultBox) 표시
- 기존에는 신체조성 탭에서만 확인 가능

---

### 7. FMS 코멘트 입력 기능
- **Prisma 스키마** — `fmsComments String?` 컬럼 추가 후 `prisma db push` 완료
- **`src/lib/types.ts`** — `AssessmentInput`에 `fmsComments?: Record<string, string>` 추가
- **`src/lib/parse-assessment.ts`** — DB에서 불러올 때 JSON 파싱 처리
- **AssessmentForm** — `handleSave`에서 `JSON.stringify(fmsComments)` 저장
- **MovementTab** — FMS 7개 항목 카드 각각 하단에 `<textarea>` 추가 (2줄, 저장/불러오기 연동)

---

### 8. 1RM 전 항목 등급 표시

`src/lib/norms.ts`에 NSCA 기준 norm 테이블 5개 추가:

| 변수명 | 종목 |
|--------|------|
| `SQ_RATIO_NORMS` | 백스쿼트 |
| `DL_RATIO_NORMS` | 데드리프트 |
| `OHP_RATIO_NORMS` | 오버헤드프레스 |
| `PC_RATIO_NORMS` | 파워클린 |
| `LP_RATIO_NORMS` | 레그프레스 |

`src/lib/calculations.ts`에 분류 함수 5개 추가:
- `classifySQRatio`, `classifyDLRatio`, `classifyOHPRatio`, `classifyPCRatio`, `classifyLPRatio`

근력 탭에서 벤치프레스 포함 총 6종목 체중비 + 등급 표시.

---

### 9. 종합평가 탭 — 검사 추이 꺾은선 그래프

**패키지**: `recharts` 설치

**`src/components/assessment/TrendCharts.tsx`** 신규 생성

표시 그래프 목록:

| 그래프 | 포함 지표 |
|--------|-----------|
| 체성분 | BMI, 체지방률 |
| 심폐 지구력 | VO₂max, 안정 심박수 |
| 혈압 | SBP, DBP |
| 근력 – 1RM | 벤치, 스쿼트, 데드, OHP, 레그프레스 |
| 악력 | 우측, 좌측 |
| 근지구력 | 푸시업, 컬업, 플랭크 |
| FMS 총점 | 꺾은선 |
| **FMS 레이더** | **7각형 차트 (최근 3회 비교)** |

- 검사 2회 미만이면 안내 문구 표시
- FMS는 꺾은선 대신 **7각형 레이더 차트**로 표현 (최근 최대 3회 겹쳐 비교)

---

### 10. 종합평가 탭 — FIFA 카드 스타일 체력요인 결과

**`src/components/assessment/FitnessScoreCard.tsx`** 신규 생성

| 구성요소 | 내용 |
|----------|------|
| 배경 | 네이비/인디고 다크 그라디언트 |
| 종합 점수 원형 게이지 | 0–100점, 분류별 색상 글로우 |
| 5각형 레이더 차트 | 체성분 · 심폐체력 · 근력 · 근지구력 · 움직임 |
| 좌측 버블 | 체성분(BMI, 체지방, WHR) + 근력(벤치, 스쿼트, 악력) |
| 우측 버블 | 심폐(VO₂max, RHR, BP) + 근지구력(푸시업, 컬업, 플랭크) + FMS |

**점수 변환 기준 (등급 → 0~100)**

| 등급 | 점수 | 색상 |
|------|------|------|
| Excellent | 92 | 초록 |
| Good | 76 | 파랑 |
| Average | 60 | 노랑 |
| Below Avg | 44 | 주황 |
| Poor | 28 | 빨강 |

---

## 주요 파일 변경 이력

| 파일 | 변경 내용 |
|------|-----------|
| `prisma/schema.prisma` | `fmsComments String?` 추가 |
| `src/lib/types.ts` | `fmsComments` 필드 추가 |
| `src/lib/norms.ts` | 1RM norm 테이블 5개 + CURLUP_NORMS 수정 |
| `src/lib/calculations.ts` | 1RM 분류 함수 5개 추가 |
| `src/lib/parse-assessment.ts` | `fmsComments` JSON 파싱 추가 |
| `src/components/assessment/AssessmentForm.tsx` | 탭 재정렬, BIA 자동계산, FMS 코멘트 UI, 1RM 등급, RHR/BP 즉시 표시 등 |
| `src/components/assessment/BodyPostureViewer.tsx` | 신규 — 자세 일러스트 컴포넌트 |
| `src/components/assessment/TrendCharts.tsx` | 신규 — 꺾은선/레이더 추이 차트 |
| `src/components/assessment/FitnessScoreCard.tsx` | 신규 — FIFA 카드 스타일 결과 카드 |
| `public/body-posture.png` | 신규 — 자세 평가 일러스트 PNG |
