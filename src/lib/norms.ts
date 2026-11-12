// Normative tables from ACSM 11th Ed., NSCA 4th Ed., NASM 7th Ed.
// All thresholds represented as ascending [vPoor, poor, average, good] upper-bounds
// => value > good → excellent / > average → good / > poor → average / > vPoor → below / else → poor

import type { Sex } from './types';

export type AgeGroup = 20 | 30 | 40 | 50 | 60;
export type NormTable = Record<Sex, Record<AgeGroup, [number, number, number, number]>>;

// VO2max (ml/kg/min) – ACSM 11판 심폐체력 분류(FRIEND 자료, 트레드밀)
// 값 = 20·40·60·80 백분위 = 원표의 낮음(Poor)·보통(Fair)·좋음(Good)·우수(Excellent) 시작값.
// 원표 6등급 중 우수(Excellent)와 최우수(Superior)는 "매우우수" 한 칸으로 묶는다. 60대 줄은 원표 60–69세.
// 2026-11-12 원표 대조: 예전 값은 11판 분류보다 전 줄이 4~8 높았고 출처를 찾지 못했다.
// 값 확인은 11판 표를 실은 논문 부록(IJES 2025, PMC12408081 부록 표 9)으로 했다 — 책 원본과 한 번 더 맞춰 볼 것.
export const VO2MAX_NORMS: NormTable = {
  M: {
    20: [38.1, 44.9, 50.2, 57.1],
    30: [34.1, 39.6, 45.2, 51.6],
    40: [30.5, 35.7, 40.3, 46.7],
    50: [26.1, 30.7, 35.1, 41.2],
    60: [22.4, 26.6, 30.5, 36.1],
  },
  F: {
    20: [28.6, 34.6, 40.6, 46.5],
    30: [24.1, 28.2, 32.2, 37.5],
    40: [21.3, 24.9, 28.7, 34.0],
    50: [19.1, 21.8, 25.2, 28.6],
    60: [16.5, 18.9, 21.2, 24.6],
  },
};

// Bench Press 1RM / body weight ratio – 쿠퍼 연구소(The Cooper Institute) 표의 20·40·60·80 백분위
// 2026-11-12 원표 대조: 30·40대 남성만 원표와 같았다. 20대 줄에는 20세 미만 칸 값이 섞여 있었고
// 나머지 줄은 0.01~0.05씩 어긋나 있었다 → 10줄 모두 원표 값으로 맞춤.
export const BP_RATIO_NORMS: NormTable = {
  M: {
    20: [0.88, 0.99, 1.14, 1.32],
    30: [0.78, 0.88, 0.98, 1.12],
    40: [0.72, 0.8, 0.88, 1.0],
    50: [0.63, 0.71, 0.79, 0.9],
    60: [0.57, 0.66, 0.72, 0.82],
  },
  F: {
    20: [0.51, 0.59, 0.7, 0.8],
    30: [0.47, 0.53, 0.6, 0.7],
    40: [0.43, 0.5, 0.54, 0.62],
    50: [0.39, 0.44, 0.48, 0.55],
    60: [0.38, 0.43, 0.47, 0.54],
  },
};

// Grip strength (left+right sum, kg) – ACSM 11판에 실린 CSEP-PATH 표
// 원표는 "우수 48–53 / 매우우수 ≥54"처럼 범위로 적혀 있다. 여기 값은 각 등급의 상한(= 다음 등급 하한 − 1).
// 2026-11-12 원표 대조: 예전 값은 다음 등급의 하한을 그대로 넣어 경계가 1kg씩 어긋나 있었다
// (예: 60대 여성 54kg이 매우우수가 아니라 우수로 나옴). 50대 남성 낮음 하한 76, 60대 남성 평균 하한 84도 바로잡음.
export const GRIP_NORMS: NormTable = {
  M: {
    20: [83, 94, 103, 114],
    30: [83, 94, 103, 114],
    40: [79, 87, 96, 107],
    50: [75, 83, 91, 100],
    60: [72, 83, 90, 99],
  },
  F: {
    20: [51, 57, 62, 69],
    30: [50, 57, 62, 70],
    40: [48, 53, 60, 68],
    50: [44, 48, 53, 60],
    60: [40, 44, 47, 53],
  },
};

