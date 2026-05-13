'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface AssessmentRow {
  id: string;
  date: string; // ISO string
  bmi: number | null;
  vo2max: number | null;
  fms: string | null;
  biaBf: number | null;
  bodyFatSf: number | null;
  rhr: number | null;
  sbp: number | null;
  dbp: number | null;
  gripR: number | null;
  gripL: number | null;
  bp1rm: number | null;
  sq1rm: number | null;
  pushupReps: number | null;
  plankFront: number | null;
}

function calcFmsTotal(raw: string | null): number | null {
  if (!raw) return null;
  try {
    const fms = JSON.parse(raw) as Record<string, number>;
    const nonBilateral = ['dsq', 'tsp'];
    const bilateral = ['hs', 'lu', 'sm', 'aslr', 'rs'];
    const nb = nonBilateral.reduce((s, k) => s + (fms[k] ?? 0), 0);
    const b = bilateral.reduce((s, id) => {
      const r = fms[`${id}_r`];
      const l = fms[`${id}_l`];
      return s + (r != null && l != null ? Math.min(r, l) : 0);
    }, 0);
    return nb + b;
  } catch {
    return null;
  }
}

// Custom tooltip
function ChartTooltip({
  active,
  payload,
  label,
  unit,
  metricLabel,
  color,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  unit: string;
  metricLabel: string;
  color: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: '#0f172a',
        border: '1px solid #334155',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 12,
      }}
    >
      <p style={{ color: '#94a3b8', marginBottom: 2 }}>{label}</p>
      <p style={{ color, fontWeight: 700 }}>
        {payload[0].value.toFixed(1)}{unit}
        <span style={{ color: '#64748b', fontWeight: 400, marginLeft: 4 }}>{metricLabel}</span>
      </p>
    </div>
  );
}

interface ChartConfig {
  key: string;
  label: string;
  color: string;
  unit: string;
  domain?: [number | 'auto', number | 'auto'];
  refLine?: { value: number; label: string; color: string }[];
}

export default function TrendCharts({ assessments }: { assessments: AssessmentRow[] }) {
  // Sort oldest → newest for charts
  const data = useMemo(() => {
    return [...assessments]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((a) => {
        const grip =
          a.gripR != null && a.gripL != null
            ? (a.gripR + a.gripL) / 2
            : (a.gripR ?? a.gripL ?? null);
        return {
          date: new Date(a.date).toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric',
          }),
          bmi: a.bmi,
          vo2max: a.vo2max,
          fms: calcFmsTotal(a.fms),
          bodyFat: a.biaBf ?? a.bodyFatSf,
          rhr: a.rhr,
          sbp: a.sbp,
          dbp: a.dbp,
          grip,
          bench: a.bp1rm,
          squat: a.sq1rm,
          pushup: a.pushupReps,
          plank: a.plankFront,
        };
      });
  }, [assessments]);

  const charts: ChartConfig[] = [
    data.some((d) => d.bmi != null) && {
      key: 'bmi',
      label: 'BMI',
      color: '#f59e0b',
      unit: '',
      domain: [14, 38],
      refLine: [
        { value: 18.5, label: '저체중', color: '#64748b' },
        { value: 23, label: '정상', color: '#22c55e' },
        { value: 25, label: '과체중', color: '#f59e0b' },
        { value: 30, label: '비만', color: '#ef4444' },
      ],
    },
    data.some((d) => d.bodyFat != null) && {
      key: 'bodyFat',
      label: '체지방률 (%)',
      color: '#f97316',
      unit: '%',
      domain: ['auto', 'auto'],
    },
    data.some((d) => d.vo2max != null) && {
      key: 'vo2max',
      label: 'VO₂max (mL/kg/min)',
      color: '#3b82f6',
      unit: '',
      domain: ['auto', 'auto'],
    },
    data.some((d) => d.fms != null) && {
      key: 'fms',
      label: 'FMS 총점 (/21)',
      color: '#8b5cf6',
      unit: '',
      domain: [0, 21],
      refLine: [{ value: 14, label: '부상위험', color: '#ef4444' }],
    },
    data.some((d) => d.rhr != null) && {
      key: 'rhr',
      label: '안정시 심박수 (bpm)',
      color: '#10b981',
      unit: '',
      domain: ['auto', 'auto'],
    },
    data.some((d) => d.grip != null) && {
      key: 'grip',
      label: '악력 평균 (kg)',
      color: '#ec4899',
      unit: '',
      domain: ['auto', 'auto'],
    },
    data.some((d) => d.bench != null) && {
      key: 'bench',
      label: '벤치프레스 1RM (kg)',
      color: '#06b6d4',
      unit: '',
      domain: ['auto', 'auto'],
    },
    data.some((d) => d.squat != null) && {
      key: 'squat',
      label: '스쿼트 1RM (kg)',
      color: '#84cc16',
      unit: '',
      domain: ['auto', 'auto'],
    },
    data.some((d) => d.pushup != null) && {
      key: 'pushup',
      label: '푸시업 (회)',
      color: '#a78bfa',
      unit: '',
      domain: ['auto', 'auto'],
    },
    data.some((d) => d.plank != null) && {
      key: 'plank',
      label: '플랭크 (초)',
      color: '#fb923c',
      unit: '',
      domain: ['auto', 'auto'],
    },
  ].filter(Boolean) as ChartConfig[];

  if (charts.length === 0) return null;

  const colClass =
    charts.length === 1
      ? 'grid-cols-1'
      : charts.length === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : 'grid-cols-1 md:grid-cols-2';

  return (
    <div
      className="mt-5 rounded-2xl p-5"
      style={{
        background: 'rgba(15,23,42,0.85)',
        border: '1px solid rgba(51,65,85,0.6)',
      }}
    >
      <h3 className="font-bold text-slate-100 mb-4 flex items-center gap-2">
        <span className="text-blue-400">📈</span> 측정 항목별 변화 추이
        <span className="text-xs font-normal text-slate-500 ml-1">({assessments.length}회 측정)</span>
      </h3>

      <div className={`grid ${colClass} gap-4`}>
        {charts.map(({ key, label, color, unit, domain, refLine }) => (
          <div
            key={key}
            className="rounded-xl p-4"
            style={{
              background: 'rgba(30,41,59,0.6)',
              border: '1px solid rgba(71,85,105,0.4)',
            }}
          >
            <div
              className="text-xs font-semibold mb-3 uppercase tracking-wide"
              style={{ color }}
            >
              {label}
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={data} margin={{ top: 5, right: 10, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.5)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis
                  domain={domain}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  content={
                    <ChartTooltip unit={unit} metricLabel={label} color={color} />
                  }
                />
                {refLine?.map((r) => (
                  <ReferenceLine
                    key={r.value}
                    y={r.value}
                    stroke={r.color}
                    strokeDasharray="4 4"
                    strokeWidth={1}
                    label={{
                      value: r.label,
                      position: 'right',
                      fontSize: 9,
                      fill: r.color,
                    }}
                  />
                ))}
                <Line
                  type="monotone"
                  dataKey={key}
                  stroke={color}
                  strokeWidth={2.5}
                  dot={{ fill: color, r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, stroke: color, strokeWidth: 2, fill: '#0f172a' }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </div>
  );
}
