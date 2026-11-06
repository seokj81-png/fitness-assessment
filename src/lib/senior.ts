// ══════════════════════════════════════════════════════
// 시니어 평가 — ① 시니어 체력(Senior Fitness Test) ② 근감소증 선별
//
// 출처 (원자료: 파프짐 위키 raw/research/2026-11-06_시니어체력_근감소증검사/01·02)
// - SFT 정상 범위(25~75 백분위): Jones & Rikli 2002 표 (원자료 Rikli & Jones 1999, J Aging Phys Act)
//   — 30초 의자 일어서기 표는 CDC STEADI(2017)와 같은 값. 인치·야드는 cm·m로 환산.
// - SFT 위험 구간: Rikli & Jones, Senior Fitness Test Manual 2001
// - SPPB 점수: Guralnik 1994, 미국 국립노화연구소(NIA) 점수지
// - 근감소증: 대한근감소증학회 KWGS 2023 (Baek 등, Ann Geriatr Med Res 2023;27:9–21)
//   = AWGS 2019 절단값(질병관리청 국가건강정보포털과 같음) + 한국 지침의 TUG ≥12초·기능적 근감소증
//   5회 의자는 12초 이상(AWGS 2019·질병관리청) — 학회 지침 원문의 >10초와 [출처 충돌]
//   참고: AWGS 2025 (Chen 등, Nature Aging 2025-11-04) — 근육량↓ + 근력↓ 동시, 50–64세 기준 신설
// ⚠ 트레이너용 선별·참고 결과이며 진단이 아니다. 진단은 의료기관에서.
// ══════════════════════════════════════════════════════

import type { Sex, Classification, ClassifiedResult } from './types';

export interface SeniorInput {
  // ── 시니어 체력 (SFT 7종) ──
  chair30?: number; // 30초 의자 일어서기 (회)
  armCurl?: number; // 30초 덤벨 팔 굽히기 (회) — 여 2.27kg(5lb) · 남 3.63kg(8lb)
  walk6?: number; // 6분 걷기 (m)
  step2?: number; // 2분 제자리 걷기 (회)
  sitReach?: number; // 의자 앉아 앞으로 굽히기 (cm, 발끝 넘으면 +)
  backScratch?: number; // 등 뒤 손 닿기 (cm, 겹치면 +)
  upGo?: number; // 2.44m(8피트) 일어나 걸어갔다 오기 (초)
  // ── 근감소증 선별 ──
  calf?: number; // 종아리 둘레 (cm, 서서 양쪽 중 큰 값)
  sarcF?: (number | null)[]; // SARC-F 5문항 각 0~2
  gaitDist?: number; // 보행 거리 4 또는 6 (m)
  gaitTime?: number; // 평소 걸음 보행 시간 (초)
  chair5?: number; // 5회 의자 일어서기 (초)
  chair5Fail?: boolean; // 5회 의자 일어서기 수행 못 함
  balSide?: number; // SPPB 균형 ① 두 발 나란히 (초, 최대 10)
  balSemi?: number; // ② 반일렬 (초)
  balTandem?: number; // ③ 일렬 (초)
  tug?: number; // TUG 3m 일어나 걷기 (초)
  asm?: number; // 사지 근육량 ASM (kg, 체성분 분석기)
  smi?: number; // 골격근지수 SMI = ASM/키² (kg/m², 결과지에 있으면 직접)
}

export function hasSenior(s?: SeniorInput | null): boolean {
  if (!s) return false;
  return Object.entries(s).some(([k, v]) =>
    k === 'sarcF' ? Array.isArray(v) && v.some((x) => x != null) : k === 'gaitDist' ? false : v != null && v !== false
  );
}

// ───────────────── SFT 정상 범위 ─────────────────
// 연령대 시작값 60·65·70·75·80·85·90 → [하한, 상한] (25~75 백분위)
// upGo(초)는 [느린 쪽, 빠른 쪽] — 낮을수록 좋음
export type SftKey = 'chair30' | 'armCurl' | 'walk6' | 'step2' | 'sitReach' | 'backScratch' | 'upGo';
export const SFT_AGES = [60, 65, 70, 75, 80, 85, 90] as const;
type Range = [number, number];
type SftTable = Record<Sex, Record<SftKey, Range[]>>;