// Push-up (reps) – ACSM 11판에 실린 CSEP-PATH 표 (M: standard / F: modified)
// 2026-11-12 원표 대조: 60대 여성 줄이 한 칸씩 밀려 있었다([0,1,4,11] → [1,4,11,16]).
// 원표 60–69세 여성: ≤1 / 2–4 / 5–11 / 12–16 / ≥17
export const PUSHUP_NORMS: NormTable = {
  M: {
    20: [16, 21, 28, 35],
    30: [11, 16, 21, 29],
    40: [9, 12, 16, 24],
    50: [6, 9, 12, 20],
    60: [4, 7, 10, 17],
  },
  F: {
    20: [9, 14, 20, 29],
    30: [7, 12, 19, 26],
    40: [4, 10, 14, 23],
    50: [1, 6, 10, 20],
    60: [1, 4, 11, 16],
  },
};

// YMCA Bench Press endurance (reps) – YMCA 체력검사 매뉴얼의 7등급표(18–25 … 56–65세)
// 7등급을 5등급으로 묶음(스쿼트 지구력과 같은 방식): 매우낮음 = Very poor / 낮음 = Poor /
// 평균 = Below average·Average / 우수 = Above average·Good / 매우우수 = Excellent. 연령대는 20대 = 18–25세 … 60대 = 56–65세.
// 2026-11-12 레퍼런스 조사: 등급 구간을 이어 붙인 정리본(TrainerMetrics)으로 확인 — YMCA 매뉴얼 원본은 보지 못했다.
// 56–65세는 원표에서도 남녀 값이 같다.
export const YMCA_BP_NORMS: NormTable = {
  M: {
    20: [12, 19, 28, 43],
    30: [11, 16, 25, 40],
    40: [8, 13, 21, 35],
    50: [4, 8, 15, 27],
    60: [1, 4, 11, 23],
  },
  F: {
    20: [8, 15, 24, 41],
    30: [8, 13, 23, 39],
    40: [5, 11, 20, 32],
    50: [1, 6, 13, 28],
    60: [1, 4, 11, 23],
  },
};

// Pull-up Test (strict, reps to failure) – field test norms
// 데드행에서 턱이 바 위로, 반동 없이 최대 반복
export const PULLUP_NORMS: NormTable = {
  M: {
    20: [4, 7, 10, 14],
    30: [2, 5, 8, 12],
    40: [1, 4, 6, 10],
    50: [0, 2, 5, 8],
    60: [0, 1, 3, 6],
  },
  F: {
    20: [0, 1, 3, 5],
    30: [0, 1, 2, 4],
    40: [0, 0, 1, 3],
    50: [0, 0, 1, 2],
    60: [0, 0, 0, 1],
  },
};

// Bodyweight Squat Endurance Test (reps to failure) – 스쿼트 검사 7등급표(18–25 … 56–65세)
// 대퇴 수평까지, 일정 템포, 자세 무너질 때까지 최대 반복
// 7등급을 5등급으로 묶음: 매우낮음 = Very poor / 낮음 = Poor / 평균 = Below average·Average /
// 우수 = Above average·Good / 매우우수 = Excellent. 연령대는 20대 = 18–25세 … 60대 = 56–65세.
// 2026-11-12 원표 대조: 남 40·50·60대와 여 60대의 아래쪽 값이 원표와 달라 맞춤.
export const SQUAT_END_NORMS: NormTable = {
  M: {
    20: [24, 30, 38, 49],
    30: [21, 28, 34, 45],
    40: [16, 22, 29, 41],
    50: [12, 17, 24, 35],
    60: [8, 12, 20, 31],
  },
  F: {
    20: [17, 24, 32, 43],
    30: [12, 20, 28, 39],
    40: [6, 14, 22, 33],
    50: [4, 9, 17, 27],
    60: [2, 6, 12, 24],
  },
};

