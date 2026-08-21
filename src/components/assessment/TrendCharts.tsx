'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

type AssessmentRow = {
  id: string;
  date: string;
  bmi?: number | null;
  biaBf?: number | null;
  bodyFatSf?: number | null;
  vo2max?: number | null;
  rhr?: number | null;
  sbp?: number | null;
  dbp?: number | null;
  bp1rm?: number | null;
  sq1rm?: number | null;
  dl1rm?: number | null;
  ohp1rm?: number | null;
  pc1rm?: number | null;
  lp1rm?: number | null;
  gripR?: number | null;
  gripL?: number | null;
  pushupReps?: number | null;
  curlupReps?: number | null;
  plankFront?: number | null;
  fms?: string | null;
};

type ChartPoint = Record<string, number | string | null>;

function parseFms(raw: string | null | undefined): Record<string, number> {
  if (!raw) return {};
  try { return JSON.parse(raw) as Record<string, number>; } catch { return {}; }
}

function fmsScore(obj: Record<string, number>, id: string, bilateral: boolean): number | null {
  if (!bilateral) return obj[id] != null ? obj[id] : null;
  const r = obj[`${id}_r`];
  const l = obj[`${id}_l`];
  if (r == null && l == null) return null;
  return Math.min(r ?? l!, l ?? r!);
}

function parseFmsTotal(raw: string | null | undefined): number | null {
  const obj = parseFms(raw);
  // FMS 총점 = 검사별 점수 합 (양측 검사는 좌우 중 낮은 쪽) — 좌우를 모두 더하면 최대 36점으로 왜곡됨
  const tests: [string, boolean][] = [
    ['dsq', false], ['hs', true], ['lu', true], ['sm', true], ['aslr', true], ['tsp', false], ['rs', true],
  ];
  let total = 0; let hasAny = false;
  for (const [id, bilateral] of tests) {
    const v = fmsScore(obj, id, bilateral);
    if (v != null) { total += v; hasAny = true; }
  }
  return hasAny ? total : null;
}

function fmt(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear().toString().slice(2)}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

const FMS_RADAR_TESTS = [
  { id: 'dsq',  label: 'Deep Squat',    bilateral: false },
  { id: 'hs',   label: 'Hurdle Step',   bilateral: true },
  { id: 'lu',   label: 'Inline Lunge',  bilateral: true },
  { id: 'sm',   label: 'Shoulder Mob',  bilateral: true },
  { id: 'aslr', label: 'ASLR',          bilateral: true },
  { id: 'tsp',  label: 'Trunk Stability', bilateral: false },
  { id: 'rs',   label: 'Rotary Stability', bilateral: true },
];

const RADAR_COLORS = ['#111', '#555', '#999', '#333', '#6e6e6e'];
const RADAR_DASHES: (string | undefined)[] = [undefined, '6 3', '2 3', '8 3 2 3', '12 3'];

type LineConfig = { key: string; label: string; color: string; dash?: string };
type ChartConfig = { title: string; lines: LineConfig[] };

const LINE_CHARTS: ChartConfig[] = [
  {
    title: '체성분',
    lines: [
      { key: 'bmi',  label: 'BMI',         color: '#111' },
      { key: 'bf',   label: '체지방률 (%)', color: '#555', dash: '6 3' },
    ],
  },
  {
    title: '심폐 지구력',
    lines: [
      { key: 'vo2max', label: 'VO₂max (ml/kg/min)', color: '#111' },
      { key: 'rhr',    label: '안정 심박수 (bpm)',   color: '#555', dash: '6 3' },
    ],
  },
  {
    title: '혈압 (mmHg)',
    lines: [
      { key: 'sbp', label: '수축기 (SBP)', color: '#111' },
      { key: 'dbp', label: '이완기 (DBP)', color: '#555', dash: '6 3' },
    ],
  },
  {
    title: '근력 – 1RM (kg)',
    lines: [
      { key: 'bp1rm', label: '벤치프레스', color: '#111' },
      { key: 'sq1rm', label: '스쿼트',     color: '#555', dash: '6 3' },
      { key: 'dl1rm', label: '데드리프트', color: '#999', dash: '2 3' },
      { key: 'ohp1rm', label: 'OHP',       color: '#333', dash: '8 3 2 3' },
      { key: 'lp1rm', label: '레그프레스', color: '#6e6e6e', dash: '12 3' },
    ],
  },
  {
    title: '악력 (kg)',
    lines: [
      { key: 'gripR', label: '우측', color: '#111' },
      { key: 'gripL', label: '좌측', color: '#555', dash: '6 3' },
    ],
  },
  {
    title: '근지구력',
    lines: [
      { key: 'pushupReps',  label: '푸시업 (회)',  color: '#111' },
      { key: 'curlupReps',  label: '컬업 (회)',    color: '#555', dash: '6 3' },
      { key: 'plankFront',  label: '플랭크 (초)',  color: '#999', dash: '2 3' },
    ],
  },
  {
    title: 'FMS 총점',
    lines: [
      { key: 'fmsTotal', label: 'FMS 총점 (/21)', color: '#111' },
    ],
  },
];

