'use client';

import { useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  bmi,
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
  analyzePlank,
  PARQ_QUESTIONS,
  parqResult,
  matchPostureSyndromes,
  calcFMS,
  buildRecommendations,
} from '@/lib/calculations';
import { FMS_TESTS, POSTURE_SYNDROMES } from '@/lib/norms';
import type { AssessmentInput, Sex } from '@/lib/types';
import ResultBox from '@/components/ui/ResultBox';
import { pillClass } from './classification';
import BodyPostureViewer from './BodyPostureViewer';
import TrendCharts from './TrendCharts';
import FitnessScoreCard from './FitnessScoreCard';

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
  | 'client'
  | 'composition'
  | 'cardio'
  | 'strength'
  | 'endurance'
  | 'posture'
  | 'movement'
  | 'summary';

const TABS: { id: Tab; label: string }[] = [
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
  const age = useMemo(
    () =>
      client.dob
        ? Math.abs(new Date().getFullYear() - new Date(client.dob).getFullYear())
        : 0,
    [client.dob]
  );
  const weight = client.weight ?? 0;
  const height = client.height ?? 0;

  const [tab, setTab] = useState<Tab>('client');
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | undefined>(existing?.id);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [state, setState] = useState<FormState>(() => ({
    ...(existing || {}),
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

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setState((s) => {
      const next = { ...s, [key]: value };

      if (key === 'biaBf' && value != null && weight > 0) {
        const bf = value as number;
        const fm = Math.round(weight * (bf / 100) * 10) / 10;
        const ffm = Math.round((weight - fm) * 10) / 10;
        next.biaFm = fm;
        next.biaFfm = ffm;
        // Watson formula for TBW
        const a = age || 30;
        const tbw = sex === 'F'
          ? -2.097 + 0.1069 * height + 0.2466 * weight
          : 2.447 - 0.09156 * a + 0.1074 * height + 0.3362 * weight;
        next.biaTbw = Math.round(tbw * 10) / 10;
        const bmrBase = 10 * weight + 6.25 * height - 5 * a;
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
      'bmi','waist','hip','sf1','sf2','sf3','bodyFatSf',
      'biaBf','biaSmm','biaFm','biaFfm','biaBmr','biaTbw',
      'rockportTime','rockportHr','run15Time','run5minDist','cooperDist','stepHr','vo2max',
      'bp1rm','sq1rm','dl1rm','ohp1rm','pc1rm','lp1rm','gripR','gripL','est1rmW','est1rmReps',
      'pushupReps','ymcaBpReps','curlupReps','plankFront','plankR','plankL','sorensen',
      'postureFlags','fms','clearSh','clearExt','clearFlex','ohsaFlags','rom','fmsComments',
      'notes',
    ]);
    const payload: Record<string, unknown> = { clientId: client.id };
    for (const [k, v] of Object.entries(state)) {
      if (ALLOWED.has(k)) payload[k] = v;
    }
    payload.fmsComments = JSON.stringify(state.fmsComments ?? {});
    // Attach computed vo2max for quick display
    if (computed.vo2max) payload.vo2max = computed.vo2max.value;
    if (computed.bmiClass) payload.bmi = computed.bmiClass.value;

    // 첫 저장은 POST, 이후(savedId 있을 때)는 PATCH
    const currentId = savedId;
    const url = currentId ? `/api/assessments/${currentId}` : '/api/assessments';
    const method = currentId ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const saved = await res.json();
      const id = saved.id || currentId;
      setSavedId(id);
      if (exitAfter) {
        router.push(`/clients/${client.id}/assessment/${id}`);
        router.refresh();
      } else {
        setSavedAt(new Date());
        setSaving(false);
        router.refresh(); // 목록 카운터 등 갱신
      }
    } else {
      const errBody = await res.json().catch(() => ({}));
      alert(`저장 실패 (${res.status}): ${errBody?.error || res.statusText}`);
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

    let vo2max: ReturnType<typeof classifyVO2max> = null;
    if (state.rockportTime && state.rockportHr && weight && age && sex) {
      const v = rockportVO2max(state.rockportTime, state.rockportHr, weight, age, sex);
      vo2max = classifyVO2max(v, age, sex);
    } else if (state.run15Time) {
      vo2max = classifyVO2max(run15MileVO2max(state.run15Time), age, sex);
    } else if (state.run5minDist) {
      const t = riegel2400FromRun5min(state.run5minDist);
      if (t) vo2max = classifyVO2max(vo2maxFrom2400(t), age, sex);
    } else if (state.cooperDist) {
      vo2max = classifyVO2max(cooperVO2max(state.cooperDist), age, sex);
    }

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

    const pushup = state.pushupReps ? classifyPushup(state.pushupReps, age, sex) : null;
    const ymcaBp = state.ymcaBpReps ? classifyYMCABP(state.ymcaBpReps, age, sex) : null;
    const curlup = state.curlupReps ? classifyCurlup(state.curlupReps, age, sex) : null;
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

    const syndromes = matchPostureSyndromes(state.postureFlags || []);
    const fmsResult = calcFMS(state.fms || {}, {
      sh: state.clearSh,
      ext: state.clearExt,
      flex: state.clearFlex,
    });
    const parq = parqResult(state.parq || []);

    const recommendations = buildRecommendations({
      fmsTotal: fmsResult.total,
      fmsZeros: fmsResult.zeros,
      fmsAsym: fmsResult.asymmetries,
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
      stepClass,
      bpRatio, sqRatio, dlRatio, ohpRatio, pcRatio, lpRatio,
      grip,
      est1rm,
      pushup,
      ymcaBp,
      curlup,
      plank,
      syndromes,
      fmsResult,
      parq,
      recommendations,
    };
  }, [state, age, sex, weight, height, client.goal]);

  // ---------------- renders ----------------

  return (
    <>
    <div>
      {/* ── 글래스 헤더 (제목 + 탭) ── */}
      <div
        className="sticky top-[73px] z-30 mb-5 no-print rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(30,41,59,0.72) 0%, rgba(15,23,42,0.80) 100%)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          border: '1px solid rgba(148,163,184,0.12)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {/* 제목 영역 */}
        {pageTitle && (
          <div className="px-5 pt-4 pb-3 border-b border-white/[0.06]">
            {backHref && (
              <a href={backHref} className="text-xs text-blue-400 hover:text-blue-300 mb-1 inline-block">
                ← {backLabel}
              </a>
            )}
            <h2 className="text-xl font-bold text-white leading-tight">{pageTitle}</h2>
            {pageSubtitle && <p className="text-xs text-slate-400 mt-0.5">{pageSubtitle}</p>}
          </div>
        )}
        {/* 탭 네비게이션 */}
        <nav className="flex gap-1 overflow-x-auto p-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id
                  ? 'bg-blue-600/90 text-white shadow-md shadow-blue-900/40'
                  : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'client' && (
        <ClientTab state={state} update={update} parqResult={computed.parq} computed={computed} />
      )}
      {tab === 'composition' && (
        <CompositionTab state={state} update={update} computed={computed} height={height} weight={weight} />
      )}
      {tab === 'cardio' && (
        <CardioTab state={state} update={update} computed={computed} />
      )}
      {tab === 'strength' && (
        <StrengthTab state={state} update={update} computed={computed} weight={weight} />
      )}
      {tab === 'endurance' && (
        <EnduranceTab state={state} update={update} computed={computed} />
      )}
      {tab === 'posture' && (
        <PostureTab state={state} update={update} computed={computed} />
      )}
      {tab === 'movement' && (
        <MovementTab state={state} update={update} computed={computed} />
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
        background: 'rgba(15,23,42,0.97)',
        borderTop: '1px solid rgba(51,65,85,0.8)',
        backdropFilter: 'blur(8px)',
        padding: '12px 20px',
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* 저장 완료 토스트 */}
        <div
          className="text-sm font-medium text-emerald-400 flex items-center gap-1.5 transition-all duration-300"
          style={{ opacity: savedAt ? 1 : 0, transform: savedAt ? 'translateY(0)' : 'translateY(4px)' }}
        >
          {savedAt && (
            <>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
              저장됨 — {savedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              {!savedId && null}
            </>
          )}
        </div>

        <div className="flex gap-2 ml-auto">
          <button onClick={() => router.back()} className="btn-secondary text-sm px-4 py-2">
            취소
          </button>
          {/* 💾 저장 — 현재 페이지 유지 */}
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="btn-secondary text-sm px-4 py-2"
            style={{ borderColor: '#22c55e', color: '#22c55e' }}
          >
            {saving ? '저장 중...' : '💾 저장'}
          </button>
          {/* ✅ 저장 후 종료 — 결과 페이지로 이동 */}
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="btn-primary text-sm px-5 py-2"
          >
            {saving ? '저장 중...' : '✅ 저장 후 종료'}
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
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
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
          회원님 정보의 신장 {height} cm · 체중 {weight} kg 기준 자동 계산
        </p>
        <ResultBox result={computed.bmiClass} unit="kg/m²" />
        <p className="text-[11px] text-slate-500 mt-2">
          아시아-태평양 기준: 정상 18.5-22.9 · 과체중 23-24.9 · 비만 I 25-29.9 · 비만 II ≥30
        </p>
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
            <ResultBox result={computed.bodyFatClass} unit="%" />
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
  onChange: (decimalMin: number) => void;
}) {
  const min = decimalMin != null ? Math.floor(decimalMin) : '';
  const sec = decimalMin != null ? Math.round((decimalMin % 1) * 60) : '';

  const handle = (field: 'min' | 'sec', val: string) => {
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
  state,
  update,
  computed,
}: {
  state: FormState;
  update: TabProps['update'];
  computed: any;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">심폐지구력 평가 (ACSM)</h2>
      <div className="bg-amber-50 border-l-4 border-amber-400 text-amber-800 text-sm p-3 mb-4">
        ⚠ 최대하/최대 검사 전 PAR-Q+ 통과 및 안정시 혈압/심박수 확인 필수.
      </div>

      <div className="card">
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
        {state.rockportTime && state.rockportHr && computed.vo2max && (
          <ResultBox result={computed.vo2max} unit="ml/kg/min" />
        )}
      </div>

      <div className="card">
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

      <div className="card">
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
          <ResultBox result={computed.vo2max} unit="ml/kg/min" />
        </div>
      )}
    </div>
  );
}

function StrengthTab({
  state,
  update,
  computed,
  weight,
}: {
  state: FormState;
  update: TabProps['update'];
  computed: any;
  weight: number;
}) {
  const ratio = (v?: number) => (v && weight ? (v / weight).toFixed(2) : '-');
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">근력 평가 (NSCA)</h2>
      <div className="bg-amber-50 border-l-4 border-amber-400 text-amber-800 text-sm p-3 mb-4">
        ⚠ 1RM 직접 검사 전 NSCA 권장 준비운동(5-10→3-5→2-3 세트) 프로토콜 준수.
      </div>

      <div className="card">
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

      <div className="card">
        <h3 className="font-bold mb-2">
          다중반복 1RM 추정 <span className="guideline-tag tag-nsca">NSCA</span>
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          10RM 이하의 무게로 실패까지 수행 (초급·고위험군에 적합)
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
  state,
  update,
  computed,
}: {
  state: FormState;
  update: TabProps['update'];
  computed: any;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">근지구력 평가 (NSCA · ACSM)</h2>

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

      <div className="card">
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

      <div className="card">
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

// Static posture checkpoint definitions
const POSTURE_SECTIONS = [
  {
    title: '전면 관찰 Anterior View',
    groups: [
      { head: '발·발목', items: [
        ['ant_foot_flat', '편평발'],
        ['ant_foot_ext', '외회전'],
        ['ant_foot_pron', '회내'],
      ] },
      { head: '무릎', items: [
        ['ant_knee_varus', '내반 (O다리)'],
        ['ant_knee_valgus', '외반 (X다리)'],
      ] },
      { head: 'LPHC', items: [
        ['ant_lphc_asis', 'ASIS 비대칭'],
        ['ant_lphc_rot', '골반 회전'],
      ] },
      { head: '어깨', items: [
        ['ant_sh_elev', '좌우 높이 차이'],
        ['ant_sh_prot', '견갑 전인'],
      ] },
      { head: '머리·경추', items: [
        ['ant_head_tilt', '머리 측방 경사'],
        ['ant_head_rot', '머리 회전'],
      ] },
    ],
  },
  {
    title: '측면 관찰 Lateral View',
    groups: [
      { head: '발·발목', items: [['lat_foot_heel', '발뒤꿈치 들림']] },
      { head: '무릎', items: [
        ['lat_knee_hyperext', '과신전'],
        ['lat_knee_flex', '굴곡'],
      ] },
      { head: 'LPHC', items: [
        ['lat_lphc_ant', '골반 전방경사'],
        ['lat_lphc_post', '골반 후방경사'],
        ['lat_lphc_sway', 'Sway-back'],
      ] },
      { head: '어깨·흉추', items: [
        ['lat_sh_kyph', '흉추 과후만'],
        ['lat_sh_round', '둥근어깨'],
      ] },
      { head: '머리', items: [['lat_head_fwd', '거북목 (Forward head)']] },
    ],
  },
  {
    title: '후면 관찰 Posterior View',
    groups: [
      { head: '발·발목', items: [['post_foot_pron', '뒤꿈치 외반']] },
      { head: 'LPHC', items: [
        ['post_lphc_psis', 'PSIS 비대칭'],
        ['post_lphc_trend', 'Trendelenburg'],
      ] },
      { head: '척추', items: [['post_spine_scol', '측만 Scoliosis 의심']] },
      { head: '견갑', items: [
        ['post_scap_wing', '익상견갑 Winging'],
        ['post_scap_elev', '견갑 거상'],
      ] },
    ],
  },
];

function PostureTab({
  state,
  update,
  computed,
}: {
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

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">정적 자세 평가 (NASM)</h2>
      <BodyPostureViewer />
      <p className="text-sm text-slate-600 mb-4">
        5 Kinetic Chain Checkpoints × 3 View — 관찰된 편차를 체크하면 NASM 자세 증후군이 자동 매칭됩니다.
      </p>

      {POSTURE_SECTIONS.map((sec) => (
        <div key={sec.title} className="card">
          <h3 className="font-bold mb-3">
            {sec.title} <span className="guideline-tag tag-nasm">NASM</span>
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            {sec.groups.map((g) => (
              <div key={g.head} className="border border-slate-700 rounded-lg p-3 bg-slate-800">
                <h4 className="text-sm font-bold mb-2">{g.head}</h4>
                <div className="space-y-1">
                  {g.items.map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={has(key)}
                        onChange={() => toggle(key)}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

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
    </div>
  );
}

function MovementTab({
  state,
  update,
  computed,
}: {
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

      <div className="card">
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

      <div className="card">
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
        <p className="text-xs text-slate-500 mb-3">5회 반복 중 관찰된 보상 패턴 체크</p>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            ['oh_foot_flat', '발 편평·외회전'],
            ['oh_knee_var', '무릎 내반 (Varus)'],
            ['oh_knee_valg', '무릎 외반 (Valgus)'],
            ['oh_low_back', '요추 과도 아치'],
            ['oh_torso_lean', '상체 과도 전경'],
            ['oh_arms_fall', '팔 전방 낙하'],
            ['oh_heel_rise', '뒤꿈치 들림'],
            ['oh_asym_shift', '좌우 비대칭 이동'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm border border-slate-700 rounded p-2 bg-slate-800">
              <input type="checkbox" checked={ohsaHas(key)} onChange={() => ohsaToggle(key)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="font-bold mb-3">
          Single-Leg Squat · Push · Pull <span className="guideline-tag tag-nasm">NASM</span>
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { group: 'Single-Leg Squat', items: [
              ['sl_knee_valg', '지지 무릎 내반'],
              ['sl_hip_drop', 'Trendelenburg'],
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
          <SummaryItem label="FMS" value={`${computed.fmsResult.total}/21`} />
          <SummaryItem label="목적" value={goalLabel(client.goal)} />
        </div>
      </div>

      <FitnessScoreCard computed={computed} state={state} />

      <div className="card">
        <h3 className="font-bold mb-3">자세·움직임</h3>
        <ul className="text-sm space-y-1.5">
          <li>• FMS 총점 {computed.fmsResult.total}/21 · 0점 {computed.fmsResult.zeros}개 · 비대칭 {computed.fmsResult.asymmetries}개</li>
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
        <button onClick={() => window.print()} className="btn-secondary">
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