// 눈뜨고 외발서기 (초) — 연령별 참고 기준 (국내 노인 체력평가·건강관리 참고치 기반)
// 20–40대: 30초 양호·60초 우수 / 50대: 20–30초 양호 / 60대+: 10–20초 보통, 20초+ 양호, 30초+ 좋음
// 2026-11-12 레퍼런스 조사: 60대 이상 줄만 일본 문부과학성 신체력 테스트(65–79세) 개안 편족 서기 득점표로 바꿈.
// 10점 척도를 2점씩 묶어 5등급으로(1–2점 매우낮음 … 9–10점 매우우수). 남 ≤6 / 7–14 / 15–30 / 31–72 / ≥73초, 여 ≤4 / 5–11 / 12–25 / 26–66 / ≥67초.
// 원표 방법은 편한 쪽 발·2회 중 좋은 기록·최대 120초 — 앱은 좌우 중 약한 쪽으로 판정하므로 원표보다 조금 엄격하다.
// 20–50대 줄은 원표가 없다(건강한 60세 미만은 45초 만점에 가까워 등급을 나눌 자료가 없음 — Springer 2007).
export const BALANCE_NORMS: NormTable = {
  M: {
    20: [10, 20, 30, 60],
    30: [10, 20, 30, 60],
    40: [10, 20, 30, 45],
    50: [8, 15, 20, 40],
    60: [6, 14, 30, 72],
  },
  F: {
    20: [10, 20, 30, 60],
    30: [10, 20, 30, 60],
    40: [10, 20, 30, 45],
    50: [8, 15, 20, 40],
    60: [4, 11, 25, 66],
  },
};

// Partial Curl-up (reps) – 부분 컬업 백분위표(NSCA 교재 수록)의 20·40·60·80 백분위
// 2026-11-12 원표 대조: 예전 값은 원표에 없는 숫자였다(여성 줄 = 남성 줄을 한 연령대 밀어 쓴 값).
export const CURLUP_NORMS: NormTable = {
  M: {
    20: [13, 24, 31, 56],
    30: [13, 24, 36, 69],
    40: [13, 23, 35, 60],
    50: [10, 19, 27, 45],
    60: [6, 15, 21, 39],
  },
  F: {
    20: [12, 21, 32, 45],
    30: [10, 14, 28, 42],
    40: [5, 13, 19, 30],
    50: [3, 9, 13, 24],
    60: [2, 7, 10, 20],
  },
};

// Back Squat 1RM / body weight ratio – NSCA
export const SQ_RATIO_NORMS: NormTable = {
  M: { 20:[1.06,1.33,1.55,1.75], 30:[0.93,1.15,1.35,1.53], 40:[0.82,0.99,1.16,1.32], 50:[0.70,0.86,0.99,1.13], 60:[0.58,0.73,0.86,1.00] },
  F: { 20:[0.65,0.84,0.97,1.17], 30:[0.57,0.73,0.84,0.98], 40:[0.50,0.65,0.76,0.89], 50:[0.43,0.57,0.66,0.77], 60:[0.35,0.48,0.57,0.72] },
};

// Deadlift 1RM / body weight ratio – NSCA
export const DL_RATIO_NORMS: NormTable = {
  M: { 20:[1.44,1.77,2.05,2.28], 30:[1.26,1.57,1.81,2.04], 40:[1.10,1.38,1.60,1.82], 50:[0.94,1.19,1.42,1.65], 60:[0.78,0.98,1.15,1.35] },
  F: { 20:[0.80,1.02,1.21,1.45], 30:[0.70,0.89,1.06,1.28], 40:[0.60,0.78,0.93,1.12], 50:[0.52,0.68,0.81,0.98], 60:[0.44,0.58,0.71,0.86] },
};

