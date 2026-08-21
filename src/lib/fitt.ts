// ══════════════════════════════════════════════════════
// FITT-VP 운동 프로그램 자동 생성 — ACSM 운동처방 지침(11판) 프레임
// 평가 결과(심폐 등급·1RM·FMS·자세·혈압·평형)로 개인화한다.
// 회원 전달용 리포트에 표시 — 트레이너 검토·조정 하에 적용하는 권장안.
// ══════════════════════════════════════════════════════

export interface FittInput {
  age: number | null;
  sex: 'M' | 'F';
  goal?: string | null; // health | weight | strength | performance | rehab | 직접 입력
  experience?: string | null; // none | beginner | intermediate | advanced
  rhr?: number | null;
  sbp?: number | null;
  dbp?: number | null;
  vo2?: number | null; // 최고 추정 VO2max
  vo2Level?: string | null; // excellent | good | average | below | poor
  oneRm: { name: string; kg: number }[]; // 실측 1RM (있는 것만)
  fmsTested: boolean;
  fmsTotal?: number | null;
  fmsZeros?: number | null;
  postureCount?: number; // 자세 이상 소견 수
  balanceLowSec?: number | null; // 외발서기 좌/우 낮은 쪽 (초)
  breathRed?: boolean;
}

export interface FittDomain {
  domain: string;
  F: string; // 빈도 Frequency
  I: string; // 강도 Intensity
  T: string; // 시간 Time
  type: string; // 형태 Type
  V: string; // 양 Volume
  P: string; // 진행 Progression
}

export interface FittProgram {
  domains: FittDomain[];
  loads: string[]; // 1RM 기반 권장 훈련 중량
  cautions: string[]; // 안전 유의
  basis: string;
}

type Level = 'low' | 'mid' | 'high';

// 심폐 수준: VO2max 등급 우선, 없으면 운동경력으로 추정
function cardioLevel(i: FittInput): Level {
  if (i.vo2Level) {
    if (i.vo2Level === 'poor' || i.vo2Level === 'below') return 'low';
    if (i.vo2Level === 'average') return 'mid';
    return 'high';
  }
  if (i.experience === 'advanced') return 'high';
  if (i.experience === 'intermediate') return 'mid';
  return 'low';
}

// 저항운동 수준: 운동경력 기준 (1RM 등급이 있어도 기술 숙련이 우선)
function strengthLevel(i: FittInput): Level {
  if (i.experience === 'advanced') return 'high';
  if (i.experience === 'intermediate') return 'mid';
  return 'low';
}

// Karvonen 목표심박수: THR = (HRmax − HRrest) × % + HRrest
function thr(age: number, rhr: number, pLo: number, pHi: number): [number, number] {
  const hrMax = 220 - age;
  const lo = Math.round((hrMax - rhr) * pLo + rhr);
  const hi = Math.round((hrMax - rhr) * pHi + rhr);
  return [lo, hi];
}

// %HRmax 환산 (안정시 심박 없을 때): 중강도 64–76%, 고강도 77–95%
function hrMaxRange(age: number, pLo: number, pHi: number): [number, number] {
  const hrMax = 220 - age;
  return [Math.round(hrMax * pLo), Math.round(hrMax * pHi)];
}

const r25 = (x: number) => Math.round(x / 2.5) * 2.5; // 플레이트 단위 반올림

