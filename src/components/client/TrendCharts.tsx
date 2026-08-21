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
import {
  VO2MAX_NORMS,
  GRIP_NORMS,
  BP_RATIO_NORMS,
  SQ_RATIO_NORMS,
  PUSHUP_NORMS,
} from '@/lib/norms';
import { ageGroup } from '@/lib/calculations';

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
        background: '#fff',
        border: '1px solid #d6d6d6',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      }}
    >
      <p style={{ color: '#6e6e6e', marginBottom: 3 }}>{label}</p>
      <p style={{ color, fontWeight: 700, fontSize: 14 }}>
        {payload[0].value.toFixed(1)}
        {unit && <span style={{ fontSize: 11, marginLeft: 2 }}>{unit}</span>}
        <span style={{ color: '#555', fontWeight: 400, marginLeft: 6, fontSize: 11 }}>
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
  dir?: 'up' | 'down' | 'neutral'; // 개선 방향 (up=클수록 좋음) — 변화 배지 색상용
}

// Individual chart with hover-Y tracking
function SingleChart({
  config,
  data,
}: {
  config: ChartConfig;
  data: DataPoint[];
}) {
  const { key, label, color, unit, domain, refLine, dir } = config;
  const [activeY, setActiveY] = useState<number | null>(null);

  // 첫 측정 → 최근 측정 변화량·변화율
  const vals = data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((d) => (d as any)[key] as number | null | undefined)
    .filter((v): v is number => v != null);
  let deltaBadge: { text: string; color: string } | null = null;
  if (vals.length >= 2) {
    const first = vals[0];
    const last = vals[vals.length - 1];
    const diff = Math.round((last - first) * 10) / 10;
    const pct = first !== 0 ? Math.round((diff / Math.abs(first)) * 100) : null;
    const improved =
      dir === 'neutral' || dir == null || diff === 0
        ? null
        : dir === 'up'
        ? diff > 0
        : diff < 0;
    const badgeColor = improved === null ? '#6e6e6e' : improved ? '#067647' : '#b42318';
    const fmtN = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
    deltaBadge = {
      text: `${fmtN(first)} → ${fmtN(last)}${unit} (${diff > 0 ? '+' : ''}${fmtN(diff)}${
        pct !== null && diff !== 0 ? ` · ${diff > 0 ? '+' : ''}${pct}%` : ''
      })`,
      color: badgeColor,
    };
  }

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
        background: '#fff',
        border: '1px solid #e3e3e3',
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color }}
        >
          {label}
        </span>
        {deltaBadge && (
          <span
            className="text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded"
            style={{ color: deltaBadge.color, background: '#f5f5f5', border: '1px solid #e3e3e3' }}
          >
            {deltaBadge.text}
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart
          data={data}
          margin={{ top: 6, right: 16, left: 4, bottom: 0 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e9e9e9" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#555' }}
            tickLine={false}
            axisLine={{ stroke: '#8a8a8a' }}
          />
          <YAxis
            domain={domain}
            tick={{ fontSize: 11, fill: '#555' }}
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
            cursor={{ stroke: '#d6d6d6', strokeWidth: 1 }}
          />

          {/* Static reference lines */}
          {refLine?.map((r) => (
            <ReferenceLine
              key={r.value}
              y={r.value}
              stroke={r.color}
              strokeDasharray="4 4"
              strokeWidth={1}
              ifOverflow="extendDomain"
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

          <Line isAnimationActive={false}
            type="monotone"
            dataKey={key}
            stroke={color}
            strokeWidth={2.5}
            dot={{ fill: color, r: 4, strokeWidth: 0 }}
            activeDot={{ r: 6, stroke: color, strokeWidth: 2, fill: '#fff' }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function TrendCharts({
  assessments,
  sex = 'M',
  age = 30,
  weight,
}: {
  assessments: AssessmentRow[];
  sex?: 'M' | 'F';
  age?: number;
  weight?: number | null;
}) {
  // 회색 기준선용 규준 (동일 성별·연령대)
  const g = ageGroup(age);
  const GRAY = '#9a9a9a';
  const vo2Row = VO2MAX_NORMS[sex][g];
  const gripRow = GRIP_NORMS[sex][g];
  const bpRow = BP_RATIO_NORMS[sex][g];
  const sqRow = SQ_RATIO_NORMS[sex][g];
  const puRow = PUSHUP_NORMS[sex][g];
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

  // 평가 흐름 순서: ①생체지표 → ②신체조성 → ④움직임 → ⑤심폐 → ⑥근력 → ⑦근지구력
  const charts: ChartConfig[] = [
    data.some((d) => d.rhr != null) && {
      key: 'rhr',
      label: '① 안정시 심박수 (bpm)',
      color: '#111',
      unit: '',
      domain: ['auto', 'auto'] as ['auto', 'auto'],
      refLine: [
        { value: 60, label: '정상 하한 60', color: GRAY },
        { value: 100, label: '정상 상한 100', color: GRAY },
      ],
      dir: 'down' as const,
    },
    data.some((d) => d.bmi != null) && {
      key: 'bmi',
      label: '② BMI',
      color: '#111',
      unit: '',
      domain: [14, 38] as [number, number],
      refLine: [
        { value: 18.5, label: '저체중', color: '#9a9a9a' },
        { value: 23, label: '정상', color: '#9a9a9a' },
        { value: 25, label: '과체중', color: '#9a9a9a' },
        { value: 30, label: '비만', color: '#9a9a9a' },
      ],
      dir: 'neutral' as const,
    },
    data.some((d) => d.bodyFat != null) && {
      key: 'bodyFat',
      label: '② 체지방률 (%)',
      color: '#111',
      unit: '%',
      domain: ['auto', 'auto'] as ['auto', 'auto'],
      refLine: sex === 'M'
        ? [
            { value: 19, label: '양호 상한 19', color: GRAY },
            { value: 25, label: '평균 상한 25', color: GRAY },
          ]
        : [
            { value: 25, label: '양호 상한 25', color: GRAY },
            { value: 32, label: '평균 상한 32', color: GRAY },
          ],
      dir: 'down' as const,
    },
    data.some((d) => d.fms != null) && {
      key: 'fms',
      label: '④ FMS 총점 (/21)',
      color: '#111',
      unit: '',
      domain: [0, 21] as [number, number],
      refLine: [{ value: 14, label: '부상위험', color: '#9a9a9a' }],
      dir: 'up' as const,
    },
    data.some((d) => d.vo2max != null) && {
      key: 'vo2max',
      label: '⑤ VO₂max (mL/kg/min)',
      color: '#111',
      unit: '',
      domain: ['auto', 'auto'] as ['auto', 'auto'],
      refLine: [
        { value: vo2Row[1], label: `평균 하한 ${vo2Row[1]}`, color: GRAY },
        { value: vo2Row[3], label: `우수 진입 ${vo2Row[3]}`, color: GRAY },
      ],
      dir: 'up' as const,
    },
    data.some((d) => d.grip != null) && {
      key: 'grip',
      label: '⑥ 악력 평균 (kg)',
      color: '#111',
      unit: '',
      domain: ['auto', 'auto'] as ['auto', 'auto'],
      refLine: [
        { value: Math.round(gripRow[1] / 2), label: `평균 하한 ${Math.round(gripRow[1] / 2)}`, color: GRAY },
        { value: Math.round(gripRow[3] / 2), label: `우수 진입 ${Math.round(gripRow[3] / 2)}`, color: GRAY },
      ],
      dir: 'up' as const,
    },
    data.some((d) => d.bench != null) && {
      key: 'bench',
      label: '⑥ 벤치프레스 1RM (kg)',
      color: '#111',
      unit: '',
      domain: ['auto', 'auto'] as ['auto', 'auto'],
      refLine: weight
        ? [
            { value: Math.round(bpRow[1] * weight), label: `평균 하한 ${Math.round(bpRow[1] * weight)}`, color: GRAY },
            { value: Math.round(bpRow[3] * weight), label: `우수 진입 ${Math.round(bpRow[3] * weight)}`, color: GRAY },
          ]
        : undefined,
      dir: 'up' as const,
    },
    data.some((d) => d.squat != null) && {
      key: 'squat',
      label: '⑥ 스쿼트 1RM (kg)',
      color: '#111',
      unit: '',
      domain: ['auto', 'auto'] as ['auto', 'auto'],
      refLine: weight
        ? [
            { value: Math.round(sqRow[1] * weight), label: `평균 하한 ${Math.round(sqRow[1] * weight)}`, color: GRAY },
            { value: Math.round(sqRow[3] * weight), label: `우수 진입 ${Math.round(sqRow[3] * weight)}`, color: GRAY },
          ]
        : undefined,
      dir: 'up' as const,
    },
    data.some((d) => d.pushup != null) && {
      key: 'pushup',
      label: '⑦ 푸시업 (회)',
      color: '#111',
      unit: '',
      domain: ['auto', 'auto'] as ['auto', 'auto'],
      refLine: [
        { value: puRow[1], label: `평균 하한 ${puRow[1]}`, color: GRAY },
        { value: puRow[3], label: `우수 진입 ${puRow[3]}`, color: GRAY },
      ],
      dir: 'up' as const,
    },
    data.some((d) => d.plank != null) && {
      key: 'plank',
      label: '⑦ 플랭크 (초)',
      color: '#111',
      unit: '',
      domain: ['auto', 'auto'] as ['auto', 'auto'],
      refLine: [{ value: sex === 'M' ? 72 : 40, label: `McGill 기준 ${sex === 'M' ? 72 : 40}`, color: GRAY }],
      dir: 'up' as const,
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
        background: '#fff',
        border: '1px solid #e3e3e3',
      }}
    >
      <h3 className="font-bold text-slate-100 mb-4 flex items-center gap-2">
        <span style={{ color: '#555' }}>📈</span> 측정 항목별 변화 추이
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