// Overhead Press 1RM / body weight ratio – NSCA
export const OHP_RATIO_NORMS: NormTable = {
  M: { 20:[0.62,0.71,0.80,0.91], 30:[0.54,0.63,0.70,0.80], 40:[0.47,0.55,0.62,0.72], 50:[0.40,0.48,0.55,0.64], 60:[0.33,0.41,0.48,0.57] },
  F: { 20:[0.34,0.41,0.47,0.55], 30:[0.29,0.36,0.41,0.48], 40:[0.25,0.31,0.36,0.43], 50:[0.21,0.27,0.32,0.38], 60:[0.18,0.23,0.28,0.34] },
};

// Power Clean 1RM / body weight ratio – NSCA
export const PC_RATIO_NORMS: NormTable = {
  M: { 20:[0.84,0.99,1.10,1.20], 30:[0.73,0.86,0.96,1.06], 40:[0.63,0.75,0.85,0.95], 50:[0.54,0.65,0.74,0.84], 60:[0.45,0.56,0.65,0.75] },
  F: { 20:[0.52,0.63,0.71,0.80], 30:[0.45,0.55,0.62,0.70], 40:[0.39,0.48,0.55,0.63], 50:[0.34,0.42,0.48,0.56], 60:[0.28,0.36,0.43,0.51] },
};

// Leg Press 1RM / body weight ratio – 쿠퍼 연구소(The Cooper Institute) 표의 20·40·60·80 백분위
// ACSM 운동검사·운동처방 지침서의 "Fitness Categories for Leg Strength by Age and Sex" 표에 실린 값.
// 원표는 유니버설 머신(Universal DVR) 레그프레스로 잰 값이라 45도 슬레드 등 다른 기구는 체중비가 더 높게 나올 수 있다.
// 2026-11-12 레퍼런스 조사: 예전 값은 원표보다 0.3~0.6 높았고(예: 20대 남성 매우우수 >2.77, 원표 90백분위가 2.27) 출처를 찾지 못했다.
export const LP_RATIO_NORMS: NormTable = {
  M: { 20:[1.63,1.83,1.97,2.13], 30:[1.52,1.65,1.77,1.93], 40:[1.44,1.57,1.68,1.82], 50:[1.32,1.46,1.58,1.71], 60:[1.25,1.38,1.49,1.62] },
  F: { 20:[1.22,1.37,1.50,1.68], 30:[1.09,1.21,1.33,1.47], 40:[1.02,1.13,1.23,1.37], 50:[0.88,0.99,1.10,1.25], 60:[0.85,0.93,1.04,1.18] },
};

// WHR health risk thresholds
export const WHR_NORMS: Record<Sex, Record<AgeGroup, [number, number, number, number]>> = {
  M: {
    20: [0.83, 0.88, 0.94, 1.0],
    30: [0.84, 0.91, 0.96, 1.01],
    40: [0.88, 0.95, 1.0, 1.03],
    50: [0.9, 0.96, 1.02, 1.04],
    60: [0.9, 0.96, 1.02, 1.04],
  },
  F: {
    20: [0.71, 0.77, 0.82, 0.87],
    30: [0.72, 0.78, 0.84, 0.89],
    40: [0.73, 0.79, 0.87, 0.91],
    50: [0.74, 0.81, 0.88, 0.94],
    60: [0.74, 0.81, 0.88, 0.94],
  },
};

