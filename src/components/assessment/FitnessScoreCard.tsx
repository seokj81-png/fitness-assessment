'use client';

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { breathScreen } from '@/lib/calculations';

type Classification = 'excellent' | 'good' | 'average' | 'below' | 'poor';

function clsScore(cls?: string): number {
  const m: Record<string, number> = { excellent: 92, good: 76, average: 60, below: 44, poor: 28 };
  return cls ? (m[cls] ?? 0) : 0;
}

function clsColor(cls?: string): string {
  const m: Record<string, string> = {
    excellent: '#111111',
    good: '#555555',
    average: '#8a8a8a',
    below: '#9a9a9a',
    poor: '#c4c4c4',
  };
  return m[cls ?? ''] ?? '#c4c4c4';
}

function fmsCls(total: number): Classification | undefined {
  if (!total) return undefined;
  if (total >= 18) return 'excellent';
  if (total >= 14) return 'good';
  if (total >= 11) return 'average';
  if (total >= 8) return 'below';
  return 'poor';
}

// 보상/이상 소견 개수 → 점수 (적을수록 좋음)
function flagScore(n: number): number {
  if (n === 0) return 92;
  if (n <= 2) return 76;
  if (n <= 4) return 60;
  if (n <= 6) return 44;
  return 28;
}

function OverallCircle({ score }: { score: number }) {
  const color = score >= 80 ? '#111111' : score >= 65 ? '#333333' : score >= 50 ? '#555555' : score >= 35 ? '#8a8a8a' : '#9a9a9a';
  const label = score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 50 ? 'Average' : score >= 35 ? 'Below Avg' : 'Poor';
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#e9e9e9" strokeWidth="8" />
          <circle
            cx="50" cy="50" r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-white leading-none">{score}</span>
        </div>
      </div>
      <span className="mt-1 text-xs font-bold" style={{ color }}>{label}</span>
      <span className="text-[10px] text-slate-500 mt-0.5">종합 체력 점수</span>
    </div>
  );
}

interface MiniItem {
  subject: string;
  score: number;
  display: string | null; // 실측값 표기 (null=미측정)
}

// 카테고리별 하위 요인 미니 레이더 + 실측값 목록
function MiniRadar({ title, items, note }: { title: string; items: MiniItem[]; note?: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: '#fff', border: '1px solid #e3e3e3' }}>
      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-700 pb-1 mb-1">
        {title}
      </div>
      <ResponsiveContainer width="100%" height={170}>
        <RadarChart data={items} margin={{ top: 10, right: 28, left: 28, bottom: 6 }}>
          <PolarGrid stroke="#e9e9e9" />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#555555' }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tickCount={3} tick={{ fontSize: 8, fill: '#c4c4c4' }} />
          <Radar dataKey="score" stroke="#111111" fill="#111111" fillOpacity={0.14} strokeWidth={2} />
        </RadarChart>
      </ResponsiveContainer>
      <div className="mt-1 space-y-0.5">
        {items.map((i) => (
          <div key={i.subject} className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">{i.subject}</span>
            <span className="font-semibold tabular-nums" style={{ color: i.display ? '#111' : '#c4c4c4' }}>
              {i.display ?? '미측정'}
            </span>
          </div>
        ))}
      </div>
      {note && <p className="text-[10px] mt-1.5" style={{ color: '#9a9a9a' }}>{note}</p>}
    </div>
  );
}

