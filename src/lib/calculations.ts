// Fitness assessment calculations
// Guidelines: ACSM 11th Ed, NSCA Essentials 4th Ed, NASM CPT 7th Ed, FMS 2.0

import {
  VO2MAX_NORMS,
  BP_RATIO_NORMS,
  SQ_RATIO_NORMS,
  DL_RATIO_NORMS,
  OHP_RATIO_NORMS,
  PC_RATIO_NORMS,
  LP_RATIO_NORMS,
  GRIP_NORMS,
  PUSHUP_NORMS,
  YMCA_BP_NORMS,
  CURLUP_NORMS,
  SQUAT_END_NORMS,
  PULLUP_NORMS,
  WHR_NORMS,
  POSTURE_SYNDROMES,
  type NormTable,
  type AgeGroup,
} from './norms';
import type { Sex, Classification, ClassifiedResult } from './types';

const LABEL: Record<Classification, string> = {
  excellent: '매우우수 Excellent',
  good: '우수 Good',
  average: '평균 Average',
  below: '낮음 Below Average',
  poor: '매우낮음 Poor',
};

export function ageGroup(age: number): AgeGroup {
  return Math.min(60, Math.max(20, Math.floor(age / 10) * 10)) as AgeGroup;
}

export function classifyAscending(
  value: number,
  table: NormTable,
  age: number,
  sex: Sex
): ClassifiedResult | null {
  if (!age || !sex) return null;
  const row = table[sex][ageGroup(age)];
  if (!row) return null;
  let c: Classification;
  if (value > row[3]) c = 'excellent';
  else if (value > row[2]) c = 'good';
  else if (value > row[1]) c = 'average';
  else if (value > row[0]) c = 'below';
  else c = 'poor';
  return { value, label: LABEL[c], classification: c };
}

// -------- Body composition --------

export function bmi(heightCm: number, weightKg: number): number {
  return weightKg / Math.pow(heightCm / 100, 2);
}

export function classifyBMI_AsiaPacific(v: number): ClassifiedResult {
  let c: Classification, label: string;
  if (v < 18.5) {
    c = 'below';
    label = '저체중 Underweight';
  } else if (v < 23) {
    c = 'excellent';
    label = '정상 Normal (아시아)';
  } else if (v < 25) {
    c = 'average';
    label = '과체중 Overweight (아시아)';
  } else if (v < 30) {
    c = 'below';
    label = '비만 1단계 Obesity I';
  } else {
    c = 'poor';
    label = '비만 2단계+ Obesity II+';
  }
  return { value: v, label, classification: c };
}

export function whr(waist: number, hip: number): number {
  return waist / hip;
}

export function classifyWHR(v: number, age: number, sex: Sex): ClassifiedResult | null {
  if (!age || !sex) return null;
  const row = WHR_NORMS[sex][ageGroup(age)];
  if (!row) return null;
  let c: Classification, label: string;
  if (v < row[0]) {
    c = 'excellent';
    label = '매우낮음 위험';
  } else if (v <= row[1]) {
    c = 'good';
    label = '낮음 위험';
  } else if (v <= row[2]) {
    c = 'average';
    label = '보통 위험';
  } else if (v <= row[3]) {
    c = 'below';
    label = '높음 위험';
  } else {
    c = 'poor';
    label = '매우높음 위험';
  }
  return { value: v, label, classification: c };
}

export function waistRisk(waist: number, sex: Sex): string {
  if (sex === 'M') {
    if (waist >= 102) return '매우높음';
    if (waist >= 90) return '증가';
    return '정상';
  } else {
    if (waist >= 88) return '매우높음';
    if (waist >= 80) return '증가';
    return '정상';
  }
}

export function classifyBodyFat(bf: number, sex: Sex): ClassifiedResult {
  let c: Classification, label: string;
  if (sex === 'M') {
    if (bf < 10) {
      c = 'below';
      label = '매우낮음 Essential';
    } else if (bf < 15) {
      c = 'excellent';
      label = '우수 Athletic';
    } else if (bf < 19) {
      c = 'good';
      label = '양호 Fitness';
    } else if (bf < 25) {
      c = 'average';
      label = '평균 Acceptable';
    } else {
      c = 'poor';
      label = '비만 Obese';
    }
  } else {
    if (bf < 14) {
      c = 'below';
      label = '매우낮음 Essential';
    } else if (bf < 21) {
      c = 'excellent';
      label = '우수 Athletic';
    } else if (bf < 25) {
      c = 'good';
      label = '양호 Fitness';
    } else if (bf < 32) {
      c = 'average';
      label = '평균 Acceptable';
    } else {
      c = 'poor';
      label = '비만 Obese';
    }
  }
  return { value: bf, label, classification: c };
}

// -------- Vitals --------