// Posture distortion patterns (NASM)
export const POSTURE_SYNDROMES = [
  {
    id: 'pds' as const,
    name: 'Pronation Distortion Syndrome (발목회내 증후군)',
    keys: ['ant_foot_flat', 'ant_foot_pron', 'ant_knee_valgus', 'post_foot_pron'],
    overactive:
      '비복근·가자미근, 비골근, 내전근, 장경인대(IT band), 고관절 굴곡근 (Gastroc/Soleus, Peroneals, Adductors, IT band, Hip flexors)',
    underactive:
      '전경골근·후경골근, 중둔근·대둔근, 내측광근 (Anterior/Posterior tibialis, Gluteus medius/maximus, Vastus medialis)',
  },
  {
    id: 'lcs' as const,
    name: 'Lower Crossed Syndrome (하부 교차 증후군)',
    keys: ['lat_lphc_ant', 'lat_knee_hyperext'],
    overactive:
      '장요근, TFL, 대퇴직근, 요부 척추기립근, 광배근 (Iliopsoas, TFL, Rectus femoris, Erector spinae, Latissimus)',
    underactive:
      '대둔근, 햄스트링, 복횡근, 내복사근 (Gluteus maximus, Hamstrings, TvA, Internal oblique)',
  },
  {
    id: 'ucs' as const,
    name: 'Upper Crossed Syndrome (상부 교차 증후군)',
    keys: ['lat_head_fwd', 'lat_sh_kyph', 'lat_sh_round', 'ant_sh_prot'],
    overactive:
      '상부승모근, 견갑거근, 흉쇄유돌근, 사각근, 대·소흉근, 광배근 (Upper trapezius, Levator scapulae, SCM, Scalenes, Pectorals, Latissimus)',
    underactive:
      '심부경부굴곡근, 전거근, 능형근, 중·하부승모근, 회전근개 (Deep cervical flexors, Serratus anterior, Rhomboids, Middle/Lower trap, Rotator cuff)',
  },
];

// 움직임 평가 보상별 과활성/저활성 근육 — NASM CES (Clark & Lucett, Ch.6 표 기준)
export interface MovementCompensation {
  key: string;
  label: string;
  overactive: string; // 쉼표 구분 (이완·스트레칭 대상)
  underactive: string; // 쉼표 구분 (활성화·강화 대상)
}

