'use client';

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { printPage } from '@/lib/browser';
import { COLLAPSIBLE_CARDS, BASIC_BY_GOAL, GOAL_LABEL, goalKeyOf } from '@/lib/assess-presets';
import {
  bmi,
  fullAge,
  classifyBMI_AsiaPacific,
  whr,
  classifyWHR,
  waistRisk,
  classifyBodyFat,
  classifyBP,
  classifyRHR,
  rockportVO2max,
  run15MileVO2max,
  cooperVO2max,
  classifyVO2max,
  classifyStepHR,
  riegel2400FromRun5min,
  vo2maxFrom2400,
  allVo2Estimates,
  fmtMinSec,
  estimate1RM_avg,
  estimate1RM_epley,
  estimate1RM_brzycki,
  estimate1RM_lombardi,
  classifyBPRatio,
  classifySQRatio,
  classifyDLRatio,
  classifyOHPRatio,
  classifyPCRatio,
  classifyLPRatio,
  classifyGrip,
  classifyPushup,
  classifyYMCABP,
  classifyCurlup,
  classifySquatEndurance,
  classifyPullup,
  breathScreen,
  BREATH_QUESTIONS,
  analyzeBalance,
  ageGroup,
  analyzePlank,
  PARQ_QUESTIONS,
  parqResult,
  matchPostureSyndromes,
  calcFMS,
  buildRecommendations,
} from '@/lib/calculations';
import { FMS_TESTS, POSTURE_SYNDROMES, MOVEMENT_COMPENSATIONS, POSTURE_SECTIONS, BALANCE_NORMS } from '@/lib/norms';
import type { AssessmentInput, Sex } from '@/lib/types';
import ResultBox from '@/components/ui/ResultBox';
import { pillClass } from './classification';
import PostureSketch from './PostureSketch';
import TrendCharts from './TrendCharts';
import FitnessScoreCard from './FitnessScoreCard';
import NormsTable from './NormsTable';

interface ClientInfo {
  id: string;
  name: string;
  sex: string;
  dob?: string | Date | null;
  height?: number | null;
  weight?: number | null;
  goal?: string | null;
}

interface Props {
  client: ClientInfo;
  existing?: (AssessmentInput & { id?: string; date?: string | Date }) | null;
  pageTitle?: string;
  pageSubtitle?: string;
  backHref?: string;
  backLabel?: string;
}

type Tab =
  | 'toc'
  | 'client'
  | 'composition'
  | 'cardio'
  | 'strength'
  | 'endurance'
  | 'posture'
  | 'movement'
  | 'summary';

const TABS: { id: Tab; label: string }[] = [
  { id: 'toc', label: '목차' },
  { id: 'client', label: '① 기본/PAR-Q+' },
  { id: 'composition', label: '② 신체조성' },
  { id: 'posture', label: '③ 자세' },
  { id: 'movement', label: '④ 움직임' },
  { id: 'cardio', label: '⑤ 심폐지구력' },
  { id: 'strength', label: '⑥ 근력' },
  { id: 'endurance', label: '⑦ 근지구력' },
  { id: 'summary', label: '⑧ 종합' },
];

type FormState = Partial<AssessmentInput> & {
  date?: string;
  assessor?: string;
  age?: number;
  fmsComments?: Record<string, string>;
};