export default function FitnessScoreCard({ computed, state }: { computed: any; state: any }) {
  const fmsTotal = computed.fmsResult?.total ?? 0;
  const fmsClsVal = fmsCls(fmsTotal);

  // ── 플래그 카운트 ──
  const postureFlags: string[] = state.postureFlags ?? [];
  const ohsaFlags: string[] = state.ohsaFlags ?? [];
  const antCnt = postureFlags.filter((k) => k.startsWith('ant_')).length;
  const latCnt = postureFlags.filter((k) => k.startsWith('lat_')).length;
  const postCnt = postureFlags.filter((k) => k.startsWith('post_')).length;
  const ohCnt = ohsaFlags.filter((k) => k.startsWith('oh_')).length;
  const slCnt = ohsaFlags.filter((k) => k.startsWith('sl_')).length;
  const ppCnt = ohsaFlags.filter((k) => k.startsWith('pu_') || k.startsWith('pl_')).length;

  // ── 호흡 (자세 카테고리 하위) ──
  const breath = breathScreen({
    frc: state.breathFrc,
    tlc: state.breathTlc,
    q: state.breathQ,
    hiLo: state.breathHiLo,
  });
  const breathScore =
    breath?.overall === 'green' ? 92 : breath?.overall === 'yellow' ? 60 : breath?.overall === 'red' ? 28 : 0;

  // ── 점수 계산 ──
  const bfScore = clsScore(computed.bodyFat?.classification);
  const bmiScore = clsScore(computed.bmiClass?.classification);
  const strengthScores = [
    computed.bpRatio?.classification,
    computed.sqRatio?.classification,
    computed.dlRatio?.classification,
    computed.grip?.classification,
  ].filter(Boolean) as string[];
  const enduranceScores = [
    computed.pushup?.classification,
    computed.pullup?.classification,
    computed.curlup?.classification,
    computed.squatEnd?.classification,
    computed.plank?.frontClass?.classification,
  ].filter(Boolean) as string[];
  const avg = (arr: string[]) =>
    arr.length ? Math.round(arr.reduce((s, c) => s + clsScore(c), 0) / arr.length) : 0;
  const postureScore = flagScore(antCnt + latCnt + postCnt); // 이상 소견 적을수록 우수 (0건=양호)

  // ── 카테고리 종합 레이더 (6각) — 신체조성 기준은 체지방률 ──
  const radarData = [
    { subject: '신체조성', score: bfScore || bmiScore }, // 체지방률 우선, 없으면 BMI
    { subject: '심폐체력', score: clsScore(computed.vo2max?.classification) },
    { subject: '근력', score: avg(strengthScores) },
    { subject: '근지구력', score: avg(enduranceScores) },
    { subject: '움직임', score: fmsTotal > 0 ? Math.round((fmsTotal / 21) * 100) : 0 },
    { subject: '자세', score: postureScore },
  ];

  const validScores = radarData.filter((d) => d.score > 0);
  const overallScore = validScores.length
    ? Math.round(validScores.reduce((s, d) => s + d.score, 0) / validScores.length)
    : 0;

  // ── 카테고리별 하위 요인 미니 레이더 데이터 ──
  const fmt = (v: number | null | undefined, unit: string, digits = 1) =>
    v != null ? `${Number(v).toFixed(digits).replace(/\.0$/, '')}${unit}` : null;

  const bodyItems: MiniItem[] = [
    { subject: '체중', score: state.weight != null ? bmiScore : 0, display: fmt(state.weight, 'kg') },
    { subject: 'BMI', score: bmiScore, display: computed.bmiClass ? computed.bmiClass.value.toFixed(1) : null },
    { subject: '제지방량', score: state.biaFfm != null ? bfScore : 0, display: fmt(state.biaFfm, 'kg') },
    { subject: '체지방량', score: state.biaFm != null ? bfScore : 0, display: fmt(state.biaFm, 'kg') },
    { subject: '체지방률', score: bfScore, display: computed.bodyFat ? `${computed.bodyFat.value.toFixed(1)}%` : null },
  ];

  const cardioItems: MiniItem[] = [
    { subject: 'VO₂max', score: clsScore(computed.vo2max?.classification), display: computed.vo2max ? computed.vo2max.value.toFixed(1) : null },
    { subject: '안정 심박', score: clsScore(computed.rhrClass?.classification), display: computed.rhrClass ? `${computed.rhrClass.value}bpm` : null },
    { subject: '혈압', score: clsScore(computed.bpClass?.classification), display: computed.bpClass ? `${state.sbp}/${state.dbp}` : null },
  ];

  const strengthItems: MiniItem[] = [
    { subject: '벤치', score: clsScore(computed.bpRatio?.classification), display: computed.bpRatio ? `×${computed.bpRatio.value.toFixed(2)}` : null },
    { subject: '스쿼트', score: clsScore(computed.sqRatio?.classification), display: computed.sqRatio ? `×${computed.sqRatio.value.toFixed(2)}` : null },
    { subject: '데드리프트', score: clsScore(computed.dlRatio?.classification), display: computed.dlRatio ? `×${computed.dlRatio.value.toFixed(2)}` : null },
    { subject: '악력', score: clsScore(computed.grip?.classification), display: computed.grip ? `${computed.grip.value.toFixed(0)}kg` : null },
  ];

  const enduranceItems: MiniItem[] = [
    { subject: '푸시업', score: clsScore(computed.pushup?.classification), display: computed.pushup ? `${computed.pushup.value}회` : null },
    { subject: '풀업', score: clsScore(computed.pullup?.classification), display: computed.pullup ? `${computed.pullup.value}회` : null },
    { subject: '컬업', score: clsScore(computed.curlup?.classification), display: computed.curlup ? `${computed.curlup.value}회` : null },
    { subject: '스쿼트지구력', score: clsScore(computed.squatEnd?.classification), display: computed.squatEnd ? `${computed.squatEnd.value}회` : null },
    { subject: '플랭크', score: clsScore(computed.plank?.frontClass?.classification), display: computed.plank?.frontClass ? `${computed.plank.frontClass.value}초` : null },
  ];

  const movementItems: MiniItem[] = [
    { subject: 'FMS', score: fmsTotal > 0 ? Math.round((fmsTotal / 21) * 100) : 0, display: fmsTotal > 0 ? `${fmsTotal}/21` : null },
    { subject: '오버헤드 스쿼트', score: flagScore(ohCnt), display: `보상 ${ohCnt}건` },
    { subject: '싱글레그', score: flagScore(slCnt), display: `보상 ${slCnt}건` },
    { subject: '푸시·풀', score: flagScore(ppCnt), display: `보상 ${ppCnt}건` },
  ];

  const postureItems: MiniItem[] = [
    { subject: '전면', score: flagScore(antCnt), display: `이상 ${antCnt}건` },
    { subject: '측면', score: flagScore(latCnt), display: `이상 ${latCnt}건` },
    { subject: '후면', score: flagScore(postCnt), display: `이상 ${postCnt}건` },
    { subject: '호흡', score: breathScore, display: breath?.overall ? breath.overall.toUpperCase() : null },
  ];

  const categories = [
    { title: '신체조성', items: bodyItems, note: '체중·제지방량·체지방량 점수는 BMI/체지방률 등급 기준 환산' },
    { title: '심폐체력', items: cardioItems },
    { title: '근력 (1RM 체중비)', items: strengthItems },
    { title: '근지구력', items: enduranceItems },
    { title: '움직임', items: movementItems, note: '보상·이상 소견이 적을수록 점수 높음' },
    { title: '자세', items: postureItems, note: '이상 소견이 적을수록 점수 높음 · 호흡=FMS Breathing Screen' },
  ];

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: '#ffffff',
        boxShadow: '0 0 0 1px #e3e3e3',
      }}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-2 border-b border-slate-700/50">
        <h3 className="text-sm font-bold text-slate-300 tracking-wider uppercase">체력요인 결과</h3>
      </div>

      {/* 종합 점수 + 카테고리 6각 레이더 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-center px-5 py-5 border-b border-slate-700/40">
        <div className="flex justify-center">
          <OverallCircle score={overallScore} />
        </div>
        <div>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData} margin={{ top: 12, right: 34, left: 34, bottom: 12 }}>
              <PolarGrid stroke="#e9e9e9" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#555555' }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tickCount={3} tick={{ fontSize: 9, fill: '#8a8a8a' }} />
              <Radar dataKey="score" stroke="#111111" fill="#111111" fillOpacity={0.15} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-center" style={{ color: '#9a9a9a' }}>
            신체조성 기준: 체지방률 등급
          </p>
        </div>
      </div>

      {/* 카테고리별 하위 요인 미니 레이더 */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {categories.map((c) => (
          <MiniRadar key={c.title} title={c.title} items={c.items} note={c.note} />
        ))}
      </div>

      {/* Legend */}
      <div className="px-5 pb-4 flex flex-wrap gap-3 border-t border-slate-700/50 pt-3">
        {[
          { cls: 'excellent', label: '매우우수 (92+)' },
          { cls: 'good',      label: '우수 (76+)' },
          { cls: 'average',   label: '평균 (60+)' },
          { cls: 'below',     label: '평균 미만 (44+)' },
          { cls: 'poor',      label: '불량 (~28)' },
        ].map(({ cls, label }) => (
          <div key={cls} className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: clsColor(cls) }}
            />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