export const MOVEMENT_COMPENSATIONS: MovementCompensation[] = [
  // ── 오버헤드 스쿼트 (OHSA) ──
  {
    key: 'oh_foot_turnout', label: 'OHSA 발 외회전',
    overactive: '가자미근, 외측 비복근, 대퇴이두(단두), TFL',
    underactive: '내측 비복근, 내측 햄스트링, 중둔근·대둔근, 박근, 슬와근, 봉공근',
  },
  {
    key: 'oh_foot_flat', label: 'OHSA 발 편평(과회내)',
    overactive: '비골근, 외측 비복근, 대퇴이두(단두), TFL',
    underactive: '전경골근, 후경골근, 내측 비복근, 중둔근',
  },
  {
    key: 'oh_knee_valg', label: 'OHSA 무릎 내측 이동(외반)',
    overactive: '내전근군, 대퇴이두(단두), TFL, 외측 비복근, 외측광근',
    underactive: '내측 햄스트링, 내측 비복근, 중둔근·대둔근, 내측광근(VMO), 전경골근, 후경골근',
  },
  {
    key: 'oh_knee_var', label: 'OHSA 무릎 외측 이동(내반)',
    overactive: '이상근, 대퇴이두, TFL·소둔근',
    underactive: '내전근군, 내측 햄스트링, 대둔근',
  },
  {
    key: 'oh_torso_lean', label: 'OHSA 과도한 전방 기울임',
    overactive: '가자미근, 비복근, 고관절 굴곡근군, 복직근·외복사근',
    underactive: '전경골근, 대둔근, 척추기립근, 심부 코어 안정근',
  },
  {
    key: 'oh_low_back', label: 'OHSA 요추 과신전(아치)',
    overactive: '고관절 굴곡근군, 척추기립근, 광배근',
    underactive: '대둔근, 햄스트링, 심부 코어 안정근',
  },
  {
    key: 'oh_low_back_round', label: 'OHSA 요추 굴곡(라운딩)',
    overactive: '햄스트링, 대내전근, 복직근, 외복사근',
    underactive: '대둔근, 척추기립근, 심부 코어 안정근, 고관절 굴곡근군, 광배근',
  },
  {
    key: 'oh_pelvis_ant', label: 'OHSA 골반 전방 경사',
    overactive: '고관절 굴곡근군, 척추기립근',
    underactive: '대둔근, 햄스트링, 심부 코어 안정근',
  },
  {
    key: 'oh_pelvis_post', label: 'OHSA 골반 후방 경사',
    overactive: '햄스트링, 복직근',
    underactive: '고관절 굴곡근군, 척추기립근',
  },
  {
    key: 'oh_arms_fall', label: 'OHSA 팔 전방 낙하',
    overactive: '광배근, 대흉근·소흉근, 오훼완근, 대원근',
    underactive: '중·하부 승모근, 능형근, 후면 삼각근, 회전근개',
  },
  {
    key: 'oh_heel_rise', label: 'OHSA 뒤꿈치 들림',
    overactive: '가자미근',
    underactive: '전경골근',
  },
  {
    key: 'oh_asym_shift', label: 'OHSA 비대칭 체중 이동',
    overactive: '내전근군·TFL(이동 측), 비복근·가자미근, 이상근, 대퇴이두, 중둔근(반대 측)',
    underactive: '중둔근(이동 측), 전경골근, 내전근군(반대 측)',
  },
  // ── 싱글레그 스쿼트 (SLS) ──
  {
    key: 'sl_knee_valg', label: 'SLS 무릎 내측 이동(외반)',
    overactive: '내전근군, 대퇴이두(단두), TFL, 외측 비복근, 외측광근',
    underactive: '내측 햄스트링, 내측 비복근, 중둔근·대둔근, 내측광근(VMO)',
  },
  {
    key: 'sl_hip_hike', label: 'SLS 골반 상승(Hip Hike)',
    overactive: '요방형근(반대 측), TFL·소둔근(지지 측)',
    underactive: '내전근군(지지 측), 중둔근(지지 측)',
  },
  {
    key: 'sl_hip_drop', label: 'SLS 골반 하강(Hip Drop)',
    overactive: '내전근군(지지 측)',
    underactive: '중둔근(지지 측), 요방형근(지지 측)',
  },
  {
    key: 'sl_trunk_rot_in', label: 'SLS 몸통 내회전',
    overactive: '내복사근(지지 측), 외복사근(반대 측), TFL·내전근군(지지 측)',
    underactive: '내복사근(반대 측), 외복사근(지지 측), 중둔근·대둔근',
  },
  {
    key: 'sl_trunk_rot_out', label: 'SLS 몸통 외회전',
    overactive: '내복사근(반대 측), 외복사근(지지 측), 이상근(지지 측)',
    underactive: '내복사근(지지 측), 외복사근(반대 측), 내전근군(반대 측), 중둔근·대둔근',
  },
  {
    key: 'sl_torso_lat', label: 'SLS 상체 측방 기울임',
    overactive: '요방형근·광배근(기울인 측), TFL',
    underactive: '중둔근(지지 측), 심부 코어 안정근',
  },
  // ── 푸시 (Pushing Assessment) ──
  {
    key: 'pu_low_back', label: '푸시 요추 과전만 (처짐)',
    overactive: '고관절 굴곡근군, 척추기립근',
    underactive: '대둔근, 햄스트링, 심부 코어 안정근',
  },
  {
    key: 'pu_sh_elev', label: '푸시 어깨 거상',
    overactive: '상부 승모근, 흉쇄유돌근, 견갑거근',
    underactive: '중·하부 승모근',
  },
  {
    key: 'pu_head_fwd', label: '푸시 머리 전방 이동',
    overactive: '상부 승모근, 흉쇄유돌근, 견갑거근',
    underactive: '심부 경추 굴곡근',
  },
  // ── 풀 (Pulling Assessment) ──
  {
    key: 'pl_low_back', label: '풀 요추 과전만',
    overactive: '고관절 굴곡근군, 척추기립근',
    underactive: '대둔근, 햄스트링, 심부 코어 안정근',
  },
  {
    key: 'pl_sh_elev', label: '풀 어깨 거상',
    overactive: '상부 승모근, 흉쇄유돌근, 견갑거근',
    underactive: '중·하부 승모근',
  },
  {
    key: 'pl_head_fwd', label: '풀 머리 전방 이동',
    overactive: '상부 승모근, 흉쇄유돌근, 견갑거근',
    underactive: '심부 경추 굴곡근',
  },
];