export default function AssessmentForm({ client, existing, pageTitle, pageSubtitle, backHref, backLabel }: Props) {
  const router = useRouter();
  const sex = client.sex as Sex;
  const age = useMemo(() => fullAge(client.dob) ?? 0, [client.dob]);
  const [tab, setTab] = useState<Tab>('toc');

  // 탭 전환 시 항상 최상단으로 — 이전 탭의 스크롤 위치(최하단)가 유지되는 문제 방지 (트레이너 피드백)
  const tabMounted = useRef(false);
  useEffect(() => {
    if (!tabMounted.current) { tabMounted.current = true; return; }
    window.scrollTo({ top: 0 });
  }, [tab]);

  // 미저장 입력이 있으면 새로고침·창 닫기 전에 확인 (30분 측정치 유실 방지)
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  // 모바일: 입력란 포커스 시 상단 고정 헤더·하단 바에 가려지지 않게 화면 중앙으로 (트레이너 피드백)
  useEffect(() => {
    const onFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      if (!el || !/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      const t = (el as HTMLInputElement).type;
      if (t === 'checkbox' || t === 'radio' || t === 'file') return;
      if (window.innerWidth >= 768) return;
      setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250);
    };
    document.addEventListener('focusin', onFocus);
    return () => document.removeEventListener('focusin', onFocus);
  }, []);

  // ── 기본/심화 접기 — 운동목적별 프리셋 (lib/assess-presets.ts에서 조정) ──
  const goalKey = goalKeyOf(client.goal);
  const [advOpen, setAdvOpen] = useState<Record<string, boolean>>(() =>
    // 기존 평가 수정 시엔 입력된 값이 숨겨지지 않게 전부 펼침
    existing ? { cardio: true, strength: true, endurance: true, posture: true, movement: true } : ({} as Record<string, boolean>)
  );
  const tierFor = useCallback(
    (tabId: string): TierProps => {
      const basics = BASIC_BY_GOAL[goalKey];
      const open = !!advOpen[tabId];
      return {
        vis: (id: string) => basics.includes(id) || open,
        open,
        hiddenNames: (COLLAPSIBLE_CARDS[tabId] ?? [])
          .filter((c) => !basics.includes(c.id))
          .map((c) => c.title),
        toggle: () => setAdvOpen((prev) => ({ ...prev, [tabId]: !prev[tabId] })),
      };
    },
    [goalKey, advOpen]
  );
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | undefined>(existing?.id);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [state, setState] = useState<FormState>(() => ({
    ...(existing || {}),
    // 측정 시점 신장·체중: 기존 평가값 > 회원 프로필값 순으로 초기화 (신체조성 탭에서 수정 가능)
    weight: existing?.weight ?? client.weight ?? undefined,
    height: existing?.height ?? client.height ?? undefined,
    date:
      (existing?.date &&
        new Date(existing.date as string).toISOString().slice(0, 10)) ||
      new Date().toISOString().slice(0, 10),
    parq: existing?.parq ?? new Array(7).fill(false),
    postureFlags: existing?.postureFlags ?? [],
    fms: existing?.fms ?? {},
    fmsComments: (existing as any)?.fmsComments ?? {},
    ohsaFlags: existing?.ohsaFlags ?? [],
    rom: existing?.rom ?? {},
  }));

  // 계산에 쓰는 신장·체중은 폼 입력값 우선(없으면 회원 프로필)
  const weight = state.weight ?? client.weight ?? 0;
  const height = state.height ?? client.height ?? 0;

  const update = <K extends keyof FormState>(
    key: K,
    value: FormState[K] | ((prev: FormState[K]) => FormState[K])
  ) => {
    setDirty(true);
    setState((s) => {
      const v =
        typeof value === 'function'
          ? (value as (prev: FormState[K]) => FormState[K])(s[key])
          : value;
      const next = { ...s, [key]: v };

      // BIA 파생값(체지방량·제지방량·TBW·BMR) — 체지방률 또는 체중·신장이 바뀔 때마다 재계산
      const w = (key === 'weight' ? (v as number | undefined) : next.weight) ?? client.weight ?? 0;
      const hgt = (key === 'height' ? (v as number | undefined) : next.height) ?? client.height ?? 0;
      const bf = next.biaBf;
      if ((key === 'biaBf' || key === 'weight' || key === 'height') && bf != null && w > 0) {
        const fm = Math.round(w * (bf / 100) * 10) / 10;
        next.biaFm = fm;
        next.biaFfm = Math.round((w - fm) * 10) / 10;
        // Watson formula for TBW
        const a = age || 30;
        const tbw = sex === 'F'
          ? -2.097 + 0.1069 * hgt + 0.2466 * w
          : 2.447 - 0.09156 * a + 0.1074 * hgt + 0.3362 * w;
        next.biaTbw = Math.round(tbw * 10) / 10;
        const bmrBase = 10 * w + 6.25 * hgt - 5 * a;
        next.biaBmr = Math.round(sex === 'F' ? bmrBase - 161 : bmrBase + 5);
      }

      return next;
    });
  };

  async function handleSave(exitAfter = false) {
    setSaving(true);
    // Strip non-schema fields (age, id, createdAt, updatedAt, client, etc.)
    const ALLOWED = new Set([
      'clientId','date','assessor','parq','rhr','sbp','dbp',
      'height','weight','bmi','waist','hip','sf1','sf2','sf3','bodyFatSf',
      'biaBf','biaSmm','biaFm','biaFfm','biaBmr','biaTbw',
      'rockportTime','rockportHr','run15Time','run5minDist','cooperDist','stepHr','vo2max',
      'bp1rm','sq1rm','dl1rm','ohp1rm','pc1rm','lp1rm','gripR','gripL','est1rmW','est1rmReps',
      'pushupReps','ymcaBpReps','curlupReps','squatReps','pullupReps','plankFront','plankR','plankL','sorensen',
      'postureFlags','postureMemo','postureDrawing','posturePhotos','balanceR','balanceL','breathFrc','breathTlc','breathHiLo','breathQ','fms','clearSh','clearExt','clearFlex','ohsaFlags','rom','fmsComments',
      'notes',
    ]);
    const payload: Record<string, unknown> = { clientId: client.id };
    for (const [k, v] of Object.entries(state)) {
      // undefined는 JSON에서 키째 탈락해 PATCH가 옛 값을 유지함 — 지운 값은 null로 명시
      if (ALLOWED.has(k)) payload[k] = v === undefined ? null : v;
    }
    payload.fmsComments = JSON.stringify(state.fmsComments ?? {});
    // Attach computed vo2max for quick display
    if (computed.vo2max) payload.vo2max = computed.vo2max.value;
    if (computed.bmiClass) payload.bmi = computed.bmiClass.value;

    // 첫 저장은 POST, 이후(savedId 있을 때)는 PATCH
    const currentId = savedId;
    const url = currentId ? `/api/assessments/${currentId}` : '/api/assessments';
    const method = currentId ? 'PATCH' : 'POST';
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const saved = await res.json();
        const id = saved.id || currentId;
        setSavedId(id);
        setDirty(false);
        if (exitAfter) {
          router.push(`/clients/${client.id}/assessment/${id}`);
          router.refresh();
          return; // 이동 중 saving 유지 (중복 클릭 방지)
        }
        setSavedAt(new Date());
        setTimeout(() => setSavedAt(null), 2500); // 토스트 자동 사라짐
        router.refresh(); // 목록 카운터 등 갱신
      } else {
        const errBody = await res.json().catch(() => ({}));
        alert(`저장 실패 (${res.status}): ${errBody?.error || res.statusText}`);
      }
    } catch {
      // 오프라인·타임아웃 등 — 입력은 그대로 남아 있으니 재시도 가능
      alert('저장 실패: 네트워크 연결을 확인한 뒤 다시 저장해 주세요.\n입력한 내용은 화면에 그대로 남아 있습니다.');
    } finally {
      setSaving(false);
    }
  }

  // ---------------- computed values ----------------
  const computed = useMemo(() => {
    const bmiClass =
      height && weight
        ? classifyBMI_AsiaPacific(bmi(height, weight))
        : null;
    const whrClass =
      state.waist && state.hip && age && sex
        ? classifyWHR(whr(state.waist, state.hip), age, sex)
        : null;
    const bodyFat = state.biaBf && sex ? classifyBodyFat(state.biaBf, sex) : null;

    const rhrClass = state.rhr ? classifyRHR(state.rhr) : null;
    const bpClass = state.sbp && state.dbp ? classifyBP(state.sbp, state.dbp) : null;

    // 입력된 모든 심폐 검사에서 VO2max를 추정하고, 최고 기록을 최종 분류로 사용
    const vo2Estimates = allVo2Estimates({
      rockportTime: state.rockportTime,
      rockportHr: state.rockportHr,
      run15Time: state.run15Time,
      run5minDist: state.run5minDist,
      cooperDist: state.cooperDist,
      weightKg: weight,
      age,
      sex,
    });
    const bestVo2 = vo2Estimates.length
      ? vo2Estimates.reduce((b, e) => (e.vo2 > b.vo2 ? e : b))
      : null;
    const vo2max = bestVo2 ? classifyVO2max(bestVo2.vo2, age, sex) : null;

    const stepClass = state.stepHr && sex ? classifyStepHR(state.stepHr, sex) : null;

    const bpRatio = state.bp1rm && weight ? classifyBPRatio(state.bp1rm, weight, age, sex) : null;
    const sqRatio = state.sq1rm && weight ? classifySQRatio(state.sq1rm, weight, age, sex) : null;
    const dlRatio = state.dl1rm && weight ? classifyDLRatio(state.dl1rm, weight, age, sex) : null;
    const ohpRatio = state.ohp1rm && weight ? classifyOHPRatio(state.ohp1rm, weight, age, sex) : null;
    const pcRatio = state.pc1rm && weight ? classifyPCRatio(state.pc1rm, weight, age, sex) : null;
    const lpRatio = state.lp1rm && weight ? classifyLPRatio(state.lp1rm, weight, age, sex) : null;
    const grip =
      state.gripR && state.gripL ? classifyGrip(state.gripR + state.gripL, age, sex) : null;
    const est1rm =
      state.est1rmW && state.est1rmReps
        ? estimate1RM_avg(state.est1rmW, state.est1rmReps)
        : null;

    const pushup = state.pushupReps != null ? classifyPushup(state.pushupReps, age, sex) : null;
    const ymcaBp = state.ymcaBpReps != null ? classifyYMCABP(state.ymcaBpReps, age, sex) : null;
    const curlup = state.curlupReps != null ? classifyCurlup(state.curlupReps, age, sex) : null;
    const squatEnd = state.squatReps != null ? classifySquatEndurance(state.squatReps, age, sex) : null;
    const pullup = state.pullupReps != null ? classifyPullup(state.pullupReps, age, sex) : null;
    const plank =
      state.plankFront
        ? analyzePlank(
            state.plankFront,
            state.plankR,
            state.plankL,
            state.sorensen,
            sex
          )
        : null;

    const balance = analyzeBalance(state.balanceR, state.balanceL, age, sex);
    const balanceRow = sex ? BALANCE_NORMS[sex][ageGroup(age || 30)] : null;

    const syndromes = matchPostureSyndromes(state.postureFlags || []);
    const fmsResult = calcFMS(state.fms || {}, {
      sh: state.clearSh,
      ext: state.clearExt,
      flex: state.clearFlex,
    });
    const parq = parqResult(state.parq || []);

    // FMS 미실시(입력 0건) 시 총점 0을 위험 신호로 오인하지 않도록 가드
    const fmsEntered = fmsResult.tested > 0;
    const recommendations = buildRecommendations({
      fmsTotal: fmsEntered ? fmsResult.total : undefined,
      fmsZeros: fmsEntered ? fmsResult.zeros : undefined,
      fmsAsym: fmsEntered ? fmsResult.asymmetries : undefined,
      postureFlags: state.postureFlags,
      vo2max: vo2max?.value,
      bpRatio: state.bp1rm && weight ? state.bp1rm / weight : undefined,
      plankFront: state.plankFront,
      bmi: bmiClass?.value,
      sex,
      goal: client.goal ?? undefined,
    });

    return {
      bmiClass,
      whrClass,
      bodyFat,
      rhrClass,
      bpClass,
      vo2max,
      vo2Estimates,
      bestVo2,
      stepClass,
      bpRatio, sqRatio, dlRatio, ohpRatio, pcRatio, lpRatio,
      grip,
      est1rm,
      pushup,
      ymcaBp,
      curlup,
      squatEnd,
      pullup,
      plank,
      balance,
      balanceRow,
      syndromes,
      fmsResult,
      fmsEntered,
      parq,
      recommendations,
    };
  }, [state, age, sex, weight, height, client.goal]);

  // ---------------- renders ----------------

  return (
    <>
    <div>
      {/* ── 상단 고정 헤더 (제목 + 탭) ── */}
      <div
        className="sticky top-[65px] md:top-[73px] z-30 mb-5 no-print rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid #e3e3e3',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}
      >
        {/* 제목 영역 */}
        {pageTitle && (
          <div className="px-4 md:px-5 pt-4 pb-3" style={{ borderBottom: '1px solid #ececec' }}>
            {backHref && (
              <a href={backHref} className="text-xs mb-1 inline-block underline underline-offset-2" style={{ color: '#666' }}>
                ← {backLabel}
              </a>
            )}
            <h2 className="text-xl font-bold leading-tight" style={{ color: '#111' }}>{pageTitle}</h2>
            {pageSubtitle && <p className="text-xs mt-0.5" style={{ color: '#8a8a8a' }}>{pageSubtitle}</p>}
          </div>
        )}
        {/* 탭 네비게이션 — 가로 스크롤, 터치 타겟 확대 */}
        <nav className="flex gap-1 overflow-x-auto p-2" style={{ WebkitOverflowScrolling: 'touch' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`whitespace-nowrap px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                tab === t.id ? 'text-white' : 'hover:bg-black/5'
              }`}
              style={tab === t.id ? { background: '#111' } : { color: '#777' }}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 미성년 회원 — 성인 규준 참고용 안내 */}
      {age > 0 && age < 20 && (
        <div
          className="mb-4 no-print text-sm px-4 py-3 rounded-xl"
          style={{ background: '#f7f7f7', border: '1.5px solid #8a8a8a', color: '#333' }}
        >
          ℹ️ <b>{age <= 12 ? '어린이' : '청소년'} 회원 ({age}세)</b> — 등급 분류는 성인(만 20세
          이상) 규준 기준이므로 참고용입니다. 절대 수치보다 이전 측정 대비 변화를 중심으로 해석하세요.
        </div>
      )}

      {tab === 'toc' && <TocTab goal={client.goal} goTab={setTab} />}
      {tab === 'client' && (
        <ClientTab state={state} update={update} parqResult={computed.parq} computed={computed} />
      )}
      {tab === 'composition' && (
        <CompositionTab state={state} update={update} computed={computed} height={height} weight={weight} />
      )}
      {tab === 'cardio' && (
        <CardioTab state={state} update={update} computed={computed} tier={tierFor('cardio')} />
      )}
      {tab === 'strength' && (
        <StrengthTab state={state} update={update} computed={computed} weight={weight} tier={tierFor('strength')} />
      )}
      {tab === 'endurance' && (
        <EnduranceTab state={state} update={update} computed={computed} tier={tierFor('endurance')} />
      )}
      {tab === 'posture' && (
        <PostureTab state={state} update={update} computed={computed} tier={tierFor('posture')} />
      )}
      {tab === 'movement' && (
        <MovementTab state={state} update={update} computed={computed} tier={tierFor('movement')} />
      )}
      {tab === 'summary' && (
        <SummaryTab client={client} age={age} state={state} computed={computed} update={update} />
      )}

      {/* ── 하단 여백 (sticky 바 높이만큼) ── */}
      <div className="h-20 no-print" />
    </div>

    {/* ── Sticky 액션 바 — 모든 탭에서 항상 하단 고정 ── */}
    <div
      className="no-print"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: 'rgba(255,255,255,0.96)',
        borderTop: '1px solid #e3e3e3',
        backdropFilter: 'blur(8px)',
        padding: '10px 16px calc(10px + env(safe-area-inset-bottom))',
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 flex-wrap">
        {/* 탭 이동 (플로어 한손 입력용) */}
        {(() => {
          const idx = TABS.findIndex((t) => t.id === tab);
          return (
            <div className="flex gap-1.5">
              <button
                onClick={() => { setTab(TABS[idx - 1].id); window.scrollTo({ top: 0 }); }}
                disabled={idx <= 0}
                className="btn-secondary text-sm px-3 py-2 disabled:opacity-35"
              >
                ←
              </button>
              <button
                onClick={() => { setTab(TABS[idx + 1].id); window.scrollTo({ top: 0 }); }}
                disabled={idx >= TABS.length - 1}
                className="btn-secondary text-sm px-3 py-2 disabled:opacity-35"
              >
                다음 →
              </button>
            </div>
          );
        })()}

        {/* 저장 완료 토스트 — 전 기기 플로팅 (모바일이 주 사용 기기) */}
        {savedAt && (
          <div
            className="fixed left-1/2 -translate-x-1/2 z-[60] no-print pointer-events-none"
            style={{ bottom: 'calc(88px + env(safe-area-inset-bottom))' }}
          >
            <div
              className="px-4 py-2 rounded-full text-sm font-semibold text-white shadow-lg"
              style={{ background: 'rgba(17,17,17,0.92)' }}
            >
              ✓ 저장됨 — {savedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
        )}

        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => {
              if (dirty && !confirm('저장하지 않은 입력이 있습니다. 정말 나가시겠어요?')) return;
              router.back();
            }}
            className="btn-secondary text-sm px-3 md:px-4 py-2 hidden sm:block"
          >
            취소
          </button>
          {/* 저장 — 현재 페이지 유지 */}
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="btn-secondary text-sm px-3.5 md:px-4 py-2"
          >
            {saving ? '저장 중...' : '💾 저장'}
          </button>
          {/* 저장 후 종료 — 결과 페이지로 이동 */}
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="btn-primary text-sm px-4 md:px-5 py-2"
          >
            {saving ? '저장 중...' : '저장 후 종료'}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

// ================= TABS =================

interface TabProps {
  state: FormState;
  update: <K extends keyof FormState>(
    key: K,
    value: FormState[K] | ((prev: FormState[K]) => FormState[K])
  ) => void;
  computed: ReturnType<typeof useComputed>;
}
type ComputedT = any; // local alias

function useComputed() {
  // placeholder for TabProps typing – actual computed lives in AssessmentForm
  return null as any;
}

function ClientTab({
  state,
  update,
  parqResult,
  computed,
}: {
  state: FormState;
  update: TabProps['update'];
  parqResult: { passed: boolean; yesCount: number; message: string };
  computed: any;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">기본정보 및 사전참여 선별</h2>

      <div className="card">
        <h3 className="font-bold mb-3">측정 정보</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="label">측정일 Date</label>
            <input
              type="date"
              value={state.date || ''}
              onChange={(e) => update('date', e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">측정자 Assessor</label>
            <input
              value={state.assessor || ''}
              onChange={(e) => update('assessor', e.target.value)}
              className="input"
            />
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-bold mb-3">
          PAR-Q+ 신체활동 준비 설문
          <span className="guideline-tag tag-acsm">ACSM</span>
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          하나라도 &lsquo;예&rsquo;이면 운동 전 의사 평가 권장 (ACSM preparticipation screening)
        </p>
        <div className="space-y-2">
          {PARQ_QUESTIONS.map((q, i) => (
            <div
              key={i}
              className="flex items-center justify-between border border-slate-700 rounded p-3 gap-3 flex-wrap"
            >
              <span className="text-sm flex-1">
                Q{i + 1}. {q}
              </span>
              <div className="flex gap-1">
                {[true, false].map((v) => {
                  const checked = state.parq?.[i] === v;
                  return (
                    <button
                      key={v ? 'y' : 'n'}
                      type="button"
                      onClick={() => {
                        const arr = [...(state.parq || new Array(7).fill(false))];
                        arr[i] = v;
                        update('parq', arr);
                      }}
                      className={`px-3 py-1 text-xs rounded border ${
                        checked
                          ? v
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-green-600 text-white border-green-600'
                          : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'
                      }`}
                    >
                      {v ? '예' : '아니오'}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div
          className={`mt-4 p-3 rounded border ${
            parqResult.passed
              ? 'bg-green-50 border-green-200 text-green-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="font-semibold">{parqResult.passed ? '✔ 운동 참여 안전' : '⚠ 주의 필요'}</div>
          <div className="text-sm">{parqResult.message}</div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-bold mb-3">
          안정시 생리지표 Resting Vitals
          <span className="guideline-tag tag-acsm">ACSM</span>
        </h3>
        <p className="text-xs text-slate-500 mb-3">최소 5분 좌위 안정 후 2회 측정 평균</p>
        <div className="grid md:grid-cols-3 gap-4 mb-3">
          <Num label="RHR (bpm)" value={state.rhr} onChange={(v) => update('rhr', v)} />
          <Num label="SBP (mmHg)" value={state.sbp} onChange={(v) => update('sbp', v)} />
          <Num label="DBP (mmHg)" value={state.dbp} onChange={(v) => update('dbp', v)} />
        </div>
        {(computed.rhrClass || computed.bpClass) && (
          <div className="grid md:grid-cols-2 gap-3 mt-2">
            {computed.rhrClass && (
              <ResultBox result={computed.rhrClass} unit="bpm">
                <div className="text-xs text-slate-500 mt-1">안정시 심박수</div>
              </ResultBox>
            )}
            {computed.bpClass && (
              <ResultBox result={computed.bpClass}>
                <div className="text-xs text-slate-500 mt-1">혈압 {state.sbp}/{state.dbp} mmHg</div>
              </ResultBox>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CompositionTab({
  state,
  update,
  computed,
  height,
  weight,
}: {
  state: FormState;
  update: TabProps['update'];
  computed: any;
  height: number;
  weight: number;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">신체조성 평가 (ACSM)</h2>

      <div className="card">
        <h3 className="font-bold mb-2">
          BMI 체질량지수 <span className="guideline-tag tag-acsm">ACSM</span>
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          측정 시점 신장·체중을 입력하면 BMI가 자동 계산됩니다. (회원 프로필 값이 기본 입력되며, 여기서 수정하면 이 평가에만 반영)
        </p>
        <div className="grid grid-cols-2 gap-3 mb-3 max-w-xs">
          <Num label="신장 (cm)" value={state.height} onChange={(v) => update('height', v)} step="0.1" />
          <Num label="체중 (kg)" value={state.weight} onChange={(v) => update('weight', v)} step="0.1" />
        </div>
        {computed.bmiClass ? (
          <ResultBox result={computed.bmiClass} unit="kg/m²" />
        ) : (
          <p className="text-sm text-slate-500">신장·체중을 모두 입력하면 BMI가 표시됩니다.</p>
        )}
        <p className="text-[11px] text-slate-500 mt-2">
          아시아-태평양 기준: 정상 18.5-22.9 · 과체중 23-24.9 · 비만 I 25-29.9 · 비만 II ≥30
        </p>
        <div className="mt-4 pt-3" style={{ borderTop: '1px solid #ececec' }}>
          <div className="text-sm font-bold mb-2">둘레 측정 — 허리·엉덩이 비율 (WHR)</div>
          <div className="grid grid-cols-2 gap-3 mb-3 max-w-xs">
            <Num label="허리둘레 (cm)" value={state.waist} onChange={(v) => update('waist', v)} step="0.5" />
            <Num label="엉덩이둘레 (cm)" value={state.hip} onChange={(v) => update('hip', v)} step="0.5" />
          </div>
          {computed.whrClass && <ResultBox result={computed.whrClass} unit="WHR" />}
        </div>
      </div>

      <div className="card">
        <h3 className="font-bold mb-2">
          BIA / InBody 직접입력 <span className="guideline-tag tag-acsm">ACSM</span>
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          측정 전 4시간 금식, 24시간 음주·격한운동 금지 권장
        </p>
        <div className="mb-4 max-w-xs">
          <Num label="체지방률 BF% (%)" value={state.biaBf} onChange={(v) => update('biaBf', v)} step="0.1" />
        </div>
        {state.biaBf != null && weight > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
            {[
              { label: '체지방량 FM', value: state.biaFm, unit: 'kg' },
              { label: '제지방량 FFM', value: state.biaFfm, unit: 'kg' },
              { label: '기초대사량 BMR', value: state.biaBmr, unit: 'kcal' },
              { label: '체수분량 TBW', value: state.biaTbw, unit: 'L' },
            ].map(({ label, value, unit }) => (
              <div key={label} className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-center">
                <div className="text-xs text-slate-500 mb-1">{label}</div>
                <div className="text-lg font-bold text-slate-800">
                  {value != null ? value.toFixed(1) : '—'}
                  <span className="text-xs font-normal text-slate-500 ml-1">{unit}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {state.biaBf != null && (
          <div className="mt-3">
            <ResultBox result={computed.bodyFat} unit="%" />
          </div>
        )}
      </div>

    </div>
  );
}

function MinSecInput({
  label,
  valueMin: decimalMin,
  onChange,
}: {
  label: string;
  valueMin: number | null | undefined;
  onChange: (decimalMin: number | undefined) => void;
}) {
  const min = decimalMin != null ? Math.floor(decimalMin) : '';
  const sec = decimalMin != null ? Math.round((decimalMin % 1) * 60) : '';

  const handle = (field: 'min' | 'sec', val: string) => {
    // 두 칸을 모두 비우면 기록 삭제 (0초 기록과 미실시를 구분)
    const otherEmpty = field === 'min' ? sec === '' : min === '';
    if (val === '' && otherEmpty) {
      onChange(undefined);
      return;
    }
    const m = field === 'min' ? (parseInt(val) || 0) : (typeof min === 'number' ? min : 0);
    const s = field === 'sec' ? (parseInt(val) || 0) : (typeof sec === 'number' ? sec : 0);
    onChange(m + s / 60);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div className="flex gap-2 items-center">
        <input
          type="number"
          min="0"
          placeholder="분"
          value={min}
          onChange={(e) => handle('min', e.target.value)}
          className="input w-20 text-center"
        />
        <span className="text-slate-500 font-medium">분</span>
        <input
          type="number"
          min="0"
          max="59"
          placeholder="초"
          value={sec}
          onChange={(e) => handle('sec', e.target.value)}
          className="input w-20 text-center"
        />
        <span className="text-slate-500 font-medium">초</span>
      </div>
    </div>
  );
}

function CardioTab({
  tier,
  state,
  update,
  computed,
}: {
  tier: TierProps;
  state: FormState;
  update: TabProps['update'];
  computed: any;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">심폐지구력 평가 (ACSM)</h2>
      <AdvToggle tier={tier} />
      <div className="bg-amber-50 border-l-4 border-amber-400 text-amber-800 text-sm p-3 mb-4">
        ⚠ 최대하/최대 검사 전 PAR-Q+ 통과 및 안정시 혈압/심박수 확인 필수.
      </div>

      <div className="card" style={{ display: tier.vis('cardio.rockport') ? undefined : 'none' }}>
        <h3 className="font-bold mb-2">
          Rockport 1-Mile Walking Test <span className="guideline-tag tag-acsm">ACSM</span>
        </h3>
        <p className="text-xs text-slate-500 mb-3">초보자·중장년층 최대하 현장검사 — 준비운동 5분 후 1마일(1.609km) 최대 속도 보행</p>
        <div className="grid md:grid-cols-2 gap-4 mb-3">
          <MinSecInput
            label="완주시간"
            valueMin={state.rockportTime}
            onChange={(v) => update('rockportTime', v)}
          />
          <Num label="종료시 심박수 (bpm)" value={state.rockportHr} onChange={(v) => update('rockportHr', v)} />
        </div>
        {(() => {
          const rock = (computed.vo2Estimates as { key: string; vo2: number }[] | undefined)?.find(
            (e) => e.key === 'rockport'
          );
          return rock ? (
            <p className="text-sm mt-1">
              이 검사 추정 VO₂max: <b>{rock.vo2.toFixed(1)}</b> ml/kg/min{' '}
              <span className="text-xs text-slate-500">(최종 분류는 전체 검사 중 최고값 기준)</span>
            </p>
          ) : null;
        })()}
      </div>

      <div className="card" style={{ display: tier.vis('cardio.run15') ? undefined : 'none' }}>
        <h3 className="font-bold mb-2">
          1.5-Mile (2.4 km) Run Test <span className="guideline-tag tag-acsm">ACSM</span>
        </h3>
        <p className="text-xs text-slate-500 mb-3">훈련된 대상자·중급 이상 — 최대노력 검사</p>
        <MinSecInput
          label="완주시간"
          valueMin={state.run15Time}
          onChange={(v) => update('run15Time', v)}
        />
      </div>

      <div className="card">
        <h3 className="font-bold mb-2">
          5-Min Run Test (2.4km 예측) <span className="guideline-tag tag-acsm">Riegel</span>
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          준비운동 후 <b>5분간 최대 노력으로 달린 거리(m)</b>를 입력 — Riegel 지구력 모델로 2.4km 완주시간을 예측하고 VO₂max로 환산합니다. 트랙·트레드밀 모두 가능.
        </p>
        <Num label="5분간 달린 거리 (m)" value={state.run5minDist} onChange={(v) => update('run5minDist', v)} />
        {state.run5minDist ? (() => {
          const t = riegel2400FromRun5min(state.run5minDist);
          return t ? (
            <div className="mt-3 text-sm bg-slate-800 border border-slate-700 rounded p-3">
              예측 2.4km 완주시간: <b>{fmtMinSec(t)}</b>
              <span className="text-slate-400"> · VO₂max ≈ {vo2maxFrom2400(t).toFixed(1)} ml/kg/min</span>
            </div>
          ) : null;
        })() : null}
      </div>

      <div className="card" style={{ display: tier.vis('cardio.cooper') ? undefined : 'none' }}>
        <h3 className="font-bold mb-2">
          12-Min Cooper Run <span className="guideline-tag tag-acsm">ACSM</span>
        </h3>
        <Num label="달린 거리 (m)" value={state.cooperDist} onChange={(v) => update('cooperDist', v)} />
      </div>


      {computed.vo2max && (
        <div className="card">
          <h3 className="font-bold mb-2">
            VO₂max 최종 분류 <span className="guideline-tag tag-acsm">ACSM</span>
          </h3>
          {computed.vo2Estimates.length > 1 && (
            <div className="text-sm mb-3 space-y-1">
              <div className="text-xs text-slate-500 mb-1">
                검사별 추정치 — 가장 좋은 기록이 최종 분류에 사용됩니다
              </div>
              {computed.vo2Estimates.map((e: any) => (
                <div
                  key={e.key}
                  className="flex justify-between items-center px-3 py-1.5 rounded"
                  style={
                    e.key === computed.bestVo2?.key
                      ? { background: '#111', color: '#fff', fontWeight: 600 }
                      : { background: '#f2f2f2', color: '#555' }
                  }
                >
                  <span>{e.key === computed.bestVo2?.key ? '★ ' : ''}{e.label}</span>
                  <span className="tabular-nums">{e.vo2.toFixed(1)} ml/kg/min</span>
                </div>
              ))}
            </div>
          )}
          <ResultBox result={computed.vo2max} unit="ml/kg/min" />
          {computed.bestVo2 && computed.vo2Estimates.length > 1 && (
            <p className="text-xs text-slate-500 mt-2">기준 검사: {computed.bestVo2.label}</p>
          )}
        </div>
      )}
    </div>
  );
}

function StrengthTab({
  tier,
  state,
  update,
  computed,
  weight,
}: {
  tier: TierProps;
  state: FormState;
  update: TabProps['update'];
  computed: any;
  weight: number;
}) {
  const ratio = (v?: number) => (v && weight ? (v / weight).toFixed(2) : '-');
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">근력 평가 (NSCA)</h2>
      <AdvToggle tier={tier} />
      <div className="bg-amber-50 border-l-4 border-amber-400 text-amber-800 text-sm p-3 mb-4">
        ⚠ 1RM 직접 검사 전 NSCA 권장 준비운동 프로토콜 준수 — 부하를 올려가며 <b>세트당 5-10회 → 3-5회 → 2-3회</b> 수행 후 1RM 시도 (시도 간 휴식 2-4분).
      </div>

      <div className="card" style={{ display: tier.vis('str.rm1') ? undefined : 'none' }}>
        <h3 className="font-bold mb-2">
          1RM 직접 측정 <span className="guideline-tag tag-nsca">NSCA</span>
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          {([
            ['Bench Press (kg)', 'bp1rm', computed.bpRatio],
            ['Back Squat (kg)', 'sq1rm', computed.sqRatio],
            ['Deadlift (kg)', 'dl1rm', computed.dlRatio],
            ['Overhead Press (kg)', 'ohp1rm', computed.ohpRatio],
            ['Power Clean (kg)', 'pc1rm', computed.pcRatio],
            ['Leg Press (kg)', 'lp1rm', computed.lpRatio],
          ] as [string, keyof typeof state, any][]).map(([label, key, cls]) => (
            <div key={key}>
              <Num label={label} value={state[key] as number} onChange={(v) => update(key, v)} step="0.5" />
              <div className="text-xs text-slate-500 mt-1">체중비 {ratio(state[key] as number)}</div>
              {cls && <div className="mt-1"><ResultBox result={cls} /></div>}
            </div>
          ))}
        </div>
        {false && (
          <div className="mt-4">
            <div className="text-sm font-semibold mb-1">벤치프레스 체중비 분류 (NSCA)</div>
            <ResultBox result={computed.bpRatio} />
          </div>
        )}
      </div>

      <div className="card" style={{ display: tier.vis('str.est') ? undefined : 'none' }}>
        <h3 className="font-bold mb-2">
          다중반복 1RM 추정 <span className="guideline-tag tag-nsca">NSCA</span>
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          10RM 이하의 무게로 실패까지 수행 (초급·고위험군에 적합) — <b>벤치프레스·스쿼트 등 실시한 종목 기준</b>의
          1RM 추정치입니다. 어떤 종목으로 측정했는지 특이사항 메모에 남겨 주세요.
        </p>
        <div className="grid md:grid-cols-2 gap-4 mb-3">
          <Num label="중량 (kg)" value={state.est1rmW} onChange={(v) => update('est1rmW', v)} step="0.5" />
          <Num label="반복수 (≤10)" value={state.est1rmReps} onChange={(v) => update('est1rmReps', v)} />
        </div>
        {computed.est1rm && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="text-2xl font-bold">≈ {computed.est1rm.toFixed(1)} kg</div>
            <div className="text-xs text-slate-600 mt-1">
              Epley {estimate1RM_epley(state.est1rmW!, state.est1rmReps!).toFixed(1)} /{' '}
              Brzycki {estimate1RM_brzycki(state.est1rmW!, state.est1rmReps!)?.toFixed(1) || '-'} /{' '}
              Lombardi {estimate1RM_lombardi(state.est1rmW!, state.est1rmReps!).toFixed(1)}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="font-bold mb-2">
          악력 Grip Strength <span className="guideline-tag tag-nsca">NSCA</span>
        </h3>
        <p className="text-xs text-slate-500 mb-3">핸드 다이나모미터 · 좌우 2회 측정 후 최고값</p>
        <div className="grid md:grid-cols-2 gap-4 mb-3">
          <Num label="우측 Right (kg)" value={state.gripR} onChange={(v) => update('gripR', v)} step="0.1" />
          <Num label="좌측 Left (kg)" value={state.gripL} onChange={(v) => update('gripL', v)} step="0.1" />
        </div>
        {computed.grip && state.gripR && state.gripL && (
          <ResultBox result={computed.grip} unit="kg (좌+우)">
            <div className="text-xs text-slate-600 mt-2">
              좌우 차이{' '}
              {(
                (Math.abs(state.gripR - state.gripL) / Math.max(state.gripR, state.gripL)) *
                100
              ).toFixed(1)}
              % {Math.abs(state.gripR - state.gripL) / Math.max(state.gripR, state.gripL) > 0.1 ? '⚠ 비대칭' : '(대칭 양호)'}
            </div>
          </ResultBox>
        )}
      </div>
    </div>
  );
}

function EnduranceTab({
  tier,
  state,
  update,
  computed,
}: {
  tier: TierProps;
  state: FormState;
  update: TabProps['update'];
  computed: any;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">근지구력 평가 (NSCA · ACSM)</h2>
      <AdvToggle tier={tier} />

      <div className="card">
        <h3 className="font-bold mb-2">
          Push-up Test <span className="guideline-tag tag-nsca">NSCA</span>
        </h3>
        <p className="text-xs text-slate-500 mb-3">남성: 표준 / 여성: 수정(무릎). 실패까지 연속.</p>
        <Num label="반복수 Reps" value={state.pushupReps} onChange={(v) => update('pushupReps', v)} />
        {computed.pushup && (
          <div className="mt-3">
            <ResultBox result={computed.pushup} unit="회" />
          </div>
        )}
      </div>

      <div className="card" style={{ display: tier.vis('end.ymca') ? undefined : 'none' }}>
        <h3 className="font-bold mb-2">
          YMCA Bench Press 근지구력 <span className="guideline-tag tag-nsca">NSCA</span>
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          남 36.3 kg / 여 15.9 kg · 메트로놈 60 bpm (30 rep/min)
        </p>
        <Num label="반복수 Reps" value={state.ymcaBpReps} onChange={(v) => update('ymcaBpReps', v)} />
        {computed.ymcaBp && (
          <div className="mt-3">
            <ResultBox result={computed.ymcaBp} unit="회" />
          </div>
        )}
      </div>

      <div className="card" style={{ display: tier.vis('end.pullup') ? undefined : 'none' }}>
        <h3 className="font-bold mb-2">
          Pull-up Test 상체 당기기 <span className="guideline-tag tag-acsm">Field</span>
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          <b>데드행(팔 완전 신전)</b>에서 시작 · 턱이 바 위로 올라올 때까지 당기기 ·
          <b> 반동(키핑) 없이</b> 최대 반복 횟수 기록. 오버핸드 그립 기준.
          0회도 유효한 기록 — 여성·초보자는 밴드 보조 시 별도 메모 권장.
        </p>
        <Num label="반복수 Reps" value={state.pullupReps} onChange={(v) => update('pullupReps', v)} />
        {computed.pullup && (
          <div className="mt-3">
            <ResultBox result={computed.pullup} unit="회" />
          </div>
        )}
      </div>

      <div className="card" style={{ display: tier.vis('end.curlup') ? undefined : 'none' }}>
        <h3 className="font-bold mb-2">
          Partial Curl-up Test <span className="guideline-tag tag-nsca">NSCA</span>
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          무릎 140° · 메트로놈 40 bpm (20 rep/min) · 최대 75회 또는 실패까지
        </p>
        <Num label="반복수 Reps" value={state.curlupReps} onChange={(v) => update('curlupReps', v)} />
        {computed.curlup && (
          <div className="mt-3">
            <ResultBox result={computed.curlup} unit="회" />
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="font-bold mb-2">
          Squat Endurance Test 하지 근지구력 <span className="guideline-tag tag-acsm">Field</span>
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          양발 어깨너비 · <b>대퇴가 수평이 될 때까지</b> 자중 스쿼트 · 일정한 템포로 쉬지 않고,
          자세가 무너지거나(수평 미달·상체 과도 전경·뒤꿈치 들림) 멈출 때까지 <b>최대 반복 횟수</b> 기록.
          무릎 통증 시 즉시 중단.
        </p>
        <Num label="반복수 Reps" value={state.squatReps} onChange={(v) => update('squatReps', v)} />
        {computed.squatEnd && (
          <div className="mt-3">
            <ResultBox result={computed.squatEnd} unit="회" />
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="font-bold mb-2">
          Plank Battery (McGill) <span className="guideline-tag tag-nsca">NSCA</span>
        </h3>
        <div className="text-xs text-slate-400 mb-3 space-y-1 bg-slate-800/60 border border-slate-700 rounded p-3">
          <p><b className="text-slate-200">Sorensen (Biering-Sørensen) 검사 — 요부 신전근 지구력</b></p>
          <p>① 엎드린 자세로 <b>상전장골극(ASIS)을 테이블 끝에 맞추고</b> 상체(골반 위)를 테이블 밖으로 내민다. 검사자가 골반·다리를 고정(벨트 또는 보조).</p>
          <p>② 양팔을 가슴에 교차하고 <b>상체를 수평으로 들어 유지</b> — 등이 처지거나 올라가지 않는 중립 자세.</p>
          <p>③ 수평을 유지하지 못하는 순간까지의 <b>버틴 시간(초)</b>을 기록. 정상 기준 ≈ 남 ~146초·여 ~189초, 임상 절단점 <b>&lt;120초</b>는 요통 위험.</p>
          <p className="text-slate-500">※ 전방 플랭크 대비 Sorensen/전방 비율 &lt; 1.5면 요부 신전근 상대 약화로 판정.</p>
        </div>
        <div className="grid md:grid-cols-4 gap-3">
          <Num label="전방 Front (s)" value={state.plankFront} onChange={(v) => update('plankFront', v)} />
          <Num label="우측 Right (s)" value={state.plankR} onChange={(v) => update('plankR', v)} />
          <Num label="좌측 Left (s)" value={state.plankL} onChange={(v) => update('plankL', v)} />
          <Num label="Sorensen (s)" value={state.sorensen} onChange={(v) => update('sorensen', v)} />
        </div>
        {computed.plank && (
          <div className="mt-3">
            <ResultBox result={computed.plank.frontClass} unit="초 (전방)" />
            {computed.plank.warnings.length > 0 && (
              <ul className="mt-2 text-xs text-orange-700 list-disc pl-5">
                {computed.plank.warnings.map((w: string, i: number) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PostureTab({
  tier,
  state,
  update,
  computed,
}: {
  tier: TierProps;
  state: FormState;
  update: TabProps['update'];
  computed: any;
}) {
  const toggle = (key: string) => {
    const flags = new Set(state.postureFlags || []);
    if (flags.has(key)) flags.delete(key);
    else flags.add(key);
    update('postureFlags', Array.from(flags));
  };
  const has = (key: string) => (state.postureFlags || []).includes(key);

  // 본 체크 해제 시 좌/우 상세도 함께 제거
  const toggleBase = (key: string) => {
    const flags = new Set(state.postureFlags || []);
    if (flags.has(key)) {
      flags.delete(key);
      flags.delete(`${key}:L`);
      flags.delete(`${key}:R`);
    } else {
      flags.add(key);
    }
    update('postureFlags', Array.from(flags));
  };
  // 좌/우 토글 — 선택 시 본 체크 자동 활성
  const toggleSide = (key: string, side: 'L' | 'R') => {
    const flags = new Set(state.postureFlags || []);
    const sk = `${key}:${side}`;
    if (flags.has(sk)) flags.delete(sk);
    else {
      flags.add(sk);
      flags.add(key);
    }
    update('postureFlags', Array.from(flags));
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">정적 자세 평가 (NASM)</h2>
      <AdvToggle tier={tier} />
      <div className="card">
        <h3 className="font-bold mb-2">
          NASM 정적 자세 평가 — 체형 스케치 & 메모 <span className="guideline-tag tag-nasm">NASM</span>
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          5가지 운동 사슬 체크포인트(발·무릎·골반/LPHC·어깨·머리)를 전면·측면·후면에서 관찰하고,
          체크 항목으로 정의하기 어려운 주름·벌크·비대칭 등은 그림 위에 직접 표시하거나 메모로 남기세요.
        </p>
        <PostureSketch
          value={state.postureDrawing}
          onChange={(v) => update('postureDrawing', v)}
        />
        <div className="mt-4">
          <label className="label">질적 평가 메모</label>
          <textarea
            className="input"
            rows={4}
            placeholder="예: 우측 견갑 하각 돌출, 좌측 허리 주름 깊음, 종아리 벌크 비대칭 등"
            value={state.postureMemo ?? ''}
            onChange={(e) => update('postureMemo', e.target.value || undefined)}
          />
        </div>

        {/* 자세 사진 첨부 — 촬영 또는 앨범, 자동 압축 (최대 4장) */}
        <div className="mt-4">
          <label className="label">자세 사진 (촬영·앨범, 최대 4장)</label>
          <div className="flex flex-wrap items-start gap-2">
            {(state.posturePhotos ?? []).map((p, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p}
                  alt={`자세 사진 ${i + 1}`}
                  className="rounded-lg"
                  style={{ width: 96, height: 128, objectFit: 'cover', border: '1px solid #d6d6d6' }}
                />
                <button
                  type="button"
                  onClick={() =>
                    update('posturePhotos', (prev) => {
                      const n = (prev ?? []).filter((_, j) => j !== i);
                      return n.length ? n : undefined;
                    })
                  }
                  className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full text-xs font-bold"
                  style={{ background: '#111', color: '#fff', border: '2px solid #fff' }}
                  title="삭제"
                >
                  ✕
                </button>
              </div>
            ))}
            {(state.posturePhotos ?? []).length < 4 && (
              <label
                className="flex flex-col items-center justify-center rounded-lg cursor-pointer text-xs font-semibold"
                style={{ width: 96, height: 128, border: '1.5px dashed #9a9a9a', color: '#555', background: '#fafafa' }}
              >
                📷
                <span className="mt-1">촬영·추가</span>
                {/* capture 속성 없음 — 기기가 촬영/앨범 선택지를 모두 제공 (capture 강제 시
                    카톡 인앱브라우저 등에서 무반응 + 앨범 불러오기 불가: 트레이너 피드백) */}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files ?? []);
                    e.target.value = '';
                    if (!files.length) return;
                    const room = 4 - (state.posturePhotos ?? []).length;
                    const added: string[] = [];
                    for (const file of files.slice(0, room)) {
                      // 캔버스 압축: 최대 900px, JPEG 0.72 (~100-200KB)
                      const url = await new Promise<string>((resolve, reject) => {
                        const img = new Image();
                        img.onload = () => {
                          const scale = Math.min(1, 900 / Math.max(img.width, img.height));
                          const c = document.createElement('canvas');
                          c.width = Math.round(img.width * scale);
                          c.height = Math.round(img.height * scale);
                          c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
                          resolve(c.toDataURL('image/jpeg', 0.72));
                        };
                        img.onerror = reject;
                        img.src = URL.createObjectURL(file);
                      }).catch(() => '');
                      if (url) added.push(url);
                    }
                    if (added.length) {
                      // 함수형 업데이트 — 압축 중 다른 조작이 있어도 최신 배열 기준으로 병합
                      update('posturePhotos', (prev) => [...(prev ?? []), ...added].slice(0, 4));
                    } else {
                      alert('사진을 불러오지 못했습니다. 다른 사진으로 다시 시도해 주세요.');
                    }
                  }}
                />
              </label>
            )}
          </div>
          <p className="text-[11px] mt-1" style={{ color: '#8a8a8a' }}>
            사진은 자동 압축되어 평가와 함께 저장되고 보고서에 표시됩니다.
          </p>
        </div>
      </div>

      {/* 정적 자세 관찰 매트릭스 — 행: 전면/측면/후면 · 열: 부위 (트레이너 요청으로 3개 카드 통합) */}
      <div className="card">
        <h3 className="font-bold mb-1">
          정적 자세 관찰 매트릭스 <span className="guideline-tag tag-nasm">NASM</span>
        </h3>
        <p className="text-xs text-slate-500 mb-1">
          해당 소견에 체크하고 필요하면 좌/우를 구분하세요. 체크하면 아래에 NASM 자세 증후군이 자동 매칭됩니다. 각 행 첫 칸에 관찰 기준선이 있습니다.
        </p>
        <p className="md:hidden text-[11px] mb-2" style={{ color: '#9a9a9a' }}>
          ↔ 표를 옆으로 밀면 전체 부위가 보입니다
        </p>
        <div className="overflow-x-auto">
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 1024 }}>
            <thead>
              <tr>
                <th style={{ ...pmTh, width: 132 }}>관찰</th>
                {POSTURE_COLS.map((c) => (
                  <th key={c.key} style={pmTh}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {POSTURE_SECTIONS.map((sec) => (
                <tr key={sec.title} style={{ verticalAlign: 'top' }}>
                  <th scope="row" style={{ ...pmTd, background: '#fafafa', textAlign: 'left' }}>
                    <div className="text-sm font-bold">{sec.title.split(' ')[0]}</div>
                    <div className="text-[10px] font-normal mt-1 leading-relaxed" style={{ color: '#9a9a9a' }}>
                      {sec.note}
                    </div>
                  </th>
                  {POSTURE_COLS.map((col) => {
                    const items = sec.groups
                      .filter((g) => postureColOf(g.head) === col.key)
                      .flatMap((g) => g.items);
                    return (
                      <td key={col.key} style={pmTd}>
                        {items.length === 0 ? (
                          <span className="text-xs" style={{ color: '#c4c4c4' }}>—</span>
                        ) : (
                          <div className="space-y-2">
                            {items.map(([key, label]) => (
                              <div key={key}>
                                <label className="flex items-start gap-1.5 text-xs leading-snug">
                                  <input
                                    type="checkbox"
                                    className="mt-0.5"
                                    checked={has(key)}
                                    onChange={() => toggleBase(key)}
                                  />
                                  <span>{label}</span>
                                </label>
                                <div className="flex gap-1 mt-1 ml-5">
                                  {(['L', 'R'] as const).map((side) => (
                                    <button
                                      key={side}
                                      type="button"
                                      onClick={() => toggleSide(key, side)}
                                      className="px-1.5 py-0.5 rounded text-[11px] font-semibold transition"
                                      style={
                                        has(`${key}:${side}`)
                                          ? { background: '#111', color: '#fff', border: '1px solid #111' }
                                          : { background: '#fff', color: '#9a9a9a', border: '1px solid #d6d6d6' }
                                      }
                                      title={side === 'L' ? '좌측' : '우측'}
                                    >
                                      {side === 'L' ? '좌' : '우'}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 className="font-bold mb-3">
          자세 증후군 자동 매칭 <span className="guideline-tag tag-nasm">NASM</span>
        </h3>
        {(state.postureFlags || []).length === 0 ? (
          <p className="text-sm text-slate-500">체크된 항목이 없습니다.</p>
        ) : computed.syndromes.length === 0 ? (
          <p className="text-sm text-slate-500">
            선택된 편차가 특정 증후군 패턴과 일치하지 않습니다. 개별 편차를 기록하고 Corrective 전략을 설계하세요.
          </p>
        ) : (
          <div className="space-y-3">
            {computed.syndromes.map((m: any) => (
              <div key={m.id} className="border border-slate-700 rounded-lg p-3 bg-slate-800">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <strong className="text-slate-100">{m.name}</strong>
                  <span className="pill-below">일치 편차 {m.hits}개</span>
                </div>
                <div className="text-sm mt-2">
                  <strong>과활성(Short/Tight):</strong> <span className="text-slate-300">{m.overactive}</span>
                </div>
                <div className="text-sm mt-1">
                  <strong>저활성(Weak):</strong> <span className="text-slate-300">{m.underactive}</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  → SMR + 정적 스트레칭 (과활성) + 활성화 + 통합 운동 (저활성)
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 호흡 평가 — FMS Breathing Screen */}
      <div className="card" style={{ display: tier.vis('post.breath') ? undefined : 'none' }}>
        <h3 className="font-bold mb-1">
          호흡 평가 <span className="guideline-tag tag-fms">FMS Breathing Screen</span>
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          FMS 다차원 모델 — <b>생화학(Biochemical)</b> · <b>생역학(Biomechanical)</b> ·{' '}
          <b>심리생리(Psychophysiological)</b> 3개 차원을 숨참기 2종 + 관찰 + 설문으로 평가.
          통과 시 호흡 기능부전 배제 민감도 0.89 (Kiesel et al. 2016). 앉은 자세에서 실시.
        </p>
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div>
            <span className="guideline-tag" style={{ marginLeft: 0, marginBottom: 4, display: 'inline-block' }}>생화학 Biochemical</span>
            <Num
              label="① FRC 숨참기 (초)"
              value={state.breathFrc}
              onChange={(v) => update('breathFrc', v)}
            />
            <p className="text-[11px] text-slate-500 mt-1">
              평소처럼 내쉰 뒤 코 막고 유지 — 첫 호흡 욕구·호흡근 수축까지.
              Green &gt;35 / Yellow 26–35 / Red ≤25
            </p>
          </div>
          <div>
            <span className="guideline-tag" style={{ marginLeft: 0, marginBottom: 4, display: 'inline-block' }}>생화학 Biochemical</span>
            <Num
              label="② TLC 숨참기 (초)"
              value={state.breathTlc}
              onChange={(v) => update('breathTlc', v)}
            />
            <p className="text-[11px] text-slate-500 mt-1">
              최대로 들이마신 뒤 한계까지 유지 (근육 사용 허용).
              Green &gt;60 / Yellow 36–60 / Red ≤35
            </p>
          </div>
          <div>
            <span className="guideline-tag" style={{ marginLeft: 0, marginBottom: 4, display: 'inline-block' }}>생역학 Biomechanical</span>
            <label className="label">③ Hi-Lo 관찰 (가슴·복부 손 대고 5호흡)</label>
            <select
              className="input"
              value={state.breathHiLo ?? ''}
              onChange={(e) => update('breathHiLo', (e.target.value || undefined) as any)}
            >
              <option value="">미실시</option>
              <option value="diaph">복식(횡격막) 우세 — 정상</option>
              <option value="thoracic">흉식(상부 흉곽) 우세 — 기능부전 의심</option>
              <option value="paradox">역설 호흡 (들숨에 배 함몰) — 기능부전</option>
            </select>
          </div>
        </div>

        <div className="mb-2">
          <div className="mb-2">
            <span className="guideline-tag" style={{ marginLeft: 0 }}>심리생리 Psychophysiological</span>
          </div>
          <div className="label mb-2">④ 호흡 설문 (각 0–3)</div>
          <p className="text-xs mb-2" style={{ color: '#6e6e6e' }}>
            채점: 4문항 중 <b style={{ color: '#333' }}>가장 높은 응답 1개</b> 기준 —
            0점 🟢 Green(징후 없음) · 1점 🟡 Yellow(가벼운 징후 — 호흡 재훈련 병행 권장) ·
            2–3점 🔴 Red(기능부전 의심)
          </p>
          <div className="space-y-2">
            {BREATH_QUESTIONS.map((qText, qi) => {
              const answers = state.breathQ ?? [];
              const cur = answers[qi];
              return (
                <div key={qi} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded" style={{ background: '#f7f7f7', border: '1px solid #e3e3e3' }}>
                  <span className="text-sm" style={{ color: '#333' }}>Q{qi + 1}. {qText}</span>
                  <div className="flex gap-1">
                    {['전혀 0', '가끔 1', '자주 2', '매우 3'].map((lab, val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          const next = [...(state.breathQ ?? [0, 0, 0, 0])];
                          next[qi] = val;
                          update('breathQ', next);
                        }}
                        className="px-2.5 py-1.5 rounded text-xs font-semibold transition"
                        style={
                          cur === val
                            ? { background: '#111', color: '#fff', border: '1px solid #111' }
                            : { background: '#fff', color: '#777', border: '1px solid #d6d6d6' }
                        }
                      >
                        {lab}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {state.breathQ && (
            <button
              type="button"
              className="text-xs underline mt-1.5"
              style={{ color: '#8a8a8a' }}
              onClick={() => update('breathQ', undefined)}
            >
              설문 초기화 (미실시로)
            </button>
          )}
        </div>

        {(() => {
          const br = breathScreen({
            frc: state.breathFrc,
            tlc: state.breathTlc,
            q: state.breathQ,
            hiLo: state.breathHiLo,
          });
          if (!br || !br.overall) return null;
          const c =
            br.overall === 'green'
              ? { bg: '#edf7ee', bd: '#a6d7ae', tx: '#067647' }
              : br.overall === 'yellow'
              ? { bg: '#fef7e6', bd: '#f0d48a', tx: '#b54708' }
              : { bg: '#fef3f2', bd: '#f0b4ae', tx: '#b42318' };
          return (
            <div className="mt-3 p-3 rounded-lg" style={{ background: c.bg, border: `1.5px solid ${c.bd}` }}>
              <div className="font-bold text-sm" style={{ color: c.tx }}>
                {br.overall === 'green' ? '🟢' : br.overall === 'yellow' ? '🟡' : '🔴'} {br.label}
              </div>
              <div className="text-xs mt-1" style={{ color: c.tx }}>{br.message}</div>
              <div className="text-[11px] mt-1.5" style={{ color: '#555' }}>
                {br.frc && `FRC: ${br.frc.toUpperCase()}`}{br.tlc && ` · TLC: ${br.tlc.toUpperCase()}`}{br.q && ` · 설문: ${br.q.toUpperCase()}`}
              </div>
            </div>
          );
        })()}
      </div>
      {/* 평형성 — 눈뜨고 외발서기 */}
      <div className="card" style={{ display: tier.vis('post.balance') ? undefined : 'none' }}>
        <h3 className="font-bold mb-1">
          평형성 — 눈뜨고 외발서기 <span className="guideline-tag">Balance</span>
        </h3>
        <p className="text-xs text-slate-500 mb-1">
          양손은 허리 또는 자연스럽게 · 한쪽 발을 들어 유지한 시간(초) 기록 · 든 발이 바닥에
          닿거나 지지물을 잡으면 종료. 좌우 각각 측정.
        </p>
        <p className="text-xs font-semibold mb-3" style={{ color: '#b42318' }}>
          ⚠ 고령자는 낙상 위험 — 반드시 벽이나 튼튼한 의자를 바로 옆에 두고 실시하세요.
        </p>
        <div className="grid grid-cols-2 gap-3 max-w-sm mb-2">
          <Num label="우측 지지 (초)" value={state.balanceR} onChange={(v) => update('balanceR', v)} />
          <Num label="좌측 지지 (초)" value={state.balanceL} onChange={(v) => update('balanceL', v)} />
        </div>
        {computed.balanceRow && (
          <p className="text-[11px] mb-2" style={{ color: '#8a8a8a' }}>
            이 연령대 기준 — 낮음 ≤{computed.balanceRow[0]}초 · 보통 ~{computed.balanceRow[1]}초 ·
            양호 ~{computed.balanceRow[2]}초 · 우수 ~{computed.balanceRow[3]}초 · 매우우수 &gt;{computed.balanceRow[3]}초
          </p>
        )}
        {computed.balance && (
          <div className="mt-2">
            <ResultBox result={computed.balance.cls} unit="초 (약한 쪽 기준)" />
            {computed.balance.asymPct != null && computed.balance.asymPct > 0 && (
              <p className="text-xs mt-1.5" style={{ color: '#555' }}>
                좌우 차이 {computed.balance.asymPct}%
                {computed.balance.weakSide && ` (약한 쪽: ${computed.balance.weakSide === 'L' ? '좌' : '우'})`}
              </p>
            )}
            {computed.balance.warning && (
              <p className="text-xs mt-1 font-semibold" style={{ color: '#b42318' }}>
                ⚠ {computed.balance.warning}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MovementTab({
  tier,
  state,
  update,
  computed,
}: {
  tier: TierProps;
  state: FormState;
  update: TabProps['update'];
  computed: any;
}) {
  const fms = state.fms || {};
  const setFmsScore = (id: string, score: number) => {
    update('fms', { ...fms, [id]: score });
  };
  const setFmsComment = (id: string, text: string) => {
    update('fmsComments', { ...(state.fmsComments || {}), [id]: text });
  };

  const ohsaToggle = (key: string) => {
    const flags = new Set(state.ohsaFlags || []);
    if (flags.has(key)) flags.delete(key);
    else flags.add(key);
    update('ohsaFlags', Array.from(flags));
  };
  const ohsaHas = (key: string) => (state.ohsaFlags || []).includes(key);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">움직임 평가 – 가동성·안정성 (FMS · NASM)</h2>
      <AdvToggle tier={tier} />

      <div className="card" style={{ display: tier.vis('mov.fms') ? undefined : 'none' }}>
        <h3 className="font-bold mb-2">
          FMS 7-Test Screen <span className="guideline-tag tag-fms">FMS</span>
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          점수 0(통증)-3(정상) · 좌우 낮은 점수 기록 · 총점 21 만점
        </p>

        <div className="space-y-3">
          {FMS_TESTS.map((t) => (
            <div key={t.id} className="border border-slate-700 rounded-lg p-3 bg-slate-800">
              <h4 className="font-bold text-sm mb-1">{t.name}</h4>
              <p className="text-xs text-slate-600 mb-1">{t.description}</p>
              <p className="text-[11px] text-slate-500 mb-2">
                <strong>기준:</strong> {t.criteria}
              </p>
              {t.bilateral ? (
                <div className="grid md:grid-cols-2 gap-3">
                  <ScoreSelector
                    label="우측 R"
                    value={fms[`${t.id}_r`]}
                    onChange={(v) => setFmsScore(`${t.id}_r`, v)}
                  />
                  <ScoreSelector
                    label="좌측 L"
                    value={fms[`${t.id}_l`]}
                    onChange={(v) => setFmsScore(`${t.id}_l`, v)}
                  />
                </div>
              ) : (
                <ScoreSelector
                  label="점수"
                  value={fms[t.id]}
                  onChange={(v) => setFmsScore(t.id, v)}
                />
              )}
              <textarea
                placeholder="코멘트 (선택사항)"
                value={(state.fmsComments || {})[t.id] || ''}
                onChange={(e) => setFmsComment(t.id, e.target.value)}
                className="mt-2 w-full text-sm border border-slate-700 rounded-lg p-2 resize-none text-slate-200 placeholder-slate-500 bg-slate-900"
                rows={2}
              />
            </div>
          ))}
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-2xl font-bold">
            FMS 총점 {computed.fmsResult.total} / 21
          </div>
          <span className={pillClass(computed.fmsResult.classification)}>
            {computed.fmsResult.message}
          </span>
          <div className="text-xs text-slate-600 mt-1">
            좌우 비대칭 {computed.fmsResult.asymmetries}개 · 0점 항목 {computed.fmsResult.zeros}개
          </div>
        </div>
      </div>

      <div className="card" style={{ display: tier.vis('mov.clear') ? undefined : 'none' }}>
        <h3 className="font-bold mb-3">
          FMS Clearing Tests <span className="guideline-tag tag-fms">FMS</span>
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { key: 'clearSh' as const, label: 'Shoulder Impingement' },
            { key: 'clearExt' as const, label: 'Prone Press-up 신전' },
            { key: 'clearFlex' as const, label: 'Posterior Rocking 굴곡' },
          ].map((c) => (
            <div key={c.key}>
              <label className="label">{c.label}</label>
              <select
                className="input"
                value={(state as any)[c.key] || ''}
                onChange={(e) => update(c.key, e.target.value as any)}
              >
                <option value="">선택</option>
                <option value="neg">음성</option>
                <option value="pos">양성</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="font-bold mb-3">
          NASM Overhead Squat Assessment <span className="guideline-tag tag-nasm">NASM</span>
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          발 어깨너비·정면, 팔 머리 위 완전 신전 · 의자 높이까지 스쿼트 <b>5회</b> —
          전면(발·무릎) → 측면(LPHC·어깨) → 후면(발·LPHC) 순서로 각각 관찰 (NASM CES)
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { group: '전면 Anterior — 발·무릎', items: [
              ['oh_foot_turnout', '발 외회전 (turn out)'],
              ['oh_foot_flat', '발 편평 (과회내)'],
              ['oh_knee_valg', '무릎 내측 이동 (외반 Valgus)'],
              ['oh_knee_var', '무릎 외측 이동 (내반 Varus)'],
            ] },
            { group: '측면 Lateral — LPHC·어깨', items: [
              ['oh_torso_lean', '과도한 전방 기울임'],
              ['oh_low_back', '요추 과신전 (아치)'],
              ['oh_low_back_round', '요추 굴곡 (라운딩)'],
              ['oh_pelvis_ant', '골반 전방 경사'],
              ['oh_pelvis_post', '골반 후방 경사'],
              ['oh_arms_fall', '팔 전방 낙하'],
            ] },
            { group: '후면 Posterior — 발·LPHC', items: [
              ['oh_heel_rise', '뒤꿈치 들림'],
              ['oh_asym_shift', '비대칭 체중 이동'],
            ] },
          ].map((g) => (
            <div key={g.group} className="border border-slate-700 rounded-lg p-3 bg-slate-800">
              <h4 className="text-sm font-bold mb-2">{g.group}</h4>
              <div className="space-y-1.5">
                {g.items.map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={ohsaHas(key)} onChange={() => ohsaToggle(key)} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ display: tier.vis('mov.sls') ? undefined : 'none' }}>
        <h3 className="font-bold mb-3">
          Single-Leg Squat · Push · Pull <span className="guideline-tag tag-nasm">NASM</span>
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { group: 'Single-Leg Squat (전면 관찰·5회씩 좌우)', items: [
              ['sl_knee_valg', '무릎 내측 이동 (외반 Valgus)'],
              ['sl_hip_hike', '골반 상승 (Hip Hike)'],
              ['sl_hip_drop', '골반 하강 (Hip Drop·Trendelenburg)'],
              ['sl_trunk_rot_in', '몸통 내회전'],
              ['sl_trunk_rot_out', '몸통 외회전'],
              ['sl_torso_lat', '상체 측방 기울임'],
            ] },
            { group: 'Pushing', items: [
              ['pu_low_back', '요추 과전만'],
              ['pu_sh_elev', '어깨 거상'],
              ['pu_head_fwd', '머리 전방'],
            ] },
            { group: 'Pulling', items: [
              ['pl_low_back', '요추 과전만'],
              ['pl_sh_elev', '어깨 거상'],
              ['pl_head_fwd', '머리 전방'],
            ] },
          ].map((g) => (
            <div key={g.group} className="border border-slate-700 rounded p-3 bg-slate-800">
              <h4 className="text-sm font-bold mb-2">{g.group}</h4>
              <div className="space-y-1">
                {g.items.map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={ohsaHas(key)} onChange={() => ohsaToggle(key)} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 체크된 보상 → 교정 대상 근육 (NASM CES Ch.6 표) */}
      {(() => {
        const checked = MOVEMENT_COMPENSATIONS.filter((c) =>
          (state.ohsaFlags || []).includes(c.key)
        );
        if (!checked.length) return null;
        return (
          <div className="card">
            <h3 className="font-bold mb-1">
              교정 대상 근육 자동 매칭 <span className="guideline-tag tag-nasm">NASM CES</span>
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              체크한 보상 패턴별 — <b style={{ color: '#b42318' }}>과활성(이완·스트레칭 대상)</b> /{' '}
              <b style={{ color: '#175cd3' }}>저활성(활성화·강화 대상)</b>
            </p>
            <div className="space-y-3">
              {checked.map((c) => (
                <div key={c.key} className="border-l-4 pl-3 py-1" style={{ borderLeftColor: '#111' }}>
                  <div className="font-semibold text-sm text-slate-100">{c.label}</div>
                  <div className="text-xs mt-1" style={{ color: '#b42318' }}>
                    <b>과활성:</b> {c.overactive}
                  </div>
                  <div className="text-xs" style={{ color: '#175cd3' }}>
                    <b>저활성:</b> {c.underactive}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function SummaryTab({
  client,
  age,
  state,
  computed,
  update,
}: {
  client: ClientInfo;
  age: number;
  state: FormState;
  computed: any;
  update: TabProps['update'];
}) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">종합 보고서 & 운동처방 방향</h2>

      <div className="bg-gradient-to-r from-blue-800 to-blue-600 text-white p-5 rounded-xl mb-5">
        <h3 className="font-bold mb-3">회원님 요약</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <SummaryItem label="이름" value={client.name} />
          <SummaryItem label="성별/나이" value={`${client.sex === 'M' ? '남' : '여'} · ${age}세`} />
          <SummaryItem label="측정일" value={state.date || '-'} />
          <SummaryItem label="BMI" value={computed.bmiClass?.value.toFixed(1) || '-'} />
          <SummaryItem label="체지방률" value={computed.bodyFat?.value.toFixed(1) ? `${computed.bodyFat.value.toFixed(1)}%` : state.biaBf ? `${state.biaBf}%` : '-'} />
          <SummaryItem label="VO₂max" value={computed.vo2max?.value.toFixed(1) || '-'} />
          <SummaryItem label="FMS" value={computed.fmsEntered ? `${computed.fmsResult.total}/21` : '미실시'} />
          <SummaryItem label="목적" value={goalLabel(client.goal)} />
        </div>
      </div>

      <FitnessScoreCard computed={computed} state={state} />

      <div className="mt-5">
        <NormsTable age={age || 30} sex={client.sex === 'F' ? 'F' : 'M'} />
      </div>

      <div className="card">
        <h3 className="font-bold mb-3">자세·움직임</h3>
        <ul className="text-sm space-y-1.5">
          {computed.fmsEntered && (
            <li>• FMS 총점 {computed.fmsResult.total}/21 · 0점 {computed.fmsResult.zeros}개 · 비대칭 {computed.fmsResult.asymmetries}개</li>
          )}
          {computed.syndromes.length > 0 && (
            <li>• 의심 자세 증후군: {computed.syndromes.map((s: any) => s.name).join(', ')}</li>
          )}
          {(state.ohsaFlags || []).length > 0 && (
            <li>• OHSA 보상 패턴 {(state.ohsaFlags || []).length}개 관찰됨</li>
          )}
        </ul>
      </div>

      <div className="card">
        <h3 className="font-bold mb-3">
          우선순위 개선영역 & 운동처방 방향
          <span className="text-xs text-slate-500 ml-2">(가이드라인 기반 자동 생성)</span>
        </h3>
        {computed.recommendations.length === 0 ? (
          <p className="text-sm text-slate-500">추가 평가 완료 후 권장사항이 생성됩니다.</p>
        ) : (
          <ol className="space-y-3">
            {computed.recommendations.map((r: any, i: number) => (
              <li key={i} className="border-l-4 border-blue-500 pl-3 py-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <strong>{r.title}</strong>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    r.priority === 'critical' ? 'bg-red-600 text-white' :
                    r.priority === 'high' ? 'bg-orange-500 text-white' :
                    r.priority === 'medium' ? 'bg-yellow-400 text-slate-900' :
                    'bg-slate-300 text-slate-700'
                  }`}>{r.priority.toUpperCase()}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold text-white ${
                    r.source === 'ACSM' ? 'bg-blue-600' :
                    r.source === 'NSCA' ? 'bg-orange-600' :
                    r.source === 'NASM' ? 'bg-emerald-600' : 'bg-violet-600'
                  }`}>{r.source}</span>
                </div>
                <p className="text-sm text-slate-700 mt-1">{r.detail}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="card">
        <h3 className="font-bold mb-3">추가 메모 Notes</h3>
        <textarea
          className="input"
          rows={5}
          value={state.notes || ''}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="트레이너 소견, 특이사항, 다음 재검사일 등"
        />
      </div>

      <div className="card no-print">
        <h3 className="font-bold mb-3">검사 항목별 변화 추이</h3>
        <TrendCharts clientId={client.id} />
      </div>

      <div className="flex gap-2 flex-wrap no-print">
        <button onClick={printPage} className="btn-secondary">
          🖨️ 인쇄 / PDF 저장
        </button>
      </div>
    </div>
  );
}

// ========== UI helpers ==========

function Num({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  step?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type="number"
        inputMode="decimal"
        step={step || '1'}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        className="input"
      />
    </div>
  );
}

function ScoreSelector({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 py-1.5 text-sm border rounded ${
              value === n
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/10 rounded-lg p-3">
      <div className="text-[11px] opacity-80">{label}</div>
      <div className="text-base font-bold mt-0.5">{value}</div>
    </div>
  );
}

function goalLabel(v: string | null | undefined) {
  return (
    {
      health: '일반 건강',
      weight: '체중 관리',
      strength: '근력/근비대',
      performance: '경기력',
      rehab: '재활',
    }[v || ''] || '-'
  );
}

// ══════════ 기본/심화 접기 (운동목적별 프리셋) ══════════
interface TierProps {
  vis: (id: string) => boolean;
  open: boolean;
  hiddenNames: string[];
  toggle: () => void;
}

function AdvToggle({ tier }: { tier: TierProps }) {
  if (tier.hiddenNames.length === 0) return null;
  // 펼친 상태 — 이미 내용이 보이므로 차분하게
  if (tier.open) {
    return (
      <button
        type="button"
        onClick={tier.toggle}
        aria-expanded={true}
        className="w-full mb-4 py-2.5 px-4 rounded-lg text-sm font-semibold text-left transition"
        style={{ border: '1.5px solid #d6d6d6', color: '#555', background: '#fafafa' }}
      >
        <span aria-hidden="true">▲</span> 심화 검사 접기
      </button>
    );
  }
  // 접힌 상태 — 숨은 검사가 있음을 놓치지 않도록 강조 (트레이너 피드백: 눈에 안 띔)
  // 1행: 배지·제목·▼ / 2행: 검사명 칩 — 좁은 폭에서 ▼가 홀로 밀려나지 않게 행을 고정
  return (
    <button
      type="button"
      onClick={tier.toggle}
      aria-expanded={false}
      className="w-full mb-4 py-3 px-4 rounded-xl text-left transition flex flex-wrap items-center gap-x-2 gap-y-1.5 active:scale-[0.99]"
      style={{ border: '1.5px solid #111', background: '#fff', boxShadow: '0 1px 5px rgba(0,0,0,0.10)' }}
    >
      <span
        className="inline-flex items-center justify-center rounded-full text-xs font-bold shrink-0"
        style={{ background: '#111', color: '#fff', minWidth: 26, height: 26, padding: '0 7px' }}
      >
        +{tier.hiddenNames.length}
      </span>
      <span className="text-sm font-bold shrink-0" style={{ color: '#111' }}>
        심화 검사 펼치기
      </span>
      <span className="ml-auto text-sm font-bold shrink-0" style={{ color: '#111' }} aria-hidden="true">
        ▼
      </span>
      <span className="basis-full flex flex-wrap gap-1.5">
        {tier.hiddenNames.map((n) => (
          <span
            key={n}
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: '#f2f2f2', border: '1px solid #d6d6d6', color: '#333' }}
          >
            {n}
          </span>
        ))}
      </span>
    </button>
  );
}

// ══════════ 목차 — 시작 화면 (누르면 해당 검사로 이동) ══════════
function TocTab({ goal, goTab }: { goal?: string | null; goTab: (t: Tab) => void }) {
  const goalKey = goalKeyOf(goal);
  const goalText = goal && !(goal in GOAL_LABEL) ? goal : GOAL_LABEL[goalKey];
  const items: { id: Tab; no: string; title: string; desc: string }[] = [
    { id: 'client', no: '①', title: '기본/PAR-Q+', desc: '측정정보 · 사전문진 · 혈압/심박' },
    { id: 'composition', no: '②', title: '신체조성', desc: '인바디 · BMI · 둘레' },
    { id: 'posture', no: '③', title: '자세', desc: '정적자세 · 스케치 · 사진' },
    { id: 'movement', no: '④', title: '움직임', desc: 'OHSA · FMS' },
    { id: 'cardio', no: '⑤', title: '심폐지구력', desc: '5분 달리기 · VO₂max' },
    { id: 'strength', no: '⑥', title: '근력', desc: '악력 · 1RM' },
    { id: 'endurance', no: '⑦', title: '근지구력', desc: '푸시업 · 스쿼트 · 플랭크' },
    { id: 'summary', no: '⑧', title: '종합', desc: '요약 · 처방 방향 · 저장' },
  ];
  return (
    <div>
      <h2 className="text-xl font-bold mb-1">검사 목차</h2>
      <p className="text-sm text-slate-500 mb-4">
        항목을 누르면 해당 검사로 이동합니다. 운동목적 <b>{goalText}</b> 기준으로 핵심 검사만
        기본 표시되고, 나머지는 각 탭의 &lsquo;심화 검사 펼치기&rsquo;에 접혀 있습니다.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => goTab(it.id)}
            className="card text-left transition hover:shadow-md"
            style={{ marginBottom: 0, minHeight: 118 }}
          >
            <div className="text-lg font-black" style={{ color: '#111' }}>{it.no}</div>
            <div className="font-bold mt-0.5">{it.title}</div>
            <div className="text-xs text-slate-500 mt-1 leading-snug">{it.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ══════════ 자세 관찰 매트릭스 상수 ══════════
const POSTURE_COLS = [
  { key: 'foot', label: '발·발목' },
  { key: 'knee', label: '무릎' },
  { key: 'lphc', label: '골반·요추 (LPHC)' },
  { key: 'spine', label: '척추' },
  { key: 'shoulder', label: '어깨·견갑' },
  { key: 'head', label: '머리·경추' },
] as const;

function postureColOf(head: string): (typeof POSTURE_COLS)[number]['key'] {
  if (head.includes('발')) return 'foot';
  if (head.includes('무릎')) return 'knee';
  if (head.includes('LPHC')) return 'lphc';
  if (head.includes('척추')) return 'spine';
  if (head.includes('어깨') || head.includes('견갑')) return 'shoulder';
  return 'head';
}

const pmTh: React.CSSProperties = {
  border: '1px solid #e3e3e3',
  padding: '6px 8px',
  background: '#f0f0f0',
  fontSize: 12,
  fontWeight: 700,
  textAlign: 'left',
};
const pmTd: React.CSSProperties = {
  border: '1px solid #e3e3e3',
  padding: '8px',
  minWidth: 148,
};