export function buildFittProgram(i: FittInput): FittProgram {
  const cl = cardioLevel(i);
  const sl = strengthLevel(i);
  const goal = i.goal && ['health', 'weight', 'strength', 'performance', 'rehab'].includes(i.goal) ? i.goal : 'health';
  const age = i.age ?? 30;

  // ── 유산소 강도 문구 (실제 심박수로 개인화) ──
  const modPct: [number, number] = cl === 'low' ? [0.3, 0.45] : [0.4, 0.59];
  const vigPct: [number, number] = [0.6, cl === 'high' ? 0.89 : 0.75];
  let modHr = '';
  let vigHr = '';
  if (i.rhr && i.rhr > 30 && i.rhr < 120) {
    const [ml, mh] = thr(age, i.rhr, modPct[0], modPct[1]);
    const [vl, vh] = thr(age, i.rhr, vigPct[0], vigPct[1]);
    modHr = ` (심박 ${ml}–${mh}bpm)`;
    vigHr = ` (심박 ${vl}–${vh}bpm)`;
  } else {
    const [ml, mh] = hrMaxRange(age, 0.64, 0.76);
    const [vl, vh] = hrMaxRange(age, 0.77, 0.95);
    modHr = ` (심박 약 ${ml}–${mh}bpm)`;
    vigHr = ` (심박 약 ${vl}–${vh}bpm)`;
  }

  const aerobic: FittDomain =
    cl === 'low'
      ? {
          domain: '유산소',
          F: '주 3–5회',
          I: `중강도 — 여유심박수 ${Math.round(modPct[0] * 100)}–${Math.round(modPct[1] * 100)}%${modHr} · RPE 11–13 (대화 가능한 속도)`,
          T: '1회 20–30분 — 주 90–150분에서 시작',
          type: '빠르게 걷기 · 고정 자전거 · 수영 등 대근육 지속 운동',
          V: '주 500 MET-min 목표(일 5,400보 이상)로 시작',
          P: '1–2주 간격으로 1회 시간 5–10분씩 늘리기 → 빈도 → 강도 순',
        }
      : cl === 'mid'
        ? {
            domain: '유산소',
            F: '주 3–5회',
            I: `중강도 40–59% HRR${modHr} · RPE 12–13, 주 1회 고강도 60–75%${vigHr} 혼합`,
            T: '1회 30–45분 — 주 150분 이상',
            type: '조깅 · 자전거 · 로잉 등 + 주 1회 인터벌',
            V: '주 500–1,000 MET-min (일 7,000보 이상)',
            P: '주당 총 운동량 10% 이내로 점진 증가',
          }
        : {
            domain: '유산소',
            F: '주 3–5회 (고강도는 주 3회까지)',
            I: `중강도 40–59%${modHr} + 고강도 60–89% HRR${vigHr} · RPE 14–17 혼합`,
            T: '고강도 20–30분 또는 중강도 45–60분',
            type: '러닝 · 인터벌(예: 4분 고강도 × 4회, 회복 3분) · 사이클',
            V: '주 1,000 MET-min 내외 (주 75분 고강도 또는 150–300분 중강도)',
            P: '인터벌 반복 수·속도 상향 중심, 고강도는 48시간 간격',
          };
  if (goal === 'weight') {
    aerobic.V = '체중 관리 목표 — 주 250–300분(≥2,000 MET-min)까지 확대 권장';
  }

  // ── 저항운동 ──
  const resistance: FittDomain =
    goal === 'rehab'
      ? {
          domain: '저항 (근력)',
          F: '주 2–3회 (부위당 48시간 간격)',
          I: '1RM의 40–60% · 세트당 12–15회 — 통증 없는 범위',
          T: '교정 동작 포함 30–40분, 세트 간 휴식 60–90초',
          type: '체중부하·밴드·머신 위주, 통증 유발 패턴 제외',
          V: '부위당 주 4–6세트',
          P: '통증 없이 15회 가능하면 5% 이내 증량 또는 난이도 상향',
        }
      : sl === 'low'
        ? {
            domain: '저항 (근력)',
            F: '주 2–3회 (같은 부위 48시간 간격)',
            I: '1RM의 60–70% · 세트당 8–12회 (RPE 12–13)',
            T: '8–10개 동작 × 2–3세트 · 세트 간 휴식 60–120초 (30–45분)',
            type: '다관절 우선 — 스쿼트 · 힙힌지 · 푸시 · 풀 + 보조 단관절',
            V: '부위당 주 4–8세트',
            P: '목표 횟수보다 2회 더 가능해지면 2–5% 증량 (2-for-2 규칙)',
          }
        : sl === 'mid'
          ? {
              domain: '저항 (근력)',
              F: '주 3회 (전신) 또는 주 4회 (상·하체 분할)',
              I: goal === 'strength' ? '1RM의 70–85% · 4–8회 (주 1회 60–70% 보조)' : '1RM의 65–80% · 6–12회',
              T: '6–9개 동작 × 3–4세트 · 고중량 세트 간 휴식 2–3분',
              type: '바벨 다관절 중심 + 목적 부위 보조 운동',
              V: '부위당 주 6–12세트',
              P: '주 단위 2–5% 증량 · 4주마다 1주 디로드(–30%)',
            }
          : {
              domain: '저항 (근력)',
              F: '주 3–4회 분할',
              I: goal === 'strength' || goal === 'performance' ? '1RM의 80–90% · 3–6회 (파워: 30–60% 빠른 수축)' : '1RM의 70–85% · 5–10회',
              T: '메인 리프트 3–5세트 + 보조 · 휴식 2–4분',
              type: '바벨 스쿼트 · 데드리프트 · 벤치 · 오버헤드 중심',
              V: '부위당 주 10–16세트 (블록별 조정)',
              P: '주기화 — 축적(고볼륨) → 강화(고강도) → 디로드 반복',
            };

  // ── 유연성·교정 ──
  const needCorrective =
    (i.fmsTested && ((i.fmsTotal ?? 21) <= 14 || (i.fmsZeros ?? 0) > 0)) || (i.postureCount ?? 0) >= 3;
  const flexibility: FittDomain = {
    domain: '유연성 · 교정',
    F: '주 2–3회 이상 (매일 가능)',
    I: '당기는 느낌·경미한 불편감 지점까지 (통증 금지)',
    T: '부위당 정적 15–30초 × 2–4회 (부위당 총 60초)',
    type: needCorrective
      ? 'NASM 교정 순서 — SMR(폼롤러) → 정적 스트레칭(단축근) → 활성화 → 통합 동작'
      : '운동 후 전신 주요 근군 정적 스트레칭 + 운동 전 동적 스트레칭',
    V: '회당 10분 내외 (체온 상승 상태에서)',
    P: '가동범위 확대에 맞춰 유지 시간·범위 점진 확대',
  };

  // ── 평형 (신경운동) — 평형 저하·고령·재활 시에만 ──
  const domains: FittDomain[] = [aerobic, resistance, flexibility];
  const balanceLow = i.balanceLowSec != null && i.balanceLowSec < (age >= 60 ? 20 : 30);
  if (balanceLow || age >= 65 || goal === 'rehab') {
    domains.push({
      domain: '평형 (신경운동)',
      F: '주 2–3회',
      I: '지지물을 잡을 수 있는 안전한 환경에서 — 흔들림이 느껴지는 난이도',
      T: '회당 10–15분',
      type: '외발서기 · 탠덤 스탠스 · 불안정면 스탠스 → 동적 밸런스',
      V: '자세당 30초 × 3–5회 (좌우 번갈아)',
      P: '눈 감기 → 불안정면 → 동작 결합 순으로 난이도 상향',
    });
  }

  // ── 1RM 기반 권장 훈련 중량 ──
  const pct: [number, number] =
    goal === 'rehab' ? [0.4, 0.6] : sl === 'low' ? [0.6, 0.7] : sl === 'mid' ? [0.65, 0.8] : [0.75, 0.85];
  const loads = i.oneRm
    .filter((r) => r.kg > 0)
    .map(
      (r) =>
        `${r.name} ${r25(r.kg * pct[0])}–${r25(r.kg * pct[1])}kg (1RM ${r.kg}kg의 ${Math.round(pct[0] * 100)}–${Math.round(pct[1] * 100)}%)`
    );

  // ── 안전 유의 ──
  const cautions: string[] = [];
  if (i.sbp != null && i.dbp != null) {
    if (i.sbp >= 180 || i.dbp >= 120) {
      cautions.push('혈압이 위기 수준입니다 — 운동 시작 전 의료 평가가 필요하며, 그 전까지 프로그램을 보류하세요.');
    } else if (i.sbp >= 140 || i.dbp >= 90) {
      cautions.push('고혈압 2기 — 숨 참기(발살바) 금지 · 고중량 저항운동 제한 · 매 운동 전 혈압 확인.');
    } else if (i.sbp >= 130 || i.dbp >= 80) {
      cautions.push('혈압 상승 단계 — 유산소 중심으로 시작하고 저항운동 시 호흡을 유지하세요.');
    }
  }
  if (i.rhr != null && i.rhr > 100) {
    cautions.push('안정시 심박이 높습니다(빈맥) — 컨디션 확인 후 운동하고, 지속되면 의료 상담을 받으세요.');
  }
  if (i.fmsTested && (i.fmsZeros ?? 0) > 0) {
    cautions.push('통증이 있는 움직임 패턴이 있습니다 — 해당 패턴 운동은 제외하고 전문가 평가 후 진행하세요.');
  } else if (i.fmsTested && (i.fmsTotal ?? 21) <= 14) {
    cautions.push('움직임 점수가 낮습니다 — 고중량 진입 전 교정운동을 4주가량 선행하세요.');
  }
  if (i.breathRed) {
    cautions.push('호흡 기능부전이 의심됩니다 — 고부하 운동 전 호흡 재훈련을 우선하세요.');
  }
  if (balanceLow) {
    cautions.push('평형성이 낮습니다 — 낙상 주의, 평형 운동은 반드시 지지물 근처에서 진행하세요.');
  }

  return {
    domains,
    loads,
    cautions,
    basis:
      'ACSM 운동처방 지침(11판) FITT-VP · NSCA 저항운동 기준 — 이번 평가 결과를 반영한 권장안입니다. 담당 트레이너의 조정 하에 적용하세요.',
  };
}
