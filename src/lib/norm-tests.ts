// 연령별 등급표가 있는 검사 목록 — 결과 페이지 기준표(NormsTable)와 등급표 창(GradeTable)이 같이 쓴다.
import {
  VO2MAX_NORMS,
  GRIP_NORMS,
  BP_RATIO_NORMS,
  SQ_RATIO_NORMS,
  DL_RATIO_NORMS,
  OHP_RATIO_NORMS,
  PC_RATIO_NORMS,
  LP_RATIO_NORMS,
  PUSHUP_NORMS,
  YMCA_BP_NORMS,
  CURLUP_NORMS,
  SQUAT_END_NORMS,
  PULLUP_NORMS,
  BALANCE_NORMS,
  type NormTable,
  type AgeGroup,
} from './norms';

export type NormTestKey =
  | 'vo2max' | 'grip' | 'bp' | 'sq' | 'dl' | 'ohp' | 'pc' | 'lp'
  | 'pushup' | 'ymcaBp' | 'curlup' | 'squatEnd' | 'pullup' | 'balance';

export interface NormTest {
  key: NormTestKey;
  name: string;
  table: NormTable;
  unit: string;
  digits: number;
  source: string;
  /** 등급표 창 아래에 붙는 측정 방법 한 줄 */
  how?: string;
}

export const NORM_TESTS: NormTest[] = [
  { key: 'vo2max', name: 'VO₂max', table: VO2MAX_NORMS, unit: 'ml/kg/min', digits: 1, source: 'ACSM 11판', how: '심폐 검사 중 가장 좋은 기록으로 판정합니다.' },
  { key: 'grip', name: '악력 합산', table: GRIP_NORMS, unit: 'kg', digits: 0, source: 'ACSM 11판', how: '좌우 최고값을 더한 값(좌+우)으로 판정합니다.' },
  { key: 'bp', name: '벤치프레스', table: BP_RATIO_NORMS, unit: '체중비', digits: 2, source: '쿠퍼 연구소', how: '체중비 = 1RM ÷ 체중. 예: 1RM 60kg · 체중 75kg → 0.80' },
  { key: 'sq', name: '스쿼트', table: SQ_RATIO_NORMS, unit: '체중비', digits: 2, source: 'NSCA 4판', how: '체중비 = 1RM ÷ 체중' },
  { key: 'dl', name: '데드리프트', table: DL_RATIO_NORMS, unit: '체중비', digits: 2, source: 'NSCA 4판', how: '체중비 = 1RM ÷ 체중' },
  { key: 'ohp', name: '오버헤드프레스', table: OHP_RATIO_NORMS, unit: '체중비', digits: 2, source: 'NSCA 4판', how: '체중비 = 1RM ÷ 체중' },
  { key: 'pc', name: '파워클린', table: PC_RATIO_NORMS, unit: '체중비', digits: 2, source: 'NSCA 4판', how: '체중비 = 1RM ÷ 체중' },
  { key: 'lp', name: '레그프레스', table: LP_RATIO_NORMS, unit: '체중비', digits: 2, source: 'NSCA 4판', how: '체중비 = 1RM ÷ 체중' },
  { key: 'pushup', name: '푸시업', table: PUSHUP_NORMS, unit: '회', digits: 0, source: 'ACSM·NSCA', how: '남성은 정자세, 여성은 무릎 대고 하는 푸시업 기준입니다.' },
  { key: 'ymcaBp', name: 'YMCA 벤치', table: YMCA_BP_NORMS, unit: '회', digits: 0, source: 'NSCA 4판', how: '남 36.3kg · 여 15.9kg 바벨, 메트로놈 60 bpm(분당 30회)에 맞춰 반복한 횟수' },
  { key: 'curlup', name: '컬업', table: CURLUP_NORMS, unit: '회', digits: 0, source: 'NSCA 4판' },
  { key: 'squatEnd', name: '스쿼트 지구력', table: SQUAT_END_NORMS, unit: '회', digits: 0, source: '현장 검사 규준' },
  { key: 'pullup', name: '풀업', table: PULLUP_NORMS, unit: '회', digits: 0, source: '현장 검사 규준' },
  { key: 'balance', name: '외발서기 (눈뜨고)', table: BALANCE_NORMS, unit: '초', digits: 0, source: '국내 참고치', how: '좌우 중 약한 쪽 기록으로 판정합니다.' },
];

export const NORM_TEST_MAP = Object.fromEntries(NORM_TESTS.map((t) => [t.key, t])) as Record<NormTestKey, NormTest>;

export const AGE_GROUPS: AgeGroup[] = [20, 30, 40, 50, 60];

export const GRADE_NAMES = ['매우낮음', '낮음', '평균', '우수', '매우우수'] as const;

export function normAgeGroup(age: number): AgeGroup {
  return Math.min(60, Math.max(20, Math.floor(age / 10) * 10)) as AgeGroup;
}

// 값이 클수록 우수 기준: ≤a / ~b / ~c / ~d / >d → 등급 칸 인덱스 0~4 (calculations.classifyAscending과 같은 경계)
export function gradeIndex(v: number, [a, b, c, d]: readonly number[]): number {
  if (v <= a) return 0;
  if (v <= b) return 1;
  if (v <= c) return 2;
  if (v <= d) return 3;
  return 4;
}