export function classifyBP(sbp: number, dbp: number): ClassifiedResult {
  let c: Classification, label: string;
  if (sbp < 120 && dbp < 80) {
    c = 'excellent';
    label = '정상 Normal';
  } else if (sbp < 130 && dbp < 80) {
    c = 'average';
    label = '상승 Elevated';
  } else if (sbp < 140 || dbp < 90) {
    c = 'below';
    label = '고혈압 1기 Stage 1 HTN';
  } else if (sbp < 180 || dbp < 120) {
    c = 'poor';
    label = '고혈압 2기 Stage 2 HTN';
  } else {
    c = 'poor';
    label = '고혈압 위기 Crisis';
  }
  return { value: sbp, label, classification: c };
}

export function classifyRHR(hr: number): ClassifiedResult {
  let c: Classification, label: string;
  if (hr < 60) {
    c = 'average';
    label = '서맥 Bradycardia';
  } else if (hr <= 70) {
    c = 'excellent';
    label = '우수 Athletic';
  } else if (hr <= 80) {
    c = 'good';
    label = '양호 Good';
  } else if (hr <= 100) {
    c = 'average';
    label = '정상 Normal';
  } else {
    c = 'poor';
    label = '빈맥 Tachycardia';
  }
  return { value: hr, label, classification: c };
}

// -------- Cardio VO2max formulas --------

export function rockportVO2max(
  timeMin: number,
  hr: number,
  weightKg: number,
  age: number,
  sex: Sex
): number {
  const lb = weightKg * 2.2046;
  const sexN = sex === 'M' ? 1 : 0;
  return 132.853 - 0.0769 * lb - 0.3877 * age + 6.315 * sexN - 3.2649 * timeMin - 0.1565 * hr;
}

export function run15MileVO2max(timeMin: number): number {
  return 483 / timeMin + 3.5;
}

export function cooperVO2max(distanceM: number): number {
  return (distanceM - 504.9) / 44.73;
}

export function classifyVO2max(v: number, age: number, sex: Sex): ClassifiedResult | null {
  return classifyAscending(v, VO2MAX_NORMS, age, sex);
}

// ---- 여러 심폐 검사 중 최고 기록으로 최종 분류 ----

export interface Vo2Estimate {
  key: 'rockport' | 'run15' | 'run5min' | 'cooper';
  label: string;
  vo2: number;
}

export function allVo2Estimates(i: {
  rockportTime?: number | null;
  rockportHr?: number | null;
  run15Time?: number | null;
  run5minDist?: number | null;
  cooperDist?: number | null;
  weightKg?: number | null;
  age?: number | null;
  sex?: Sex | null;
}): Vo2Estimate[] {
  const out: Vo2Estimate[] = [];
  if (i.rockportTime && i.rockportHr && i.weightKg && i.age && i.sex) {
    out.push({
      key: 'rockport',
      label: 'Rockport 1마일 걷기',
      vo2: rockportVO2max(i.rockportTime, i.rockportHr, i.weightKg, i.age, i.sex),
    });
  }
  if (i.run15Time) {
    out.push({ key: 'run15', label: '2.4km 달리기', vo2: run15MileVO2max(i.run15Time) });
  }
  if (i.run5minDist) {
    const t = riegel2400FromRun5min(i.run5minDist);
    if (t) out.push({ key: 'run5min', label: '5분 달리기 (Riegel)', vo2: vo2maxFrom2400(t) });
  }
  if (i.cooperDist) {
    out.push({ key: 'cooper', label: '쿠퍼 12분 달리기', vo2: cooperVO2max(i.cooperDist) });
  }
  return out;
}

// 최종 분류 기준: 입력된 모든 검사 추정치 중 최고 VO2max
export function bestVo2Estimate(
  i: Parameters<typeof allVo2Estimates>[0]
): Vo2Estimate | null {
  const all = allVo2Estimates(i);
  if (!all.length) return null;
  return all.reduce((b, e) => (e.vo2 > b.vo2 ? e : b));
}

// 5-Min Run Test → predicted 2.4km (1.5-mile) time via Riegel endurance model
//   T2 = T1 × (D2/D1)^1.06   (T1 = 5 min, D2 = 2400 m)
export function riegel2400FromRun5min(dist5minM: number): number | null {
  if (!dist5minM || dist5minM <= 0) return null;
  return 5 * Math.pow(2400 / dist5minM, 1.06);
}

// VO2max from a predicted/measured 2.4km time — reuses the 1.5-mile run formula
export function vo2maxFrom2400(timeMin: number): number {
  return run15MileVO2max(timeMin);
}

// Invert run15MileVO2max (VO2 = 483/t + 3.5) → 2.4km finish time (min) for a given VO2max
export function time2400FromVO2max(vo2: number): number | null {
  if (vo2 <= 3.5) return null;
  return 483 / (vo2 - 3.5);
}