function SingleLineChart({ config, data }: { config: ChartConfig; data: ChartPoint[] }) {
  const hasData = data.some((d) => config.lines.some((l) => d[l.key] != null));
  if (!hasData) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <h4 className="text-sm font-bold text-slate-700 mb-3">{config.title}</h4>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e9e9e9" />
          <XAxis dataKey="date" stroke="#8a8a8a" tick={{ fontSize: 11, fill: '#555' }} />
          <YAxis stroke="#8a8a8a" tick={{ fontSize: 11, fill: '#555' }} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #d6d6d6', backgroundColor: '#fff', color: '#111' }} />
          {config.lines.length > 1 && <Legend wrapperStyle={{ fontSize: 11, color: '#555' }} />}
          {config.lines.map((l) => (
            <Line isAnimationActive={false}
              key={l.key}
              type="monotone"
              dataKey={l.key}
              name={l.label}
              stroke={l.color}
              strokeWidth={2}
              strokeDasharray={l.dash}
              dot={{ r: 4, fill: l.color }}
              activeDot={{ r: 6, fill: l.color }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function FmsRadarChart({ assessments }: { assessments: AssessmentRow[] }) {
  const recent = assessments.slice(-Math.min(assessments.length, 3));
  const hasAny = recent.some((a) => {
    const obj = parseFms(a.fms);
    return FMS_RADAR_TESTS.some((t) => fmsScore(obj, t.id, t.bilateral) != null);
  });
  if (!hasAny) return null;

  const radarData = FMS_RADAR_TESTS.map((t) => {
    const point: Record<string, string | number> = { test: t.label };
    recent.forEach((a, i) => {
      const obj = parseFms(a.fms);
      const score = fmsScore(obj, t.id, t.bilateral);
      point[`assessment_${i}`] = score ?? 0;
    });
    return point;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 md:col-span-2">
      <h4 className="text-sm font-bold text-slate-700 mb-1">FMS 7-Test 레이더</h4>
      <p className="text-xs text-slate-400 mb-3">최근 {recent.length}회 비교 · 각 항목 최대 3점</p>
      <div className="flex justify-center">
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart data={radarData} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
            <PolarGrid stroke="#e9e9e9" />
            <PolarAngleAxis dataKey="test" tick={{ fontSize: 11, fill: '#555' }} />
            <PolarRadiusAxis angle={90} domain={[0, 3]} tickCount={4} tick={{ fontSize: 10, fill: '#8a8a8a' }} stroke="#8a8a8a" />
            {recent.map((a, i) => (
              <Radar
                key={a.id}
                name={fmt(a.date)}
                dataKey={`assessment_${i}`}
                stroke={RADAR_COLORS[i % RADAR_COLORS.length]}
                strokeDasharray={RADAR_DASHES[i % RADAR_DASHES.length]}
                fill={RADAR_COLORS[i % RADAR_COLORS.length]}
                fillOpacity={i === recent.length - 1 ? 0.25 : 0.08}
                strokeWidth={2}
              />
            ))}
            {recent.length > 1 && <Legend wrapperStyle={{ fontSize: 11, color: '#555' }} />}
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #d6d6d6', backgroundColor: '#fff', color: '#111' }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function TrendCharts({ clientId }: { clientId: string }) {
  const [rows, setRows] = useState<AssessmentRow[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/assessments?clientId=${clientId}`)
      .then((r) => r.json())
      .then((data: AssessmentRow[]) => {
        if (!Array.isArray(data)) { setRows([]); return; }
        setRows([...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      })
      .catch(() => setError(true));
  }, [clientId]);

  if (error) return null;
  if (rows === null) return <div className="text-sm text-slate-400 py-4 text-center">검사 이력 불러오는 중…</div>;
  if (rows.length < 2) return (
    <div className="text-sm text-slate-500 py-4 text-center">추세 그래프는 검사가 2회 이상 저장된 후 표시됩니다.</div>
  );

  const lineData: ChartPoint[] = rows.map((r) => ({
    date: fmt(r.date),
    bmi: r.bmi ?? null,
    bf: r.biaBf ?? r.bodyFatSf ?? null,
    vo2max: r.vo2max ?? null,
    rhr: r.rhr ?? null,
    sbp: r.sbp ?? null,
    dbp: r.dbp ?? null,
    bp1rm: r.bp1rm ?? null,
    sq1rm: r.sq1rm ?? null,
    dl1rm: r.dl1rm ?? null,
    ohp1rm: r.ohp1rm ?? null,
    lp1rm: r.lp1rm ?? null,
    gripR: r.gripR ?? null,
    gripL: r.gripL ?? null,
    pushupReps: r.pushupReps ?? null,
    curlupReps: r.curlupReps ?? null,
    plankFront: r.plankFront ?? null,
    fmsTotal: parseFmsTotal(r.fms),
  }));

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {LINE_CHARTS.map((c) => (
        <SingleLineChart key={c.title} config={c} data={lineData} />
      ))}
      <FmsRadarChart assessments={rows} />
    </div>
  );
}
