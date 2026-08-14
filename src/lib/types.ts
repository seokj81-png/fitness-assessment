// Domain types for Fitness Assessment

export type Sex = 'M' | 'F';

export type Classification =
  | 'excellent'
  | 'good'
  | 'average'
  | 'below'
  | 'poor';

export interface ClassifiedResult {
  value: number;
  label: string;
  classification: Classification;
  note?: string;
}

export interface ClientInput {
  id?: string;
  name: string;
  sex: Sex;
  dob?: string;
  age?: number;
  height?: number; // cm
  weight?: number; // kg
  occupation?: string;
  smoking?: 'no' | 'ex' | 'yes';
  experience?: 'none' | 'beginner' | 'intermediate' | 'advanced';
  goal?: 'health' | 'weight' | 'strength' | 'performance' | 'rehab';
  medical?: string;
}

export interface AssessmentInput {
  clientId: string;
  date?: string;
  assessor?: string;

  parq?: boolean[];

  rhr?: number;
  sbp?: number;
  dbp?: number;

  height?: number; // cm (측정 시점, 없으면 회원 프로필 값 사용)
  weight?: number; // kg (측정 시점, 없으면 회원 프로필 값 사용)
  bmi?: number;
  waist?: number;
  hip?: number;
  biaBf?: number;
  biaSmm?: number;
  biaFm?: number;
  biaFfm?: number;
  biaBmr?: number;
  biaTbw?: number;

  rockportTime?: number;
  rockportHr?: number;
  run15Time?: number;
  run5minDist?: number; // 5-min run test distance (m) → Riegel 2.4km prediction
  cooperDist?: number;
  stepHr?: number;
  vo2max?: number;

  bp1rm?: number;
  sq1rm?: number;
  dl1rm?: number;
  ohp1rm?: number;
  pc1rm?: number;
  lp1rm?: number;
  gripR?: number;
  gripL?: number;
  est1rmW?: number;
  est1rmReps?: number;

  pushupReps?: number;
  ymcaBpReps?: number;
  curlupReps?: number;
  squatReps?: number; // 스쿼트 지구력 테스트 (하지 근지구력, 자세 무너질 때까지 반복)
  pullupReps?: number; // 풀업 테스트 (상체 당기기 근지구력, 반동 없이 최대 반복)
  plankFront?: number;
  plankR?: number;
  plankL?: number;
  sorensen?: number;

  postureFlags?: string[];
  postureMemo?: string; // 자세 질적 평가 메모
  postureDrawing?: string; // 체형 스케치 (PNG dataURL)
  posturePhotos?: string[]; // 자세 사진 (dataURL, 최대 4장)

  // 평형성 — 눈뜨고 외발서기 (초)
  balanceR?: number;
  balanceL?: number;

  // 호흡 평가 (FMS Breathing Screen)
  breathFrc?: number; // FRC 숨참기 (초)
  breathTlc?: number; // TLC 숨참기 (초)
  breathHiLo?: 'diaph' | 'thoracic' | 'paradox';
  breathQ?: number[]; // 4문항 0-3

  fms?: Record<string, number>;
  clearSh?: 'neg' | 'pos';
  clearExt?: 'neg' | 'pos';
  clearFlex?: 'neg' | 'pos';

  ohsaFlags?: string[];
  rom?: Record<string, number>;
  fmsComments?: Record<string, string>;
  notes?: string;
}

export interface FmsTest {
  id: string;
  name: string;
  description: string;
  criteria: string;
  bilateral: boolean;
}

export interface PostureSyndrome {
  id: 'pds' | 'lcs' | 'ucs';
  name: string;
  keys: string[];
  overactive: string;
  underactive: string;
}