const IN = 2.54;
const YD = 0.9144;
const inch = (rows: Range[]): Range[] => rows.map(([a, b]) => [Math.round(a * IN * 10) / 10, Math.round(b * IN * 10) / 10]);
const yard = (rows: Range[]): Range[] => rows.map(([a, b]) => [Math.round(a * YD), Math.round(b * YD)]);

export const SFT_NORMS: SftTable = {
  F: {
    chair30: [[12, 17], [11, 16], [10, 15], [10, 15], [9, 14], [8, 13], [4, 11]],
    armCurl: [[13, 19], [12, 18], [12, 17], [11, 17], [10, 16], [10, 15], [8, 13]],
    walk6: yard([[545, 660], [500, 635], [480, 615], [430, 585], [385, 540], [340, 510], [275, 440]]),
    step2: [[75, 107], [73, 107], [68, 101], [68, 100], [60, 91], [55, 85], [44, 72]],
    sitReach: inch([[-0.5, 5.0], [-0.5, 4.5], [-1.0, 4.0], [-1.5, 3.5], [-2.0, 3.0], [-2.5, 2.5], [-4.5, 1.0]]),
    backScratch: inch([[-3.0, 1.5], [-3.5, 1.5], [-4.0, 1.0], [-5.0, 0.5], [-5.5, 0.0], [-7.0, -1.0], [-8.0, -1.0]]),
    upGo: [[6.0, 4.4], [6.4, 4.8], [7.1, 4.9], [7.4, 5.2], [8.7, 5.7], [9.6, 6.2], [11.5, 7.3]],
  },
  M: {
    chair30: [[14, 19], [12, 18], [12, 17], [11, 17], [10, 15], [8, 14], [7, 12]],
    armCurl: [[16, 22], [15, 21], [14, 21], [13, 19], [13, 19], [11, 17], [10, 14]],
    walk6: yard([[610, 735], [560, 700], [545, 680], [470, 640], [445, 605], [380, 570], [305, 500]]),
    step2: [[87, 115], [86, 116], [80, 110], [73, 109], [71, 103], [59, 91], [52, 86]],
    sitReach: inch([[-2.5, 4.0], [-3.0, 3.0], [-3.5, 2.5], [-4.0, 2.0], [-5.5, 1.5], [-5.5, 0.5], [-6.5, -0.5]]),
    backScratch: inch([[-6.5, 0.0], [-7.5, -1.0], [-8.0, -1.0], [-9.0, -2.0], [-9.5, -2.0], [-10.0, -3.0], [-10.5, -4.0]]),
    upGo: [[5.6, 3.8], [5.7, 4.3], [6.0, 4.2], [7.2, 4.6], [7.6, 5.2], [8.9, 5.3], [10.0, 6.2]],
  },
};

// SFT 위험 구간 (2001 매뉴얼, 연령 공통) — 이 값 미만(upGo는 초과)이면 독립 이동 능력 상실 위험
// 유연성 2종은 원자료 요약(01 요약 3)과 표가 엇갈려 위험 구간을 쓰지 않는다 — 정상 범위 비교만
const SFT_RISK: Partial<Record<SftKey, { M: number; F: number; dir: 'below' | 'above' }>> = {
  chair30: { M: 8, F: 8, dir: 'below' },
  armCurl: { M: 11, F: 11, dir: 'below' },
  walk6: { M: 320, F: 320, dir: 'below' }, // 350야드
  step2: { M: 65, F: 65, dir: 'below' },
  upGo: { M: 9, F: 9, dir: 'above' },
};