// FMS 7 tests
export const FMS_TESTS = [
  {
    id: 'dsq',
    name: 'Deep Squat 깊은 스쿼트',
    description: '양발 어깨너비, 막대 양손으로 머리 위 수직. 발뒤꿈치 유지한 채 최대한 깊이 스쿼트.',
    criteria:
      '3점: 상체 수직, 대퇴 수평 이하, 발뒤꿈치 접지, 막대 발 위 정렬 / 2점: 뒤꿈치 2.5cm 합판 위에서 가능 / 1점: 합판 위에서도 기준 미달 / 0점: 통증',
    bilateral: false,
  },
  {
    id: 'hs',
    name: 'Hurdle Step 허들 스텝',
    description: '경골 높이 허들, 막대 어깨 위. 한 발로 허들을 넘어 바닥 터치 후 복귀. 좌우.',
    criteria:
      '3점: 엉덩이·무릎·발목 정렬, 요추 중립 / 2점: 정렬·균형 중 하나에 보상 / 1점: 발이 허들에 닿거나 균형상실 / 0점: 통증',
    bilateral: true,
  },
  {
    id: 'lu',
    name: 'In-line Lunge 일직선 런지',
    description:
      '경골 길이 보드 위 앞뒤로 일직선 발. 막대 등 뒤 3점 접촉(머리·흉추·천골). 뒷무릎이 앞발 뒤꿈치에 닿도록.',
    criteria: '3점: 몸통 수직·막대 접촉·균형 / 2점: 보상 동반 / 1점: 균형상실·이탈 / 0점: 통증',
    bilateral: true,
  },
  {
    id: 'sm',
    name: 'Shoulder Mobility 어깨 가동성',
    description: '한 손 위(외회전+외전+신전), 다른 손 아래(내회전+내전+굴곡). 주먹 사이 거리 측정.',
    criteria: '3점: 손 1개 거리 이내 / 2점: 1.5개 이내 / 1점: 1.5개 초과 / 0점: 충돌 clearing 양성',
    bilateral: true,
  },
  {
    id: 'aslr',
    name: 'Active Straight Leg Raise 능동 하지직거상',
    description: '바로누워 다리 편 채 한쪽 다리 최대한 거상. 외복사뼈 위치 평가.',
    criteria:
      '3점: 외복사뼈 반대 대퇴 중간 이상 / 2점: 반대 슬개골-대퇴 중간 / 1점: 반대 슬개골 미만 / 0점: 통증',
    bilateral: true,
  },
  {
    id: 'tsp',
    name: 'Trunk Stability Push-up 몸통 안정성 푸시업',
    description: '엎드려 손 어깨 위(남: 이마/여: 턱). 몸통 동시 거상, 요추 처짐 없음.',
    criteria:
      '3점: 남-이마·여-턱 성공 / 2점: 남-턱·여-쇄골 성공 / 1점: 실패 / 0점: 신전 clearing 양성',
    bilateral: false,
  },
  {
    id: 'rs',
    name: 'Rotary Stability 회전 안정성',
    description: '네발기기에서 동측/교차 팔-다리 패턴. 팔꿈치-무릎 복부 접촉.',
    criteria: '3점: 동측 성공 / 2점: 교차만 성공 / 1점: 교차 실패 / 0점: 굴곡 clearing 양성',
    bilateral: true,
  },
];

