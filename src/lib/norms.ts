// Normative tables from ACSM 11th Ed., NSCA 4th Ed., NASM 7th Ed.
// All thresholds represented as ascending [vPoor, poor, average, good] upper-bounds
// => value > good → excellent / > average → good / > poor → average / > vPoor → below / else → poor

import type { Sex } from './types';

export type AgeGroup = 20 | 30 | 40 | 50 | 60;
export type NormTable = Record<Sex, Record<AgeGroup, [number, number, number, number]>>;

// VO2max (ml/kg/min) – ACSM Table 4.9 percentile midpoints
export const VO2MAX_NORMS: NormTable = {
  M: {
    20: [44, 48, 51, 55],
    30: [40, 44, 48, 52],
    40: [38, 42, 46, 50],
    50: [34, 38, 42, 47],
    60: [30, 34, 38, 43],
  },
  F: {
    20: [36, 41, 44, 49],
    30: [30, 34, 37, 40],
    40: [26, 30, 33, 36],
    50: [24, 28, 30, 34],
    60: [21, 25, 28, 32],
  },
};

// Bench Press 1RM / body weight ratio – NSCA
export const BP_RATIO_NORMS: NormTable = {
  M: {
    20: [0.89, 1.06, 1.18, 1.32],
    30: [0.78, 0.88, 0.98, 1.12],
    40: [0.72, 0.8, 0.88, 1.0],
    50: [0.62, 0.71, 0.8, 0.9],
    60: [0.54, 0.62, 0.72, 0.82],
  },
  F: {
    20: [0.53, 0.65, 0.7, 0.78],
    30: [0.49, 0.57, 0.61, 0.65],
    40: [0.43, 0.5, 0.54, 0.6],
    50: [0.4, 0.46, 0.5, 0.55],
    60: [0.37, 0.41, 0.45, 0.55],
  },
};

// Grip strength (left+right sum, kg) – ACSM
export const GRIP_NORMS: NormTable = {
  M: {
    20: [84, 95, 104, 115],
    30: [84, 95, 104, 115],
    40: [80, 88, 97, 108],
    50: [73, 84, 92, 101],
    60: [73, 83, 91, 100],
  },
  F: {
    20: [52, 58, 63, 70],
    30: [51, 58, 63, 71],
    40: [49, 54, 61, 69],
    50: [45, 49, 54, 61],
    60: [41, 45, 48, 54],
  },
};

// Push-up (reps) – ACSM (M: standard / F: modified)
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
    60: [0, 1, 4, 11],
  },
};

// YMCA Bench Press endurance (reps)
export const YMCA_BP_NORMS: NormTable = {
  M: {
    20: [11, 24, 31, 41],
    30: [6, 19, 27, 36],
    40: [2, 14, 23, 31],
    50: [0, 10, 18, 24],
    60: [0, 4, 12, 19],
  },
  F: {
    20: [5, 19, 26, 36],
    30: [4, 18, 25, 34],
    40: [1, 12, 20, 28],
    50: [0, 8, 14, 23],
    60: [0, 4, 12, 19],
  },
};

// Bodyweight Squat Endurance Test (reps to failure) – field test norms
// 대퇴 수평까지, 일정 템포, 자세 무너질 때까지 최대 반복
export const SQUAT_END_NORMS: NormTable = {
  M: {
    20: [24, 30, 38, 49],
    30: [21, 28, 34, 45],
    40: [19, 24, 29, 41],
    50: [14, 19, 25, 35],
    60: [9, 14, 20, 31],
  },
  F: {
    20: [17, 24, 32, 43],
    30: [12, 20, 28, 39],
    40: [6, 14, 22, 33],
    50: [4, 9, 17, 27],
    60: [2, 8, 12, 23],
  },
};

// Partial Curl-up (reps) – NSCA
export const CURLUP_NORMS: NormTable = {
  M: {
    20: [15, 31, 53, 75],
    30: [12, 26, 48, 70],
    40: [10, 21, 41, 60],
    50: [7, 16, 33, 50],
    60: [5, 11, 26, 40],
  },
  F: {
    20: [12, 26, 48, 70],
    30: [10, 21, 41, 60],
    40: [7, 16, 33, 50],
    50: [5, 11, 26, 40],
    60: [2, 6, 18, 30],
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

// Leg Press 1RM / body weight ratio – NSCA
export const LP_RATIO_NORMS: NormTable = {
  M: { 20:[1.65,2.04,2.40,2.77], 30:[1.45,1.78,2.10,2.45], 40:[1.27,1.57,1.85,2.18], 50:[1.10,1.38,1.63,1.93], 60:[0.94,1.21,1.44,1.72] },
  F: { 20:[1.23,1.54,1.81,2.13], 30:[1.08,1.35,1.59,1.87], 40:[0.94,1.18,1.40,1.66], 50:[0.82,1.03,1.23,1.47], 60:[0.70,0.89,1.08,1.30] },
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