export const SFT_ITEMS: { key: SftKey; label: string; unit: string; what: string; how: string; step?: string }[] = [
  { key: 'chair30', label: '30초 의자 일어서기', unit: '회', what: '하체 근력', how: '팔을 가슴에 X자로 모으고 30초 동안 완전히 일어섰다 앉은 횟수 (마지막에 절반 이상 일어나면 1회)' },
  { key: 'armCurl', label: '30초 덤벨 팔 굽히기', unit: '회', what: '상체 근력', how: '의자에 앉아 덤벨(여 2.3kg · 남 3.6kg)을 30초 동안 끝까지 굽혔다 편 횟수 (주로 쓰는 팔)' },
  { key: 'walk6', label: '6분 걷기', unit: 'm', what: '심폐 지구력', how: '45.7m(직사각형) 코스를 6분 동안 최대한 걸은 거리 — 공간이 없으면 2분 제자리 걷기로 대신' },
  { key: 'step2', label: '2분 제자리 걷기', unit: '회', what: '심폐 지구력', how: '무릎을 무릎뼈~골반뼈 중간 높이까지 올리며 2분 — 오른 무릎이 높이에 닿은 횟수' },
  { key: 'sitReach', label: '의자 앉아 앞으로 굽히기', unit: 'cm', what: '하체 유연성', how: '의자 앞쪽에 앉아 한 다리를 펴고 손끝을 발끝으로 — 못 닿으면 −, 넘으면 + (2회 중 좋은 값)', step: '0.5' },
  { key: 'backScratch', label: '등 뒤에서 손 닿기', unit: 'cm', what: '상체(어깨) 유연성', how: '한 손은 어깨 위로, 다른 손은 아래에서 등으로 — 가운데손가락 사이 거리, 못 닿으면 −, 겹치면 +', step: '0.5' },
  { key: 'upGo', label: '2.44m 일어나 걸어갔다 오기', unit: '초', what: '민첩성·동적 균형', how: '의자에서 일어나 2.44m(8피트) 앞 표시를 돌아와 앉기까지 — 빠르게 걷기, 2회 중 빠른 값', step: '0.1' },
];

export function sftAgeIndex(age: number): number {
  if (!age || age < 65) return 0;
  return Math.min(6, Math.floor((age - 60) / 5));
}
export function sftAgeLabel(age: number): string {
  const lo = SFT_AGES[sftAgeIndex(age)];
  return `${lo}–${lo + 4}세`;
}

export interface SftResult extends ClassifiedResult {
  key: SftKey;
  range: Range; // 표시용 [낮은 값, 높은 값] (upGo는 [빠른, 느린])
  risk: boolean;
}

export function classifySft(key: SftKey, value: number, age: number, sex: Sex): SftResult {
  const raw = SFT_NORMS[sex][key][sftAgeIndex(age)];
  const lowerBetter = key === 'upGo';
  const r = SFT_RISK[key];
  const risk = r ? (r.dir === 'below' ? value < r[sex] : value > r[sex]) : false;
  let c: Classification;
  let label: string;
  if (lowerBetter) {
    const [slow, fast] = raw;
    if (risk) { c = 'poor'; label = '주의 구간'; }
    else if (value > slow) { c = 'below'; label = '평균 이하'; }
    else if (value < fast) { c = 'good'; label = '평균 이상'; }
    else { c = 'average'; label = '평균'; }
  } else {
    const [lo, hi] = raw;
    if (risk) { c = 'poor'; label = '주의 구간'; }
    else if (value < lo) { c = 'below'; label = '평균 이하'; }
    else if (value > hi) { c = 'good'; label = '평균 이상'; }
    else { c = 'average'; label = '평균'; }
  }
  const range: Range = lowerBetter ? [raw[1], raw[0]] : raw;
  return { key, value, label, classification: c, range, risk };
}

export function sftRangeText(key: SftKey, age: number, sex: Sex): string {
  const raw = SFT_NORMS[sex][key][sftAgeIndex(age)];
  const [a, b] = key === 'upGo' ? [raw[1], raw[0]] : raw;
  const unit = SFT_ITEMS.find((i) => i.key === key)!.unit;
  const f = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  return `${f(a)}~${f(b)}${unit}`;
}

export function sftResults(s: SeniorInput | undefined | null, age: number, sex: Sex): SftResult[] {
  if (!s) return [];
  return SFT_ITEMS.filter((i) => s[i.key] != null).map((i) => classifySft(i.key, s[i.key] as number, age, sex));
}