export const FMS_BILATERAL_IDS = FMS_TESTS.filter((t) => t.bilateral).map((t) => t.id);
// Static posture checkpoint definitions — NASM CES Ch.5 (5 Kinetic Chain Checkpoints × 3 View)
export const POSTURE_SECTIONS = [
  {
    title: '전면 관찰 Anterior View',
    note: '기준선: 두 뒤꿈치 중앙 → 골반·몸통·두개골 정중선. 발은 곧고 평행, ASIS 수평, 어깨 수평, 머리 중립.',
    groups: [
      { head: '① 발·발목', items: [
        ['ant_foot_flat', '편평발 (아치 소실)'],
        ['ant_foot_ext', '발 외회전 (평행 아님)'],
        ['ant_foot_pron', '과회내'],
      ] },
      { head: '② 무릎', items: [
        ['ant_knee_varus', '내반 (O다리 · 외측 편위)'],
        ['ant_knee_valgus', '외반 (X다리 · 내측 편위)'],
      ] },
      { head: '③ LPHC', items: [
        ['ant_lphc_asis', 'ASIS 좌우 높이 차이'],
        ['ant_lphc_rot', '골반 회전'],
      ] },
      { head: '④ 어깨', items: [
        ['ant_sh_elev', '어깨 거상 · 좌우 높이 차이'],
        ['ant_sh_prot', '둥근 어깨 (전인)'],
      ] },
      { head: '⑤ 머리·경추', items: [
        ['ant_head_tilt', '머리 측방 기울임'],
        ['ant_head_rot', '머리 회전'],
      ] },
    ],
  },
  {
    title: '측면 관찰 Lateral View',
    note: '기준선: 외측 복사뼈 약간 앞 → 대퇴 중앙 → 어깨 중앙 → 귀 중앙. 하퇴는 발바닥과 직각.',
    groups: [
      { head: '① 발·발목', items: [
        ['lat_foot_heel', '발뒤꿈치 들림'],
        ['lat_ankle_align', '하퇴 수직 정렬 깨짐 (발목 중립 이탈)'],
      ] },
      { head: '② 무릎', items: [
        ['lat_knee_hyperext', '과신전'],
        ['lat_knee_flex', '굴곡'],
      ] },
      { head: '③ LPHC', items: [
        ['lat_lphc_ant', '골반 전방경사 (요추 신전 증가)'],
        ['lat_lphc_post', '골반 후방경사 (요추 굴곡)'],
        ['lat_lphc_sway', 'Sway-back'],
      ] },
      { head: '④ 어깨·흉추', items: [
        ['lat_sh_kyph', '흉추 과후만 (과도한 굽은 등)'],
        ['lat_sh_round', '둥근어깨'],
      ] },
      { head: '⑤ 머리', items: [['lat_head_fwd', '머리 전방 돌출 (거북목)']] },
    ],
  },
  {
    title: '후면 관찰 Posterior View',
    note: '기준선: 두 뒤꿈치 중앙 → 골반·척추·두개골 정중선. 뒤꿈치 곧고 평행, PSIS 수평, 견갑 내측연 평행(간격 약 7~10cm).',
    groups: [
      { head: '① 발·발목', items: [['post_foot_pron', '뒤꿈치 외반 · 과회내 (calcaneal eversion)']] },
      { head: '② 무릎', items: [['post_knee_align', '무릎 내·외측 편위 (정렬 이탈)']] },
      { head: '③ LPHC', items: [
        ['post_lphc_psis', 'PSIS 좌우 높이 차이'],
        ['post_lphc_trend', 'Trendelenburg (골반 측방 하강)'],
      ] },
      { head: '척추', items: [['post_spine_scol', '측만 Scoliosis 의심']] },
      { head: '④ 어깨·견갑', items: [
        ['post_scap_wing', '익상견갑 Winging'],
        ['post_scap_elev', '견갑 거상'],
        ['post_scap_prot', '견갑 전인 (내측연 간격 >10cm)'],
      ] },
      { head: '⑤ 머리', items: [['post_head_tilt', '머리 기울임 · 회전']] },
    ],
  },
];

// key → 한글 라벨 (결과 페이지 표시용)
export const POSTURE_ITEM_LABELS: Record<string, string> = Object.fromEntries(
  POSTURE_SECTIONS.flatMap((s) => s.groups.flatMap((g) => g.items.map(([k, l]) => [k, l])))
);

