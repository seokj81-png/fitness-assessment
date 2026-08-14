'use client';

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';

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

function avgScore(classes: (string | undefined | null)[]): number {
  const valid = classes.filter(Boolean) as string[];
  if (!valid.length) return 0;
  return Math.round(valid.reduce((s, c) => s + clsScore(c), 0) / valid.length);
}

function fmsCls(total: number): Classification | undefined {
  if (!total) return undefined;
  if (total >= 18) return 'excellent';
  if (total >= 14) return 'good';
  if (total >= 11) return 'average';
  if (total >= 8) return 'below';
  return 'poor';
}

type Stat = { label: string; value: string | null; cls?: string };

function StatBubble({ label, value, cls }: Stat) {
  const score = cls ? clsScore(cls) : null;
  const color = clsColor(cls);
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center font-black text-base"
        style={{
          background: cls ? `${color}1a` : '#f0f0f0',
          border: `2.5px solid ${color}`,
          color: cls ? '#111111' : '#8a8a8a',
          boxShadow: 'none',
        }}
      >
        {score ?? '–'}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-slate-400 leading-none mb-0.5">{label}</div>
        <div className="text-xs text-white font-semibold truncate">{value ?? '–'}</div>
      </div>
    </div>
  );
}

function StatGroup({ title, stats }: { title: string; stats: Stat[] }) {
  return (
    <div className="mb-5">
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 border-b border-slate-700 pb-1">
        {title}
      </div>
      <div className="space-y-2.5">
        {stats.map((s) => (
          <StatBubble key={s.label} {...s} />
        ))}
      </div>
    </div>
  );
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

export default function FitnessScoreCard({ computed, state }: { computed: any; state: any }) {
  const fmsTotal = computed.fmsResult?.total ?? 0;
  const fmsClsVal = fmsCls(fmsTotal);

  const radarData = [
    {
      subject: '체성분',
      score: avgScore([computed.bmiClass?.classification, computed.bodyFat?.classification]),
    },
    {
      subject: '심폐체력',
      score: clsScore(computed.vo2max?.classification),
    },
    {
      subject: '근력',
      score: avgScore([
        computed.bpRatio?.classification,
        computed.sqRatio?.classification,
        computed.grip?.classification,
      ]),
    },
    {
      subject: '근지구력',
      score: avgScore([
        computed.pushup?.classification,
        computed.curlup?.classification,
        computed.plank?.frontClass?.classification,
      ]),
    },
    {
      subject: '움직임',
      score: fmsTotal > 0 ? Math.round((fmsTotal / 21) * 100) : 0,
    },
  ];

  const validScores = radarData.filter((d) => d.score > 0);
  const overallScore = validScores.length
    ? Math.round(validScores.reduce((s, d) => s + d.score, 0) / validScores.length)
    : 0;

  // 항목별 상세 레이더 — 카테고리 내부의 모든 항목 (미측정=0)
  const itemRadarData = [
    { subject: 'BMI', score: clsScore(computed.bmiClass?.classification) },
    { subject: '체지방률', score: clsScore(computed.bodyFat?.classification) },
    { subject: 'WHR', score: clsScore(computed.whrClass?.classification) },
    { subject: 'VO₂max', score: clsScore(computed.vo2max?.classification) },
    { subject: '안정심박', score: clsScore(computed.rhrClass?.classification) },
    { subject: '혈압', score: clsScore(computed.bpClass?.classification) },
    { subject: '벤치', score: clsScore(computed.bpRatio?.classification) },
    { subject: '스쿼트', score: clsScore(computed.sqRatio?.classification) },
    { subject: '데드', score: clsScore(computed.dlRatio?.classification) },
    { subject: '악력', score: clsScore(computed.grip?.classification) },
    { subject: '푸시업', score: clsScore(computed.pushup?.classification) },
    { subject: '풀업', score: clsScore(computed.pullup?.classification) },
    { subject: '컬업', score: clsScore(computed.curlup?.classification) },
    { subject: '스쿼트지구력', score: clsScore(computed.squatEnd?.classification) },
    { subject: '플랭크', score: clsScore(computed.plank?.frontClass?.classification) },
    { subject: 'FMS', score: fmsTotal > 0 ? Math.round((fmsTotal / 21) * 100) : 0 },
  ];

  const leftStats: { title: string; stats: Stat[] }[] = [
    {
      title: '체성분',
      stats: [
        {
          label: 'BMI',
          value: computed.bmiClass ? `${computed.bmiClass.value.toFixed(1)} kg/m²` : null,
          cls: computed.bmiClass?.classification,
        },
        {
          label: '체지방률',
          value: computed.bodyFat
            ? `${computed.bodyFat.value.toFixed(1)}%`
            : state.biaBf
            ? `${state.biaBf}%`
            : null,
          cls: computed.bodyFat?.classification,
        },
        {
          label: 'WHR',
          value: computed.whrClass ? computed.whrClass.value.toFixed(2) : null,
          cls: computed.whrClass?.classification,
        },
      ],
    },
    {
      title: '근력',
      stats: [
        {
          label: '벤치프레스 1RM',
          value: computed.bpRatio ? `체중비 ${computed.bpRatio.value.toFixed(2)}` : null,
          cls: computed.bpRatio?.classification,
        },
        {
          label: '스쿼트 1RM',
          value: computed.sqRatio ? `체중비 ${computed.sqRatio.value.toFixed(2)}` : null,
          cls: computed.sqRatio?.classification,
        },
        {
          label: '데드리프트 1RM',
          value: computed.dlRatio ? `체중비 ${computed.dlRatio.value.toFixed(2)}` : null,
          cls: computed.dlRatio?.classification,
        },
        {
          label: '악력 합산',
          value: computed.grip ? `${computed.grip.value.toFixed(0)} kg` : null,
          cls: computed.grip?.classification,
        },
      ],
    },
  ];

  const rightStats: { title: string; stats: Stat[] }[] = [
    {
      title: '심폐체력',
      stats: [
        {
          label: 'VO₂max',
          value: computed.vo2max ? `${computed.vo2max.value.toFixed(1)} ml/kg/min` : null,
          cls: computed.vo2max?.classification,
        },
        {
          label: '안정 심박수',
          value: computed.rhrClass ? `${computed.rhrClass.value} bpm` : null,
          cls: computed.rhrClass?.classification,
        },
        {
          label: '혈압',
          value: computed.bpClass ? `${state.sbp}/${state.dbp} mmHg` : null,
          cls: computed.bpClass?.classification,
        },
      ],
    },
    {
      title: '근지구력',
      stats: [
        {
          label: '푸시업',
          value: computed.pushup ? `${computed.pushup.value}회` : null,
          cls: computed.pushup?.classification,
        },
        {
          label: '풀업',
          value: computed.pullup ? `${computed.pullup.value}회` : null,
          cls: computed.pullup?.classification,
        },
        {
          label: '컬업',
          value: computed.curlup ? `${computed.curlup.value}회` : null,
          cls: computed.curlup?.classification,
        },
        {
          label: '스쿼트 지구력',
          value: computed.squatEnd ? `${computed.squatEnd.value}회` : null,
          cls: computed.squatEnd?.classification,
        },
        {
          label: '플랭크',
          value: computed.plank?.frontClass ? `${computed.plank.frontClass.value}초` : null,
          cls: computed.plank?.frontClass?.classification,
        },
      ],
    },
    {
      title: '움직임',
      stats: [
        {
          label: 'FMS 총점',
          value: fmsTotal > 0 ? `${fmsTotal} / 21` : null,
          cls: fmsClsVal,
        },
      ],
    },
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

      {/* Body */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-0">
        {/* Left */}
        <div className="p-5">
          {leftStats.map((g) => (
            <StatGroup key={g.title} title={g.title} stats={g.stats} />
          ))}
        </div>

        {/* Center */}
        <div className="flex flex-col items-center justify-start px-4 py-5 border-x border-slate-700/40 min-w-[200px]">
          <OverallCircle score={overallScore} />
          <div className="mt-4 w-full">
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                <PolarGrid stroke="#e9e9e9" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fontSize: 10, fill: '#555555' }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tickCount={3}
                  tick={{ fontSize: 9, fill: '#8a8a8a' }}
                />
                <Radar
                  dataKey="score"
                  stroke="#111111"
                  fill="#111111"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right */}
        <div className="p-5">
          {rightStats.map((g) => (
            <StatGroup key={g.title} title={g.title} stats={g.stats} />
          ))}
        </div>
      </div>

      {/* 항목별 상세 레이더 — 카테고리 내부 전 항목 */}
      <div className="px-5 pb-2 pt-4 border-t border-slate-700/50">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
          항목별 상세 레이더 <span className="normal-case font-medium">(미측정 항목은 0으로 표시)</span>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart data={itemRadarData} margin={{ top: 14, right: 40, left: 40, bottom: 14 }}>
            <PolarGrid stroke="#e9e9e9" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#555555' }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tickCount={3} tick={{ fontSize: 9, fill: '#8a8a8a' }} />
            <Radar dataKey="score" stroke="#111111" fill="#111111" fillOpacity={0.12} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
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
