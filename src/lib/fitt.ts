// ══════════════════════════════════════════════════════
// FITT-VP 운동 프로그램 자동 생성 — ACSM 운동처방 지침(11판) 프레임
// 평가 결과(심폐 등급·1RM·FMS·자세·혈압·평형)로 개인화한다.
// 회원 전달용 리포트에 표시 — 트레이너 검토·조정 하에 적용하는 권장안.
// ══════════════════════════════════════════════════════

import {
  trainingZones,
  vVO2max,
  matchPostureSyndromes,
  analyzePlank,
  classifyBPRatio,
  classifySQRatio,
  classifyDLRatio,
  classifyOHPRatio,
  classifyLPRatio,
  classifyGrip,
  classifyPushup,
  classifyCurlup,
  classifySquatEndurance,
  classifyPullup,
} from './calculations';
import { MOVEMENT_COMPENSATIONS } from './norms';

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
  oneRm: { key?: 'bp' | 'sq' | 'dl' | 'ohp' | 'lp'; name: string; kg: number }[]; // 실측 1RM
  weightKg?: number | null; // 체중비 등급 산출용
  gripSumKg?: number | null; // 악력 좌+우
  // 근지구력 실측 — 있으면 세트 목표를 기록 기반으로 개별화
  pushupReps?: number | null;
  curlupReps?: number | null;
  squatEndReps?: number | null;
  pullupReps?: number | null;
  plankFront?: number | null;
  plankR?: number | null;
  plankL?: number | null;
  sorensen?: number | null;
  // 움직임·자세 상세 — 교정 대상 개별화
  fmsPerTest?: Record<string, number> | null;
  postureFlagKeys?: string[] | null;
  ohsaFlags?: string[] | null;
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
  if (i.age != null) {
    // 나이를 모르면 bpm을 지어내지 않는다 (%HRR·RPE 문구만 표기)
    if (i.rhr && i.rhr > 30 && i.rhr < 120) {
      const [ml, mh] = thr(age, i.rhr, modPct[0], modPct[1]);
      const [vl, vh] = thr(age, i.rhr, vigPct[0], vigPct[1]);
      modHr = ` (심박 ${ml}–${mh}bpm)`;
      vigHr = ` (심박 ${vl}–${vh}bpm)`;
    } else {
      // 안정시 심박 미측정 — 가정치(70bpm)로 같은 %HRR 밴드를 환산해 문구와 bpm이 늘 같은 강도를 가리키게
      const [ml, mh] = thr(age, 70, modPct[0], modPct[1]);
      const [vl, vh] = thr(age, 70, vigPct[0], vigPct[1]);
      modHr = ` (심박 약 ${ml}–${mh}bpm)`;
      vigHr = ` (심박 약 ${vl}–${vh}bpm)`;
    }
  }

  // ── 심폐 테스트 결과 기반 달리기 속도·페이스 (결과 페이지 훈련 존과 동일한 vVO2max 기준) ──
  let modPace = '';
  let vigPace = '';
  if (i.vo2 && i.vo2 > 10) {
    const zones = trainingZones(vVO2max(i.vo2));
    const rec = zones[0]; // < 60% vVO2max (회복)
    const fit = zones[1]; // 61–80% (체력 강화)
    const hi = zones[2]; // ≥ 81% (고강도)
    const p = (v: string | null) => (v ? v.replace('/km', '') : '');
    if (cl === 'low') {
      modPace = rec.speedHighKmh
        ? ` · 달리기 환산 ${rec.speedHighKmh.toFixed(1)}km/h 이하 (걷기~느린 조깅)`
        : '';
      vigPace = ` · 속도 ${fit.speedLowKmh.toFixed(1)}km/h 내외 (페이스 ${p(fit.paceLow)}/km)`;
    } else {
      modPace = fit.speedHighKmh
        ? ` · 속도 ${fit.speedLowKmh.toFixed(1)}–${fit.speedHighKmh.toFixed(1)}km/h (페이스 ${p(fit.paceLow)}–${p(fit.paceHigh)}/km)`
        : '';
      vigPace = ` · 속도 ${hi.speedLowKmh.toFixed(1)}km/h 이상 (페이스 ${p(hi.paceLow)}/km 이하)`;
    }
  }

  const aerobic: FittDomain =
    cl === 'low'
      ? {
          domain: '유산소',
          F: '주 3–5회',
          I: `경강도–중강도 — 여유심박수 ${Math.round(modPct[0] * 100)}–${Math.round(modPct[1] * 100)}%${modHr}${modPace} · RPE 11–13 (대화 가능한 속도)`,
          T: '1회 20–30분 — 주 90–150분에서 시작',
          type: '빠르게 걷기 · 고정 자전거 · 수영 등 대근육 지속 운동',
          V: '주 500 MET-min 목표(일 5,400보 이상)로 시작',
          P: '1–2주 간격으로 1회 시간 5–10분씩 늘리기 → 빈도 → 강도 순',
        }
      : cl === 'mid'
        ? {
            domain: '유산소',
            F: '주 3–5회',
            I: `중강도 40–59% HRR${modHr}${modPace} · RPE 12–13, 주 1회 고강도 60–75%${vigHr}${vigPace} 혼합`,
            T: '1회 30–45분 — 주 150분 이상',
            type: '조깅 · 자전거 · 로잉 등 + 주 1회 인터벌',
            V: '주 500–1,000 MET-min (일 7,000보 이상)',
            P: '주당 총 운동량 10% 이내로 점진 증가',
          }
        : {
            domain: '유산소',
            F: '주 3–5회 (고강도는 주 3회까지)',
            I: `중강도 40–59%${modHr}${modPace} + 고강도 60–89% HRR${vigHr}${vigPace} · RPE 14–17 혼합`,
            T: '고강도 20–30분 또는 중강도 45–60분',
            type: '러닝 · 인터벌(예: 4분 고강도 × 4회, 회복 3분) · 사이클',
            V: '주 1,000 MET-min 내외 (주 75분 고강도 또는 150–300분 중강도)',
            P: '인터벌 반복 수·속도 상향 중심, 고강도는 48시간 간격',
          };
  // 고혈압 2기 이상 — 경고만 하지 않고 처방 강도 자체를 제한 (ACSM 고혈압 FITT)
  const htn2 = (i.sbp ?? 0) >= 140 || (i.dbp ?? 0) >= 90;
  if (htn2) {
    aerobic.I = `중강도 40–59% HRR${modHr}${modPace} · RPE 12–13 — 혈압 조절 확인 전 고강도 제외`;
    aerobic.P = '혈압 안정·의학적 확인 후 강도 상향';
  }
  if (goal === 'weight') {
    aerobic.V = '체중 관리 목표 — 중강도 주 250–300분(약 1,200–1,800 MET-min)까지 확대 권장';
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

  if (htn2 && goal !== 'rehab') {
    resistance.I = '1RM의 60–70% · 세트당 8–12회 — 호흡 유지(발살바 금지)';
  }

  // ── 근력 테스트 결과 개별화: 체중비 등급이 낮은 리프트를 우선 보강 ──
  const isWeak = (c: { classification: string } | null | undefined) =>
    !!c && (c.classification === 'below' || c.classification === 'poor');
  const weakLifts: string[] = [];
  if (i.weightKg && i.age != null) {
    const w = i.weightKg;
    for (const r of i.oneRm) {
      if (!(r.kg > 0)) continue;
      const c =
        r.key === 'bp'
          ? classifyBPRatio(r.kg, w, i.age, i.sex)
          : r.key === 'sq'
            ? classifySQRatio(r.kg, w, i.age, i.sex)
            : r.key === 'dl'
              ? classifyDLRatio(r.kg, w, i.age, i.sex)
              : r.key === 'ohp'
                ? classifyOHPRatio(r.kg, w, i.age, i.sex)
                : r.key === 'lp'
                  ? classifyLPRatio(r.kg, w, i.age, i.sex)
                  : null;
      if (isWeak(c)) weakLifts.push(`${r.name}(체중비 ${(r.kg / w).toFixed(2)})`);
    }
    if (i.gripSumKg != null && isWeak(classifyGrip(i.gripSumKg, i.age, i.sex))) {
      weakLifts.push(`악력(${i.gripSumKg}kg)`);
    }
  }
  if (weakLifts.length) {
    resistance.type = `우선 보강 — ${weakLifts.join(' · ')}\n${resistance.type}`;
    resistance.V = `${resistance.V} · 약한 리프트 부위는 주 +2–4세트`;
  }

  // ── 근지구력 — 실측 기록 기반 세트 목표 개별화 ──
  const endTargets: string[] = [];
  const weakEnd: string[] = [];
  const repTarget = (max: number) =>
    `${Math.max(1, Math.round(max * 0.5))}–${Math.max(2, Math.round(max * 0.7))}회`;
  if (i.pushupReps != null) {
    endTargets.push(
      i.pushupReps === 0
        ? '푸시업 — 인클라인·무릎 푸시업 5–8회부터'
        : `푸시업 세트당 ${repTarget(i.pushupReps)} (최대 ${i.pushupReps}회의 50–70%)`
    );
    if (i.age != null && isWeak(classifyPushup(i.pushupReps, i.age, i.sex))) weakEnd.push('상체 밀기(푸시업)');
  }
  if (i.pullupReps != null) {
    endTargets.push(
      i.pullupReps <= 1
        ? '풀업 — 밴드 보조·네거티브 3–5회부터'
        : `풀업 세트당 ${repTarget(i.pullupReps)} (최대 ${i.pullupReps}회의 50–70%)`
    );
    if (i.age != null && isWeak(classifyPullup(i.pullupReps, i.age, i.sex))) weakEnd.push('상체 당기기(풀업)');
  }
  if (i.curlupReps != null) {
    endTargets.push(`컬업 세트당 ${repTarget(i.curlupReps)} (최대 ${i.curlupReps}회의 50–70%)`);
    if (i.age != null && isWeak(classifyCurlup(i.curlupReps, i.age, i.sex))) weakEnd.push('몸통 굴곡(컬업)');
  }
  if (i.squatEndReps != null) {
    endTargets.push(`스쿼트 세트당 ${repTarget(i.squatEndReps)} (최대 ${i.squatEndReps}회의 50–70%)`);
    if (i.age != null && isWeak(classifySquatEndurance(i.squatEndReps, i.age, i.sex))) weakEnd.push('하체(스쿼트)');
  }
  const plankInfo =
    i.plankFront != null
      ? analyzePlank(i.plankFront, i.plankR ?? undefined, i.plankL ?? undefined, i.sorensen ?? undefined, i.sex)
      : null;
  if (i.plankFront != null) {
    endTargets.push(
      `플랭크 세트당 ${Math.max(10, Math.round(i.plankFront * 0.6))}–${Math.max(15, Math.round(i.plankFront * 0.7))}초 (최대 ${i.plankFront}초의 60–70%)`
    );
    if (isWeak(plankInfo?.frontClass)) weakEnd.push('코어 지구력(플랭크)');
  }
  const mcgillNeeded = !!(plankInfo && plankInfo.warnings.length > 0);
  const endMeasured = endTargets.length > 0;
  const muscularEndurance: FittDomain = endMeasured
    ? {
        domain: '근지구력',
        F: '주 2–3회 (저항운동과 같은 날 — 본 운동 마지막에)',
        I: endTargets.join('\n'),
        T: '10–15분 · 동작당 2–3세트 · 세트 간 휴식 30–60초',
        type:
          (weakEnd.length ? `우선 보강 — ${weakEnd.join(' · ')}\n` : '') +
          (mcgillNeeded
            ? 'McGill 빅3(컬업 · 사이드 브릿지 · 버드독) — 코어 좌우/전후 지구력 비율 교정'
            : '자체중량 서킷 — 푸시업 · 플랭크 · 스쿼트 · 로우'),
        V: '동작당 주 4–6세트',
        P: '2주마다 세트당 +2회(플랭크는 +10초) → 4주마다 최대 기록 재측정',
      }
    : {
        domain: '근지구력',
        F: '주 2–3회',
        I: '세트당 15–25회 반복 가능한 자체중량 강도 (RPE 12–14)',
        T: '10–15분 · 동작당 2–3세트 · 세트 간 휴식 30–60초',
        type: '자체중량 서킷 — 푸시업 · 플랭크 · 스쿼트 (다음 평가에서 기록 측정 → 개별 목표 제공)',
        V: '동작당 주 4–6세트',
        P: '2주마다 세트당 +2회',
      };

  // ── 유연성·교정 — 자세 증후군·OHSA 보상·FMS 저점을 실제 소견으로 개별화 ──
  const FMS_KR: Record<string, string> = {
    dsq: '딥스쿼트',
    hs: '허들스텝',
    lu: '인라인 런지',
    sm: '숄더 모빌리티',
    aslr: '액티브 SLR',
    tsp: '체간 푸시업',
    rs: '로터리 스태빌리티',
  };
  // 근육명 영문 병기 제거 — 회원 전달용 셀 공간 절약 (한글 괄호는 유지)
  const stripEn = (t: string) => t.replace(/\s*\([A-Za-z][A-Za-z ,.·\-/&;'’]*\)/g, '').trim();
  const correctiveNotes: string[] = [];
  const syndromes = i.postureFlagKeys?.length ? matchPostureSyndromes(i.postureFlagKeys) : [];
  for (const sd of syndromes.slice(0, 2)) {
    // 증후군 이름은 한글 괄호 안 표기 우선 (예: "Upper Crossed Syndrome (상부 교차 증후군)" → "상부 교차 증후군")
    const krName = sd.name.match(/\(([가-힣·\s]+)\)/)?.[1] ?? sd.name;
    correctiveNotes.push(`자세 · ${krName} — 이완: ${stripEn(sd.overactive)} / 강화: ${stripEn(sd.underactive)}`);
  }
  const comps = i.ohsaFlags?.length
    ? MOVEMENT_COMPENSATIONS.filter((c) => i.ohsaFlags!.includes(c.key)).slice(0, 2)
    : [];
  for (const c of comps) {
    correctiveNotes.push(`움직임 · ${c.label} — 이완: ${stripEn(c.overactive)} / 강화: ${stripEn(c.underactive)}`);
  }
  const fmsLow = i.fmsPerTest
    ? Object.entries(i.fmsPerTest)
        .filter(([, v]) => v <= 1)
        .map(([k]) => FMS_KR[k] ?? k)
    : [];
  if (fmsLow.length) correctiveNotes.push(`FMS 저점 패턴 재학습 — ${fmsLow.join(' · ')}`);
  if (!correctiveNotes.length && i.fmsTested && (i.fmsTotal ?? 21) <= 14) {
    correctiveNotes.push('FMS 총점 낮음 — 저점 항목(1점) 패턴 교정을 프로그램 앞에 배치');
  }
  const flexibility: FittDomain = correctiveNotes.length
    ? {
        domain: '유연성 · 교정',
        F: '주 3회 이상 — 매 세션 워밍업으로 배치',
        I: 'SMR 압통점 30초 유지 · 정적 스트레칭은 당기는 지점까지 (통증 금지)',
        T: 'NASM 4단계 — SMR 30초 → 정적 30초 → 활성화 12–15회 × 1–2세트 → 통합 10–15회',
        type: correctiveNotes.join('\n'),
        V: '회당 15–20분',
        P: '2–4주 후 자세 사진·OHSA 재평가로 개선 확인 → 다음 우선 부위로',
      }
    : {
        domain: '유연성 · 교정',
        F: '주 2–3회 이상 (매일 가능)',
        I: '당기는 느낌·경미한 불편감 지점까지 (통증 금지)',
        T: '부위당 정적 15–30초 × 2–4회 (부위당 총 60초)',
        type: '운동 후 전신 주요 근군 정적 스트레칭 + 운동 전 동적 스트레칭',
        V: '회당 10분 내외 (체온 상승 상태에서)',
        P: '가동범위 확대에 맞춰 유지 시간·범위 점진 확대',
      };

  // ── 평형 (신경운동) — 평형 저하·고령·재활 시에만 ──
  const domains: FittDomain[] = [aerobic, resistance, muscularEndurance, flexibility];
  const balanceLow = i.balanceLowSec != null && i.balanceLowSec < (i.age != null && i.age >= 60 ? 20 : 30);
  if (balanceLow || (i.age != null && i.age >= 65) || goal === 'rehab') {
    domains.push({
      domain: '평형 (신경운동)',
      F: '주 2–3회',
      I:
        i.balanceLowSec != null
          ? `현재 ${i.balanceLowSec}초(낮은 쪽) → 1차 목표 30초 — 지지물 옆 안전 확보`
          : '지지물을 잡을 수 있는 안전한 환경에서 — 흔들림이 느껴지는 난이도',
      T: '회당 10–15분',
      type: '외발서기 · 탠덤 스탠스 · 불안정면 스탠스 → 동적 밸런스',
      V: '자세당 30초 × 3–5회 (좌우 번갈아)',
      P: '눈 감기 → 불안정면 → 동작 결합 순으로 난이도 상향',
    });
  }

  // ── 1RM 기반 권장 훈련 중량 ──
  // 강도 행(I) 문구와 동일한 %를 사용 — 표와 중량 박스가 다른 숫자를 말하지 않게
  const pct: [number, number] = htn2
    ? [0.6, 0.7]
    : goal === 'rehab'
      ? [0.4, 0.6]
      : sl === 'low'
        ? [0.6, 0.7]
        : sl === 'mid'
          ? goal === 'strength'
            ? [0.7, 0.85]
            : [0.65, 0.8]
          : goal === 'strength' || goal === 'performance'
            ? [0.8, 0.9]
            : [0.7, 0.85];
  const loads = i.oneRm
    .filter((r) => r.kg > 0)
    .map(
      (r) =>
        `${r.name} ${r25(r.kg * pct[0])}–${r25(r.kg * pct[1])}kg (1RM ${r.kg}kg의 ${Math.round(pct[0] * 100)}–${Math.round(pct[1] * 100)}%)`
    );

  // ── 안전 유의 ──
  const cautions: string[] = [];
  {
    // 한쪽 값만 측정돼도 독립적으로 평가 (null은 임계값에 걸리지 않음)
    const sbp = i.sbp ?? 0;
    const dbp = i.dbp ?? 0;
    if (sbp >= 180 || dbp >= 110) {
      // ACSM 운동 보류 기준: SBP ≥180 또는 DBP ≥110
      cautions.push('혈압이 높습니다(SBP ≥180 또는 DBP ≥110) — 운동 시작 전 의료 평가가 필요하며, 혈압이 조절될 때까지 프로그램을 보류하세요.');
    } else if (sbp >= 140 || dbp >= 90) {
      cautions.push('고혈압 2기 — 숨 참기(발살바) 금지 · 고중량 저항운동 제한 · 매 운동 전 혈압 확인.');
    } else if (sbp >= 130 || dbp >= 80) {
      cautions.push('고혈압 1기 — 유산소 중심으로 시작하고 저항운동 시 호흡을 유지하며, 정기적으로 혈압을 확인하세요.');
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
      'ACSM 운동처방 지침(11판) FITT-VP · NSCA 저항운동 · NASM CES 교정 기준 — 이번 평가 결과를 반영한 권장안입니다. 담당 트레이너의 조정 하에 적용하세요.',
  };
}