// Average running speed (km/h) for the 2.4km test given finish time in minutes
export function speed2400(timeMin: number): number | null {
  if (!timeMin || timeMin <= 0) return null;
  return 2.4 / (timeMin / 60);
}

// Velocity at VO2max (km/h) — ACSM running eq. on level ground: VO2 = 0.2·S(m/min) + 3.5
export function vVO2max(vo2: number): number {
  return Math.max(0, (vo2 - 3.5) * 0.3);
}

// Format minutes (decimal) → "m분 s초"
export function fmtMinSec(timeMin: number): string {
  const total = Math.round(timeMin * 60);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}분 ${s.toString().padStart(2, '0')}초`;
}

// ---- Cardio norm comparison: VO2max norm table → 2.4km grade-level speed & time ----

export interface CardioGradeRow {
  classification: Classification;
  label: string;
  vo2: number; // lower-bound VO2max of this grade band
  timeMin: number; // predicted 2.4km finish time at that VO2
  speedKmh: number;
}

export interface CardioComparison {
  userVo2: number;
  userTimeMin: number;
  userSpeedKmh: number;
  userClass: Classification;
  avgVo2: number; // "동일 성별·나이 평균" = midpoint of the Average band
  avgTimeMin: number;
  avgSpeedKmh: number;
  grades: CardioGradeRow[]; // descending: excellent → poor
}

export function cardioComparison(
  userVo2: number,
  age: number,
  sex: Sex
): CardioComparison | null {
  if (!userVo2 || !age || !sex) return null;
  const row = VO2MAX_NORMS[sex][ageGroup(age)];
  if (!row) return null;
  // row = [vPoor, poor, average, good] ascending upper-bounds
  const bands: Array<{ classification: Classification; vo2: number }> = [
    { classification: 'excellent', vo2: row[3] },
    { classification: 'good', vo2: row[2] },
    { classification: 'average', vo2: row[1] },
    { classification: 'below', vo2: row[0] },
    { classification: 'poor', vo2: Math.round(row[0] * 0.85 * 10) / 10 },
  ];
  const grades: CardioGradeRow[] = bands.map((b) => {
    const t = time2400FromVO2max(b.vo2) ?? 0;
    return {
      classification: b.classification,
      label: LABEL[b.classification],
      vo2: b.vo2,
      timeMin: t,
      speedKmh: speed2400(t) ?? 0,
    };
  });
  const avgVo2 = (row[1] + row[2]) / 2; // midpoint of the Average band
  const avgTimeMin = time2400FromVO2max(avgVo2) ?? 0;
  const userClass = classifyVO2max(userVo2, age, sex)?.classification ?? 'average';
  const userTimeMin = time2400FromVO2max(userVo2) ?? 0;
  return {
    userVo2,
    userTimeMin,
    userSpeedKmh: speed2400(userTimeMin) ?? 0,
    userClass,
    avgVo2,
    avgTimeMin,
    avgSpeedKmh: speed2400(avgTimeMin) ?? 0,
    grades,
  };
}

// ---- Training prescription zones based on vVO2max (% of max velocity) ----

export interface TrainingZone {
  key: 'recovery' | 'fitness' | 'high';
  name: string;
  pctLabel: string;
  speedLowKmh: number;
  speedHighKmh: number | null; // null = open-ended
  paceLow: string; // min/km at the slow edge
  paceHigh: string | null;
  durationLabel: string;
  detail: string;
}

function paceMinKm(speedKmh: number): string {
  if (!speedKmh || speedKmh <= 0) return '-';
  const minPerKm = 60 / speedKmh;
  const m = Math.floor(minPerKm);
  const s = Math.round((minPerKm - m) * 60);
  return `${m}:${s.toString().padStart(2, '0')}/km`;
}

export function trainingZones(vvo2Kmh: number): TrainingZone[] {
  const z = (low: number, high: number | null) => ({
    speedLowKmh: Math.round(vvo2Kmh * low * 10) / 10,
    speedHighKmh: high == null ? null : Math.round(vvo2Kmh * high * 10) / 10,
  });
  const rec = z(0, 0.6);
  const fit = z(0.6, 0.8);
  const hi = z(0.8, null);
  return [
    {
      key: 'recovery',
      name: '회복 훈련 (Recovery)',
      pctLabel: '< 60% vVO₂max',
      speedLowKmh: rec.speedLowKmh,
      speedHighKmh: rec.speedHighKmh,
      paceLow: rec.speedHighKmh ? paceMinKm(rec.speedHighKmh) : '-',
      paceHigh: null,
      durationLabel: '30–40분 지속 (LISS)',
      detail: 'Zone 1–2 저강도 유산소 — 회복 촉진·기초 유산소 토대',
    },
    {
      key: 'fitness',
      name: '체력 강화 (Aerobic Build)',
      pctLabel: '61–80% vVO₂max',
      speedLowKmh: fit.speedLowKmh,
      speedHighKmh: fit.speedHighKmh,
      paceLow: paceMinKm(fit.speedLowKmh),
      paceHigh: fit.speedHighKmh ? paceMinKm(fit.speedHighKmh) : null,
      durationLabel: '25–40분 (템포·지속주)',
      detail: 'Zone 3 유산소 역치 — 심폐 효율·지구력 향상',
    },
    {
      key: 'high',
      name: '고강도 훈련 (HIIT)',
      pctLabel: '≥ 81% vVO₂max',
      speedLowKmh: hi.speedLowKmh,
      speedHighKmh: null,
      paceLow: paceMinKm(hi.speedLowKmh),
      paceHigh: null,
      durationLabel: '4분 운동 + 4분 회복 × 4세트 = 총 32분',
      detail:
        'Zone 4–5 — 목표 속도로 4분 달리기 → 느린 조깅·걷기로 4분 회복 (운동:휴식 = 1:1) · 주 1–2회. 시간이 없으면 2분 운동 + 2분 회복 × 6세트(총 24분)로 대체 가능',
    },
  ];
}

// YMCA Step Test – simplified norms approximation (ages 20-29)
export function classifyStepHR(hr: number, sex: Sex): ClassifiedResult {
  let c: Classification, label: string;
  const m = sex === 'M';
  if (hr < (m ? 79 : 85)) {
    c = 'excellent';
    label = '매우우수';
  } else if (hr < (m ? 90 : 99)) {
    c = 'good';
    label = '우수';
  } else if (hr < (m ? 106 : 118)) {
    c = 'average';
    label = '평균';
  } else if (hr < (m ? 129 : 140)) {
    c = 'below';
    label = '낮음';
  } else {
    c = 'poor';
    label = '매우낮음';
  }
  return { value: hr, label, classification: c };
}

// -------- Strength --------

export function estimate1RM_epley(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}
export function estimate1RM_brzycki(weight: number, reps: number): number | null {
  if (reps >= 37) return null;
  return (weight * 36) / (37 - reps);
}
export function estimate1RM_lombardi(weight: number, reps: number): number {
  return weight * Math.pow(reps, 0.1);
}
export function estimate1RM_avg(weight: number, reps: number): number {
  const e = estimate1RM_epley(weight, reps);
  const b = estimate1RM_brzycki(weight, reps) ?? e;
  const l = estimate1RM_lombardi(weight, reps);
  return (e + b + l) / 3;
}

export function classifyBPRatio(oneRM: number, bodyWeight: number, age: number, sex: Sex): ClassifiedResult | null {
  if (!bodyWeight) return null;
  return classifyAscending(oneRM / bodyWeight, BP_RATIO_NORMS, age, sex);
}
export function classifySQRatio(oneRM: number, bodyWeight: number, age: number, sex: Sex): ClassifiedResult | null {
  if (!bodyWeight) return null;
  return classifyAscending(oneRM / bodyWeight, SQ_RATIO_NORMS, age, sex);
}
export function classifyDLRatio(oneRM: number, bodyWeight: number, age: number, sex: Sex): ClassifiedResult | null {
  if (!bodyWeight) return null;
  return classifyAscending(oneRM / bodyWeight, DL_RATIO_NORMS, age, sex);
}
export function classifyOHPRatio(oneRM: number, bodyWeight: number, age: number, sex: Sex): ClassifiedResult | null {
  if (!bodyWeight) return null;
  return classifyAscending(oneRM / bodyWeight, OHP_RATIO_NORMS, age, sex);
}
export function classifyPCRatio(oneRM: number, bodyWeight: number, age: number, sex: Sex): ClassifiedResult | null {
  if (!bodyWeight) return null;
  return classifyAscending(oneRM / bodyWeight, PC_RATIO_NORMS, age, sex);
}
export function classifyLPRatio(oneRM: number, bodyWeight: number, age: number, sex: Sex): ClassifiedResult | null {
  if (!bodyWeight) return null;
  return classifyAscending(oneRM / bodyWeight, LP_RATIO_NORMS, age, sex);
}

export function classifyGrip(sumKg: number, age: number, sex: Sex): ClassifiedResult | null {
  return classifyAscending(sumKg, GRIP_NORMS, age, sex);
}

// -------- Endurance --------

export function classifyPushup(reps: number, age: number, sex: Sex) {
  return classifyAscending(reps, PUSHUP_NORMS, age, sex);
}
export function classifyYMCABP(reps: number, age: number, sex: Sex) {
  return classifyAscending(reps, YMCA_BP_NORMS, age, sex);
}
export function classifyCurlup(reps: number, age: number, sex: Sex) {
  return classifyAscending(reps, CURLUP_NORMS, age, sex);
}
export function classifySquatEndurance(reps: number, age: number, sex: Sex) {
  return classifyAscending(reps, SQUAT_END_NORMS, age, sex);
}
export function classifyPullup(reps: number, age: number, sex: Sex) {
  return classifyAscending(reps, PULLUP_NORMS, age, sex);
}

export interface PlankAnalysis {
  frontClass: ClassifiedResult;
  lrAsym?: number; // |R-L|/max
  sideFrontRatio?: number;
  sorensenRatio?: number;
  warnings: string[];
}

export function analyzePlank(
  front: number,
  r: number | undefined,
  l: number | undefined,
  sorensen: number | undefined,
  sex: Sex
): PlankAnalysis {
  const threshold = sex === 'M' ? 72 : 40;
  let c: Classification, label: string;
  if (front >= threshold * 1.5) {
    c = 'excellent';
    label = '매우우수';
  } else if (front >= threshold) {
    c = 'good';
    label = '양호 (McGill 기준)';
  } else if (front >= threshold * 0.7) {
    c = 'average';
    label = '평균';
  } else {
    c = 'below';
    label = '낮음';
  }
  const warnings: string[] = [];
  const frontClass: ClassifiedResult = { value: front, label, classification: c };
  let lrAsym: number | undefined;
  let sideFrontRatio: number | undefined;
  let sorensenRatio: number | undefined;
  if (r && l) {
    lrAsym = Math.abs(r - l) / Math.max(r, l);
    if (lrAsym > 0.05) warnings.push('측면 플랭크 좌우 5% 초과 비대칭 — 편측 약화');
    sideFrontRatio = Math.max(r, l) / front;
    if (sideFrontRatio > 0.75) warnings.push('측면/전방 비율 > 0.75 — 전방 신전근 상대 약화');
  }
  if (sorensen && front) {
    sorensenRatio = sorensen / front;
    if (sorensenRatio < 1.5) warnings.push('Sorensen/전방 < 1.5 — 요부 신전근 약화');
  }
  return { frontClass, lrAsym, sideFrontRatio, sorensenRatio, warnings };
}

// -------- 결과 기반 운동 가이드 (영역별 처방) --------

export interface DomainGuide {
  level: Classification;
  levelLabel: string;
  headline: string;
  lines: string[];
}

const CLASS_ORDER: Classification[] = ['poor', 'below', 'average', 'good', 'excellent'];

// 여러 검사 등급 중 가장 약한 등급 — 처방은 약한 고리 기준
export function worstClassification(list: Array<Classification | undefined | null>): Classification | null {
  const present = list.filter(Boolean) as Classification[];
  if (!present.length) return null;
  return present.reduce((w, c) => (CLASS_ORDER.indexOf(c) < CLASS_ORDER.indexOf(w) ? c : w));
}

export function strengthGuide(level: Classification): DomainGuide {
  const base = { level, levelLabel: LABEL[level] };
  if (level === 'poor' || level === 'below')
    return {
      ...base,
      headline: '근력 기초 다지기 (주 2–3회)',
      lines: [
        '전신 복합운동 위주 — 스쿼트·힌지(데드리프트)·밀기(벤치)·당기기(로우)',
        '강도 65–70% 1RM × 8–12회 × 3세트 · 세트 간 휴식 60–90초',
        '2주마다 중량 2.5–5% 점진 증가, 자세 우선',
        '4주 후 재평가로 변화 확인',
      ],
    };
  if (level === 'average')
    return {
      ...base,
      headline: '근력 발전 단계 (주 3–4회)',
      lines: [
        '상·하체 분할 프로그램 — 복합운동 후 보조운동 2–3개',
        '강도 70–80% 1RM × 6–10회 × 3–4세트 · 휴식 90–120초',
        '주차별 점진적 과부하 + 4주 단위 디로드 1주',
      ],
    };
  return {
    ...base,
    headline: '근력 유지·고급 (주기화)',
    lines: [
      '강도 75–90% 1RM × 3–6회 × 4–5세트 · 휴식 2–3분',
      '블록 주기화(근비대→최대근력) + 약점 부위 보조운동',
      '8–12주 주기 재평가로 정체 구간 점검',
    ],
  };
}

export function enduranceGuide(level: Classification): DomainGuide {
  const base = { level, levelLabel: LABEL[level] };
  if (level === 'poor' || level === 'below')
    return {
      ...base,
      headline: '근지구력 기초 (주 2–3회)',
      lines: [
        '자중 서킷 — 스쿼트·푸시업(무릎 가능)·플랭크·로우 순환',
        '12–15회(플랭크 20–30초) × 2–3라운드 · 라운드 간 휴식 60초',
        '동작 템포 일정하게, 실패 직전 2회 남기고 멈추기',
      ],
    };
  if (level === 'average')
    return {
      ...base,
      headline: '근지구력 강화 (주 3회)',
      lines: [
        '서킷 15–20회 × 3라운드 · 휴식 30–45초로 단축',
        '슈퍼세트(밀기+당기기) 도입, 코어는 플랭크 배터리 유지시간 +10%씩',
      ],
    };
  return {
    ...base,
    headline: '근지구력 유지·고급',
    lines: [
      '고반복 슈퍼세트·EMOM(매분 정해진 횟수) 변형으로 자극 유지',
      '약한 부위(밀기/당기기/하지/코어 중 최저 등급)에 볼륨 우선 배분',
    ],
  };
}

export function bodyCompGuide(level: Classification): DomainGuide {
  const base = { level, levelLabel: LABEL[level] };
  if (level === 'poor' || level === 'below')
    return {
      ...base,
      headline: '체중·체지방 관리 (식이 + 운동 병행)',
      lines: [
        '일일 에너지 −300~500 kcal (급격한 절식 금지)',
        '유산소 주 150분 이상 — 빠르게 걷기·자전거 등 중강도 분할 가능',
        '저항운동 주 2–3회 병행 (제지방 유지가 핵심)',
        '단백질 체중 1kg당 1.6g 목표 · 4주 후 체성분 재측정',
      ],
    };
  if (level === 'average')
    return {
      ...base,
      headline: '체성분 개선 (점진 감량·근육 증가)',
      lines: [
        '유산소 주 3–4회 30–40분 + 저항운동 주 3회',
        '가공식품·액상당 줄이기, 단백질 매끼 손바닥 크기',
      ],
    };
  return {
    ...base,
    headline: '체성분 유지',
    lines: [
      '현재 활동량·식사 패턴 유지 · 저항운동 주 2회 이상으로 근육량 보존',
      '8–12주 주기 재측정으로 추세만 확인',
    ],
  };
}

// -------- 호흡 평가 — FMS Breathing Screen (Kiesel et al. 2016, 민감도 0.89) --------

export type BreathLight = 'green' | 'yellow' | 'red';

export const BREATH_QUESTIONS = [
  '긴장감을 느낀다',
  '손이나 발이 차다',
  '하품을 자주 한다',
  '밤에 입으로 호흡한다',
];

// FRC 숨참기: Red ≤25초 / Yellow 26–35초 / Green >35초
export function breathFrcLight(sec: number): BreathLight {
  if (sec > 35) return 'green';
  if (sec >= 26) return 'yellow';
  return 'red';
}

// TLC 숨참기: Red ≤35초 / Yellow 36–60초 / Green >60초
export function breathTlcLight(sec: number): BreathLight {
  if (sec > 60) return 'green';
  if (sec >= 36) return 'yellow';
  return 'red';
}

// 설문 4문항(각 0–3): 최고 응답 기준 — 2–3점 Red / 1점 Yellow / 0점 Green
export function breathQLight(answers: number[]): BreathLight {
  const m = Math.max(...answers);
  if (m >= 2) return 'red';
  if (m === 1) return 'yellow';
  return 'green';
}

export interface BreathScreenResult {
  frc: BreathLight | null;
  tlc: BreathLight | null;
  q: BreathLight | null;
  hiLo?: 'diaph' | 'thoracic' | 'paradox';
  overall: BreathLight | null; // 가장 나쁜 등급
  label: string;
  message: string;
}

const LIGHT_ORDER: BreathLight[] = ['green', 'yellow', 'red'];

export function breathScreen(input: {
  frc?: number | null;
  tlc?: number | null;
  q?: number[] | null;
  hiLo?: 'diaph' | 'thoracic' | 'paradox' | null;
}): BreathScreenResult | null {
  const frc = input.frc != null ? breathFrcLight(input.frc) : null;
  const tlc = input.tlc != null ? breathTlcLight(input.tlc) : null;
  const q = input.q && input.q.length > 0 ? breathQLight(input.q) : null;
  const lights = [frc, tlc, q].filter(Boolean) as BreathLight[];
  if (!lights.length && !input.hiLo) return null;
  const overall = lights.length
    ? lights.reduce((w, l) => (LIGHT_ORDER.indexOf(l) > LIGHT_ORDER.indexOf(w) ? l : w))
    : null;
  const label =
    overall === 'green' ? 'Green — 호흡 기능 양호'
    : overall === 'yellow' ? 'Yellow — 일부 결손'
    : overall === 'red' ? 'Red — 호흡 기능부전 의심'
    : 'Hi-Lo 관찰만 기록됨';
  const message =
    overall === 'green'
      ? '호흡이 최적 수준 — 운동을 정상 진행합니다.'
      : overall === 'yellow'
      ? '주의하며 진행 — 운동에 호흡 재훈련을 병행하고 변화를 모니터링하세요.'
      : overall === 'red'
      ? '호흡 기능 우선 해결 — 고부하 저항운동을 보류하고 호흡 재훈련 후 재검하세요 (2–3주 무변화 시 의료 의뢰).'
      : '';
  return { frc, tlc, q, hiLo: input.hiLo ?? undefined, overall, label, message };
}

// -------- PAR-Q+ --------

export const PARQ_QUESTIONS = [
  "의사가 심장병이 있다고 말했거나 처방약을 복용 중이신가요?",
  "가슴통증·가슴조임·어지러움을 경험하신 적 있나요?",
  "지난 1개월간 신체활동 없이도 가슴통증을 경험하셨나요?",
  "현기증·의식소실로 쓰러진 적이 있으신가요?",
  "신체활동으로 악화될 수 있는 관절/뼈/근육 문제가 있으신가요?",
  "현재 혈압약 또는 심장약을 복용 중이신가요?",
  "기타 의학적으로 운동을 해서는 안 될 이유를 알고 계신가요?",
];

export function parqResult(answers: boolean[]): {
  passed: boolean;
  yesCount: number;
  message: string;
} {
  const yesCount = answers.filter(Boolean).length;
  if (yesCount === 0)
    return {
      passed: true,
      yesCount: 0,
      message: 'PAR-Q+ 통과 — 체력평가 및 운동프로그램 시작 가능',
    };
  return {
    passed: false,
    yesCount,
    message: `⚠ ${yesCount}개 항목 '예' — ACSM 권장: 운동 전 의료인 평가 / 감독 필요`,
  };
}

// -------- Posture syndrome detection --------

export interface SyndromeMatch {
  id: string;
  name: string;
  hits: number;
  overactive: string;
  underactive: string;
}

export function matchPostureSyndromes(flags: string[]): SyndromeMatch[] {
  return POSTURE_SYNDROMES.map((s) => ({
    id: s.id,
    name: s.name,
    hits: s.keys.filter((k) => flags.includes(k)).length,
    overactive: s.overactive,
    underactive: s.underactive,
  }))
    .filter((m) => m.hits > 0)
    .sort((a, b) => b.hits - a.hits);
}

// -------- FMS --------

export interface FmsResult {
  total: number;
  zeros: number;
  asymmetries: number;
  classification: Classification;
  message: string;
  perTest: Record<string, number>;
}

export function calcFMS(
  scores: Record<string, number>,
  clearing: { sh?: 'neg' | 'pos'; ext?: 'neg' | 'pos'; flex?: 'neg' | 'pos' }
): FmsResult {
  const perTest: Record<string, number> = {};
  let total = 0;
  let zeros = 0;
  let asymmetries = 0;

  // Clamp a raw score to the valid FMS range [0, 3]
  const clamp = (v: number | undefined | null): number | undefined =>
    v != null ? Math.max(0, Math.min(3, Math.round(v))) : undefined;

  // Bilateral tests always use _r / _l keys; non-bilateral use the direct key.
  const BILATERAL = new Set(['hs', 'lu', 'sm', 'aslr', 'rs']);

  const pair = (id: string): number | undefined => {
    if (BILATERAL.has(id)) {
      // Always prefer _r / _l for bilateral tests to avoid stale direct-key data
      const r = clamp(scores[`${id}_r`] as number | undefined);
      const l = clamp(scores[`${id}_l`] as number | undefined);
      if (r === undefined || l === undefined) return undefined;
      if (r !== l) asymmetries++;
      return Math.min(r, l);
    }
    // Non-bilateral: direct key only
    const v = clamp(scores[id] as number | undefined);
    return v;
  };

  ['dsq', 'hs', 'lu', 'sm', 'aslr', 'tsp', 'rs'].forEach((id) => {
    const s = pair(id);
    if (s !== undefined) {
      perTest[id] = s;
      total += s;
      if (s === 0) zeros++;
    }
  });

  // Clearing tests downgrade related sub-tests
  if (clearing.sh === 'pos' && perTest.sm !== undefined) {
    total -= perTest.sm;
    perTest.sm = 0;
    zeros++;
  }
  if (clearing.ext === 'pos' && perTest.tsp !== undefined) {
    total -= perTest.tsp;
    perTest.tsp = 0;
    zeros++;
  }
  if (clearing.flex === 'pos' && perTest.rs !== undefined) {
    total -= perTest.rs;
    perTest.rs = 0;
    zeros++;
  }

  let classification: Classification;
  let message: string;
  if (zeros > 0) {
    classification = 'poor';
    message = '⚠ 0점 검사 존재 — 통증 유발, 의료 평가 권장';
  } else if (total <= 14) {
    classification = 'poor';
    message = '⚠ 14점 이하 — 손상 위험 증가 (Kiesel et al. 2007)';
  } else if (asymmetries >= 3) {
    classification = 'below';
    message = '좌우 비대칭 ≥3개 — 비대칭 개선 우선';
  } else if (total >= 17) {
    classification = 'excellent';
    message = '우수 — 기본 움직임 패턴 양호';
  } else {
    classification = 'average';
    message = '평균 범위';
  }

  return { total, zeros, asymmetries, classification, message, perTest };
}

// -------- Recommendation engine --------

export interface Recommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  source: 'ACSM' | 'NSCA' | 'NASM' | 'FMS';
}

export function buildRecommendations(input: {
  fmsTotal?: number;
  fmsZeros?: number;
  fmsAsym?: number;
  postureFlags?: string[];
  vo2max?: number;
  bpRatio?: number;
  plankFront?: number;
  bmi?: number;
  sex?: Sex;
  goal?: string;
}): Recommendation[] {
  const recs: Recommendation[] = [];

  if (input.fmsZeros && input.fmsZeros > 0) {
    recs.push({
      priority: 'critical',
      title: '통증 유발 움직임 존재 (FMS 0점)',
      detail: '해당 동작 프로그램에서 즉시 제외, 의료/운동처방 전문가 평가 의뢰',
      source: 'FMS',
    });
  }
  if (input.fmsTotal !== undefined && input.fmsTotal <= 14) {
    recs.push({
      priority: 'high',
      title: '기본 움직임 패턴 회복 우선',
      detail:
        'FMS 총점 ≤14점은 손상 위험 증가. 저점 항목(0-1) 우선 교정 — SMR + 정적 스트레칭(단축근) + 활성화 + 통합 운동. 프로그램 초반 10-15분 배치.',
      source: 'FMS',
    });
  }
  if (input.fmsAsym && input.fmsAsym >= 3) {
    recs.push({
      priority: 'medium',
      title: '좌우 비대칭 개선',
      detail: '편측 운동(Single-leg, Unilateral dumbbell) 2-4주 선행하여 대칭성 회복',
      source: 'FMS',
    });
  }

  const posture = input.postureFlags || [];
  if (['lat_lphc_ant', 'lat_knee_hyperext'].some((k) => posture.includes(k))) {
    recs.push({
      priority: 'high',
      title: '하부 교차 증후군 교정 (LCS)',
      detail:
        '고관절 굴곡근·척추기립근 이완 (폼롤러/정적 스트레칭) → 대둔근·복근·햄스트링 활성화 (Glute bridge, Dead-bug, Plank)',
      source: 'NASM',
    });
  }
  if (['lat_head_fwd', 'lat_sh_kyph', 'lat_sh_round'].some((k) => posture.includes(k))) {
    recs.push({
      priority: 'high',
      title: '상부 교차 증후군 교정 (UCS)',
      detail:
        '흉근·광배근·상부승모근·SCM 이완 → 심부경부굴곡근·하부승모근·능형근 활성화 (Chin tuck, Wall slide, Band pull-apart)',
      source: 'NASM',
    });
  }

  if (input.vo2max !== undefined && input.vo2max < 35) {
    recs.push({
      priority: 'medium',
      title: '심폐지구력 강화',
      detail:
        'ACSM 권장 — 주당 중강도 150분 또는 고강도 75분. Zone 2 기반 기초 확보 후 HIIT 점진 도입',
      source: 'ACSM',
    });
  }

  if (input.bpRatio !== undefined && input.bpRatio < 0.8 && input.sex === 'M') {
    recs.push({
      priority: 'medium',
      title: '상체 근력 강화',
      detail: 'NSCA 초급 프로그램 — 주 2-3회, 65-75% 1RM × 8-12회 × 3세트, 복합관절 운동 중심',
      source: 'NSCA',
    });
  }

  if (input.plankFront !== undefined && input.plankFront < 30) {
    recs.push({
      priority: 'medium',
      title: '코어 안정성 선행 강화',
      detail: 'McGill Big-3 (Curl-up, Side plank, Bird-dog) 등척성 프로그램 4-6주',
      source: 'NSCA',
    });
  }

  if (input.bmi !== undefined && input.bmi >= 25 && input.goal === 'weight') {
    recs.push({
      priority: 'medium',
      title: '체중 관리 프로토콜',
      detail: '칼로리 결핍 500 kcal/일 + 근력운동 주 2-3회 + 유산소 주 5회 (ACSM 권장)',
      source: 'ACSM',
    });
  }

  return recs;
}