// 낮은 항목 → 운동 방향 (ACSM 노인 신체활동 권고 요약: 유산소 중강도 주 150분, 저항 주 2회+, 유연성 주 2회+, 낙상 위험이면 균형 운동)
export const SFT_GUIDE: Record<SftKey, string> = {
  chair30: '하체 근력 — 의자 스쿼트·스텝업·레그프레스 등 하체 저항운동 주 2~3회',
  armCurl: '상체 근력 — 덤벨·밴드 당기기·밀기 등 상체 저항운동 주 2~3회',
  walk6: '심폐 지구력 — 중강도 걷기를 주 150분 목표로 (10분씩 나눠도 됨)',
  step2: '심폐 지구력 — 중강도 걷기를 주 150분 목표로 (10분씩 나눠도 됨)',
  sitReach: '하체 유연성 — 햄스트링·종아리 스트레칭 주 2회 이상, 30~60초 유지',
  backScratch: '어깨 유연성 — 어깨·가슴 스트레칭과 가동성 운동 주 2회 이상',
  upGo: '민첩성·균형 — 균형·방향 전환 운동 주 2~3회 (낙상 예방)',
};

// ───────────────── SPPB ─────────────────
export interface SppbResult {
  balance: number | null;
  gait: number | null;
  chair: number | null;
  total: number | null;
}
export function sppb(s: SeniorInput): SppbResult {
  let balance: number | null = null;
  // 순서: 나란히 → 반일렬 → 일렬. 앞 자세를 10초 못 버티면 거기서 끝(뒤는 0점).
  // 앞 자세를 통과했는데 다음 자세가 비어 있으면 아직 입력 중 → 점수 보류
  if (s.balSide != null) {
    if (s.balSide < 10) balance = 0;
    else if (s.balSemi == null) balance = null;
    else if (s.balSemi < 10) balance = 1;
    else if (s.balTandem == null) balance = null;
    else balance = 2 + (s.balTandem >= 10 ? 2 : s.balTandem >= 3 ? 1 : 0);
  }
  let gait: number | null = null;
  if (s.gaitTime != null && s.gaitTime > 0) {
    const t4 = (s.gaitTime * 4) / (s.gaitDist || 4); // 4m 환산 시간
    gait = t4 > 8.7 ? 1 : t4 > 6.2 ? 2 : t4 >= 4.82 ? 3 : 4;
  }
  let chair: number | null = null;
  if (s.chair5Fail) chair = 0;
  else if (s.chair5 != null && s.chair5 > 0) {
    const t = s.chair5;
    chair = t > 60 ? 0 : t >= 16.7 ? 1 : t >= 13.7 ? 2 : t >= 11.2 ? 3 : 4;
  }
  const total = balance != null && gait != null && chair != null ? balance + gait + chair : null;
  return { balance, gait, chair, total };
}

export function gaitSpeed(s: SeniorInput): number | null {
  if (s.gaitTime == null || s.gaitTime <= 0) return null;
  return Math.round(((s.gaitDist || 4) / s.gaitTime) * 100) / 100;
}

// ───────────────── SARC-F ─────────────────
export const SARCF_QUESTIONS: { q: string; opts: [string, string, string] }[] = [
  { q: '근력 — 4.5kg(쌀 5kg 한 포대쯤) 물건을 들어 옮기기가 얼마나 어려우세요?', opts: ['전혀 어렵지 않다', '조금 어렵다', '매우 어렵다 / 못 한다'] },
  { q: '걷기 — 방 한쪽 끝에서 다른 쪽 끝까지 걷기가 얼마나 어려우세요?', opts: ['전혀 어렵지 않다', '조금 어렵다', '매우 어렵다 / 도움·보조기 필요 / 못 한다'] },
  { q: '일어나기 — 의자나 침대에서 일어나 옮겨 앉기가 얼마나 어려우세요?', opts: ['전혀 어렵지 않다', '조금 어렵다', '매우 어렵다 / 도움 없이 못 한다'] },
  { q: '계단 — 계단 10개를 쉬지 않고 오르기가 얼마나 어려우세요?', opts: ['전혀 어렵지 않다', '조금 어렵다', '매우 어렵다 / 못 한다'] },
  { q: '낙상 — 지난 1년 동안 몇 번 넘어지셨어요?', opts: ['없음', '1~3회', '4회 이상'] },
];
export function sarcFTotal(s: SeniorInput): number | null {
  const a = s.sarcF;
  if (!a || a.length < 5 || a.slice(0, 5).some((x) => x == null)) return null;
  return a.slice(0, 5).reduce<number>((t, x) => t + (x as number), 0);
}

