'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  Cell,
} from 'recharts';

export interface LiftBar {
  name: string; // 예: "벤치 (상체)"
  ratio: number; // 1RM / 체중
  cls?: string | null; // classification → 잉크 농도
}

const FILL: Record<string, string> = {
  excellent: '#111111',
  good: '#4a4a4a',
  average: '#9a9a9a',
  below: '#d6d6d6',
  poor: '#f0f0f0',
};

// 1RM 체중비 바 차트 — 상·하체 균형을 한눈에 (진할수록 등급 우수)
export default function StrengthChart({ lifts }: { lifts: LiftBar[] }) {
  if (lifts.length < 2) return null;
  return (
    <div className="rounded-lg p-3 mb-4" style={{ background: '#fafafa', border: '1px solid #e3e3e3' }}>
      <div className="text-xs font-semibold mb-1" style={{ color: '#111' }}>
        1RM 체중비 — 상·하체 균형{' '}
        <span style={{ color: '#8a8a8a', fontWeight: 500 }}>(막대가 진할수록 등급 우수)</span>
      </div>
      <ResponsiveContainer width="100%" height={210}>
        <BarChart data={lifts} margin={{ top: 20, right: 8, left: -22, bottom: 0 }}>
          <CartesianGrid stroke="#e9e9e9" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#555' }} stroke="#c4c4c4" interval={0} />
          <YAxis tick={{ fontSize: 10, fill: '#8a8a8a' }} stroke="#c4c4c4" />
          <Tooltip
            contentStyle={{ background: '#fff', border: '1px solid #d6d6d6', borderRadius: 8, fontSize: 12 }}
            formatter={(v) => [`체중 × ${v}`, '1RM 체중비']}
          />
          <Bar dataKey="ratio" radius={[4, 4, 0, 0]} maxBarSize={56}>
            <LabelList dataKey="ratio" position="top" style={{ fontSize: 11, fill: '#111', fontWeight: 600 }} />
            {lifts.map((l, i) => (
              <Cell
                key={i}
                fill={FILL[l.cls ?? 'average'] || '#9a9a9a'}
                stroke="#8a8a8a"
                strokeWidth={l.cls === 'poor' || l.cls === 'below' ? 1 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
