'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Customized,
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

type DataPoint = Record<string, number | string | null>;

function calcFmsTotal(raw: string | null): number | null {
  if (!raw) return null;
  try {
    const fms = JSON.parse(raw) as Record<string, number>;
    const clamp = (v: number | undefined) =>
      v !== undefined ? Math.max(0, Math.min(3, Math.round(v))) : undefined;
    const nonBilateral = ['dsq', 'tsp'];
    const bilateral = ['hs', 'lu', 'sm', 'aslr', 'rs'];
    const nb = nonBilateral.reduce((s, k) => {
      const v = clamp(fms[k]);
      return s + (v ?? 0);
    }, 0);
    const b = bilateral.reduce((s, id) => {
      const r = clamp(fms[`${id}_r`]);
      const l = clamp(fms[`${id}_l`]);
      return s + (r != null && l != null ? Math.min(r, l) : 0);
    }, 0);
    return Math.min(nb + b, 21);
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
        border: `1px solid ${color}55`,
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      }}
    >
      <p style={{ color: '#94a3b8', marginBottom: 3 }}>{label}</p>
      <p style={{ color, fontWeight: 700, fontSize: 14 }}>
        {payload[0].value.toFixed(1)}
        {unit && <span style={{ fontSize: 11, marginLeft: 2 }}>{unit}</span>}
        <span style={{ color: '#64748b', fontWeight: 400, marginLeft: 6, fontSize: 11 }}>
          {metricLabel}
        </span>
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

// Individual chart with hover-Y tracking
function SingleChart({
  config,
  data,
}: {
  config: ChartConfig;
  data: DataPoint[];
}) {
  const { key, label, color, unit, domain, refLine } = config;
  const [activeY, setActiveY] = useState<number | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMouseMove = useCallback((e: any) => {
    if (e?.activePayload?.[0]?.value != null) {
      setActiveY(e.activePayload[0].value as number);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setActiveY(null);
  }, []);

  return (
    <div
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
      <ResponsiveContainer width="100%" height={160}>
        <LineChart
          data={data}
          margin={{ top: 6, right: 16, left: 4, bottom: 0 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.5)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={{ stroke: '#334155' }}
          />
          <YAxis
            domain={domain}
            tick={{ fontSize: 11, fill: '#cbd5e1' }}
            tickLine={false}
            axisLine={false}
            width={42}
            tickFormatter={(v: number) =>
              Number.isInteger(v) ? String(v) : v.toFixed(1)
            }
          />
          <Tooltip
            content={
              <ChartTooltip unit={unit} metricLabel={label} color={color} />
            }
            cursor={{ stroke: 'rgba(148,163,184,0.25)', strokeWidth: 1 }}
          />

          {/* Static reference lines */}
          {refLine?.map((r) => (
            <ReferenceLine
              key={r.value}
              y={r.value}
              stroke={r.color}
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{
                value: r.label,
                position: 'insideTopRight',
                fontSize: 9,
                fill: r.color,
              }}
            />
          ))}

          {/* Dynamic horizontal crosshair line */}
          {activeY != null && (
            <ReferenceLine
              y={activeY}
              stroke={color}
              strokeDasharray="3 3"
              strokeWidth={1}
              strokeOpacity={0.6}
            />
          )}

          {/* Y-axis value badge rendered directly on the axis */}
          {activeY != null && (
            <Customized
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              component={(props: any) => {
                const yAxisMap = props.yAxisMap || {};
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const yAxis: any = yAxisMap[0] ?? Object.values(yAxisMap)[0];
                if (!yAxis?.scale) return null;
                const yPx = yAxis.scale(activeY);
                const ax = yAxis.x ?? 0;
                const aw = yAxis.width ?? 42;
                const label = Number.isInteger(activeY)
                  ? String(activeY)
                  : activeY.toFixed(1);
                return (
                  <g>
                    <rect
                      x={ax + 1}
                      y={yPx - 9}
                      width={aw - 2}
                      height={18}
                      fill={color}
                      opacity={0.18}
                      rx={3}
                    />
                    <text
                      x={ax + aw - 3}
                      y={yPx + 4}
                      textAnchor="end"
                      fontSize={11}
                      fill={color}
                      fontWeight={700}
                    >
                      {label}
                    </text>
                  </g>
                );
              }}
            />
          )}

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
  );
}

export default function TrendCharts({ assessments }: { assessments: AssessmentRow[] }) {
  // Sort oldest → newest for charts
  const data = useMemo<DataPoint[]>(() => {
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
      domain: [14, 38] as [number, number],
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
      domain: ['auto', 'auto'] as ['auto', 'auto'],
    },
    data.some((d) => d.vo2max != null) && {
      key: 'vo2max',
      label: 'VO₂max (mL/kg/min)',
      color: '#3b82f6',
      unit: '',
      domain: ['auto', 'auto'] as ['auto', 'auto'],
    },
    data.some((d) => d.fms != null) && {
      key: 'fms',
      label: 'FMS 총점 (/21)',
      color: '#8b5cf6',
      unit: '',
      domain: [0, 21] as [number, number],
      refLine: [{ value: 14, label: '부상위험', color: '#ef4444' }],
    },
    data.some((d) => d.rhr != null) && {
      key: 'rhr',
      label: '안정시 심박수 (bpm)',
      color: '#10b981',
      unit: '',
      domain: ['auto', 'auto'] as ['auto', 'auto'],
    },
    data.some((d) => d.grip != null) && {
      key: 'grip',
      label: '악력 평균 (kg)',
      color: '#ec4899',
      unit: '',
      domain: ['auto', 'auto'] as ['auto', 'auto'],
    },
    data.some((d) => d.bench != null) && {
      key: 'bench',
      label: '벤치프레스 1RM (kg)',
      color: '#06b6d4',
      unit: '',
      domain: ['auto', 'auto'] as ['auto', 'auto'],
    },
    data.some((d) => d.squat != null) && {
      key: 'squat',
      label: '스쿼트 1RM (kg)',
      color: '#84cc16',
      unit: '',
      domain: ['auto', 'auto'] as ['auto', 'auto'],
    },
    data.some((d) => d.pushup != null) && {
      key: 'pushup',
      label: '푸시업 (회)',
      color: '#a78bfa',
      unit: '',
      domain: ['auto', 'auto'] as ['auto', 'auto'],
    },
    data.some((d) => d.plank != null) && {
      key: 'plank',
      label: '플랭크 (초)',
      color: '#fb923c',
      unit: '',
      domain: ['auto', 'auto'] as ['auto', 'auto'],
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
        <span className="text-xs font-normal text-slate-500 ml-1">
          ({assessments.length}회 측정)
        </span>
      </h3>

      <div className={`grid ${colClass} gap-4`}>
        {charts.map((config) => (
          <SingleChart key={config.key} config={config} data={data} />
        ))}
      </div>
    </div>
  );
}