// ───────────────── 근감소증 선별 ─────────────────
export type SarcoLevel =
  | 'none' // 입력 부족
  | 'normal' // 기준 해당 없음
  | 'risk' // 선별 양성 (위험 신호)
  | 'possible' // 근감소증 의심 (가능 근감소증)
  | 'functional' // 기능적 근감소증 (한국 지침: 근육량 정상 + 근력↓ + 수행↓)
  | 'weak' // 근력 또는 수행 저하 (근육량 정상)
  | 'lowMass' // 근육량만 낮음
  | 'sarcopenia' // 근감소증 기준 해당
  | 'severe'; // 중증 근감소증 기준 해당

export interface SarcoCheck {
  label: string;
  value: string;
  cut: string;
  low: boolean | null; // true=기준 미달(위험), false=통과, null=미측정
}

export interface SarcoResult {
  level: SarcoLevel;
  title: string;
  action: string;
  tone: 'ok' | 'watch' | 'warn' | 'alert' | 'none';
  basis: string; // 적용 기준
  screen: SarcoCheck[];
  strength: SarcoCheck[];
  performance: SarcoCheck[];
  mass: SarcoCheck[];
  flags: { screen: boolean | null; strength: boolean | null; performance: boolean | null; mass: boolean | null };
  awgs2025: string | null; // AWGS 2025 참고 판정 문구
  smi: number | null;
  gripMax: number | null;
  speed: number | null;
  sppb: SppbResult;
  sarcF: number | null;
  sarcCalF: number | null;
}

const f1 = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
const anyTrue = (xs: (boolean | null)[]): boolean | null =>
  xs.some((x) => x === true) ? true : xs.some((x) => x === false) ? false : null;

export function sarcopenia(
  s: SeniorInput | undefined | null,
  ctx: { sex: Sex; age: number; heightCm?: number | null; weightKg?: number | null; gripR?: number | null; gripL?: number | null }
): SarcoResult {
  const x = s ?? {};
  const male = ctx.sex === 'M';
  const mid = ctx.age >= 50 && ctx.age < 65; // AWGS 2025 50–64세 기준
  // 선별
  const calfCut = male ? 34 : 33;
  const calfLow = x.calf != null ? x.calf < calfCut : null;
  const sf = sarcFTotal(x);
  const sfLow = sf != null ? sf >= 4 : null;
  const scf = sf != null && x.calf != null ? sf + (calfLow ? 10 : 0) : null;
  const scfLow = scf != null ? scf >= 11 : null;
  const screen: SarcoCheck[] = [
    { label: '종아리 둘레', value: x.calf != null ? `${f1(x.calf)} cm` : '-', cut: `${male ? '남' : '여'} ${calfCut} cm 미만`, low: calfLow },
    { label: 'SARC-F 설문', value: sf != null ? `${sf}점` : '-', cut: '4점 이상', low: sfLow },
    { label: 'SARC-CalF', value: scf != null ? `${scf}점` : '-', cut: '11점 이상', low: scfLow },
  ];
  // 근력 — 악력 (좌우 중 최댓값)
  const grips = [ctx.gripR, ctx.gripL].filter((v): v is number => v != null && v > 0);
  const gripMax = grips.length ? Math.max(...grips) : null;
  const gripCut = male ? 28 : 18;
  const gripLow = gripMax != null ? gripMax < gripCut : null;
  const strength: SarcoCheck[] = [
    { label: '악력 (좌우 중 최댓값)', value: gripMax != null ? `${f1(gripMax)} kg` : '-', cut: `${male ? '남' : '여'} ${gripCut} kg 미만`, low: gripLow },
  ];
  // 신체 수행
  const speed = gaitSpeed(x);
  const speedLow = speed != null ? speed < 1.0 : null;
  // 5회 의자: 12초 이상(AWGS 2019·질병관리청 국가건강정보포털). [출처 충돌] 한국 학회 지침 원문은 >10초(서서 끝) — 공적 기관 값을 씀
  const chairLow = x.chair5Fail ? true : x.chair5 != null ? x.chair5 >= 12 : null;
  const sp = sppb(x);
  const sppbLow = sp.total != null ? sp.total <= 9 : null;
  const tugLow = x.tug != null ? x.tug >= 12 : null;
  const performance: SarcoCheck[] = [
    { label: `보행 속도 (${x.gaitDist || 4}m 평소 걸음)`, value: speed != null ? `${speed.toFixed(2)} m/s` : '-', cut: '1.0 m/s 미만', low: speedLow },
    { label: '5회 의자 일어서기', value: x.chair5Fail ? '수행 못 함' : x.chair5 != null ? `${f1(x.chair5)} 초` : '-', cut: '12초 이상', low: chairLow },
    { label: 'SPPB 총점', value: sp.total != null ? `${sp.total}/12점` : '-', cut: '9점 이하', low: sppbLow },
    { label: 'TUG (3m 일어나 걷기)', value: x.tug != null ? `${f1(x.tug)} 초` : '-', cut: '12초 이상', low: tugLow },
  ];
  // 근육량 — 체성분 분석기(BIA) ASM/키²
  const h = ctx.heightCm && ctx.heightCm > 0 ? ctx.heightCm / 100 : null;
  const smi = x.smi != null ? x.smi : x.asm != null && h ? Math.round((x.asm / (h * h)) * 100) / 100 : null;
  const smiCut = male ? 7.0 : 5.7;
  const massLow = smi != null ? smi < smiCut : null;
  const mass: SarcoCheck[] = [
    { label: '골격근지수 SMI (사지근육량 ÷ 키²)', value: smi != null ? `${smi.toFixed(2)} kg/m²` : '-', cut: `${male ? '남' : '여'} ${smiCut.toFixed(1)} 미만`, low: massLow },
  ];

  const scr = anyTrue([calfLow, sfLow, scfLow]);
  const str = gripLow;
  const perf = anyTrue([speedLow, chairLow, sppbLow, tugLow]);
  const ms = massLow;

  let level: SarcoLevel = 'none';
  if (ms === true && str === true && perf === true) level = 'severe';
  else if (ms === true && (str === true || perf === true)) level = 'sarcopenia';
  else if (ms === false && str === true && perf === true) level = 'functional';
  else if (str === true || perf === true) level = ms === false ? 'weak' : 'possible';
  else if (ms === true) level = 'lowMass';
  else if (scr === true) level = 'risk';
  else if ([scr, str, perf, ms].some((v) => v === false)) level = 'normal';

  // 표시 문구 — 복지부 비의료 건강관리서비스 가이드라인(2019·2022 개정): 체육시설은 질병 진단·의심 소견·발병 위험을
  // 말할 수 없음 → 질병명 대신 "학회 기준값보다 낮음 + 의료기관 상담 권유"로만 쓴다 (원자료 03 §6)
  const META: Record<SarcoLevel, { title: string; action: string; tone: SarcoResult['tone'] }> = {
    none: { title: '입력 대기', action: '종아리 둘레·SARC-F 설문을 먼저 보고, 악력과 5회 의자 일어서기를 재면 기준값과 비교한 결과가 나옵니다.', tone: 'none' },
    normal: { title: '측정한 항목 모두 기준값 이상', action: '측정한 항목이 모두 학회 기준값 이상입니다. 1년에 한 번 다시 확인합니다.', tone: 'ok' },
    risk: { title: '선별 항목이 기준값 밖', action: '종아리 둘레나 설문 점수가 기준값 밖입니다. 악력과 5회 의자 일어서기를 이어서 측정합니다. 근력운동과 충분한 단백질 섭취를 권합니다.', tone: 'watch' },
    possible: { title: '근력 또는 신체 수행이 기준값보다 낮음', action: '근력·근육량을 의료기관에서 확인해 보시길 권합니다. 운동은 근력·균형 향상 프로그램을 낮은 강도부터 시작합니다. 체성분 분석기로 근육량도 재면 비교가 더 정확해집니다.', tone: 'warn' },
    weak: { title: '근력 또는 신체 수행이 기준값보다 낮음 (근육량은 기준값 이상)', action: '근력·균형 향상 운동을 우선합니다. 다음 측정에서도 낮으면 의료기관 상담을 권합니다.', tone: 'watch' },
    functional: { title: '근력과 신체 수행이 모두 기준값보다 낮음 (근육량은 기준값 이상)', action: '의료기관 상담을 권합니다. 운동은 낮은 강도의 근력·균형 운동부터 시작합니다.', tone: 'warn' },
    lowMass: { title: '근육량이 기준값보다 낮음 (근력·신체 수행은 기준값 이상)', action: '근력운동과 단백질 섭취로 근육량을 늘리고 3~6개월 뒤 다시 잽니다.', tone: 'watch' },
    sarcopenia: { title: '근육량과 근력(또는 신체 수행)이 기준값보다 낮음', action: '의료기관 상담을 권합니다. 운동은 의료진과 상의한 뒤 낮은 강도부터 시작합니다.', tone: 'alert' },
    severe: { title: '근육량·근력·신체 수행이 모두 기준값보다 낮음', action: '운동을 시작하기 전에 의료기관 상담을 먼저 권합니다.', tone: 'alert' },
  };

  // AWGS 2025 참고 판정 — 근육량↓ + 근력↓ 동시 (신체 수행은 진단에서 제외)
  let awgs2025: string | null = null;
  if (ctx.age >= 50) {
    const g25 = male ? (mid ? 34 : 28) : mid ? 20 : 18;
    const s25 = male ? (mid ? 7.6 : 7.0) : 5.7;
    const bmi = ctx.weightKg && h ? ctx.weightKg / (h * h) : null;
    const asm = x.asm != null ? x.asm : smi != null && h ? smi * h * h : null;
    const asmBmi = asm != null && bmi ? asm / bmi : null;
    const b25 = male ? (mid ? 0.9 : 0.83) : mid ? 0.63 : 0.57;
    const gl = gripMax != null ? gripMax < g25 : null;
    const ml = smi != null || asmBmi != null ? (smi != null && smi < s25) || (asmBmi != null && asmBmi < b25) : null;
    const band = mid ? '50–64세 기준' : '65세 이상 기준';
    if (gl === true && ml === true) awgs2025 = `AWGS 2025(${band}) 기준값과 비교: 근육량·악력 모두 기준값 미만`;
    else if (gl === true) awgs2025 = `AWGS 2025(${band}) 기준값과 비교: 악력 ${g25} kg 미만${ml === null ? ' (근육량 미측정)' : ''}`;
    else if (ml === true) awgs2025 = `AWGS 2025(${band}) 기준값과 비교: 근육량만 기준값 미만 — 해마다 악력 재측정 권장`;
    else if (scr === true) awgs2025 = `AWGS 2025(${band}) 기준값과 비교: 선별 항목 기준값 밖 — 해마다 악력 재측정 권장`;
    else if (gl === false) awgs2025 = `AWGS 2025(${band}) 기준값과 비교: 악력 ${g25} kg 이상${ml === false ? ', 근육량 기준값 이상' : ''}`;
  }

  const basis =
    ctx.age >= 65
      ? '아시아 근감소증 기준 AWGS 2019 · 질병관리청 국가건강정보포털 · 대한근감소증학회 등 진료지침 2023'
      : ctx.age >= 50
      ? 'AWGS 2019 · 질병관리청 · 진료지침 2023 (65세 이상 대상 — 이 회원은 참고로만 비교)'
      : 'AWGS 2019 · 질병관리청 · 진료지침 2023 (50세 미만은 대상이 아니라 참고로만 비교)';

  return {
    level,
    ...META[level],
    basis,
    screen,
    strength,
    performance,
    mass,
    flags: { screen: scr, strength: str, performance: perf, mass: ms },
    awgs2025,
    smi,
    gripMax,
    speed,
    sppb: sp,
    sarcF: sf,
    sarcCalF: scf,
  };
}

export function parseSenior(raw: unknown): SeniorInput {
  if (!raw) return {};
  if (typeof raw === 'object') return raw as SeniorInput;
  try {
    const v = JSON.parse(String(raw));
    return v && typeof v === 'object' ? (v as SeniorInput) : {};
  } catch {
    return {};
  }
}
