'use client';

import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

export interface InbodyRow {
  id: string;
  date: string; // ISO
  weight: number | null;
  bodyFat: number | null;
  smm: number | null;
}

const METRICS = [
  { key: 'weight', label: '체중', unit: 'kg', betterDown: true },
  { key: 'bodyFat', label: '체지방률', unit: '%', betterDown: true },
  { key: 'smm', label: '골격근량', unit: 'kg', betterDown: false },
] as const;

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function InbodyLog({ clientId, initial }: { clientId: string; initial: InbodyRow[] }) {
  const [entries, setEntries] = useState<InbodyRow[]>(initial);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [smm, setSmm] = useState('');
  const [saving, setSaving] = useState(false);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => a.date.localeCompare(b.date)),
    [entries]
  );

  async function add() {
    if (!weight && !bodyFat && !smm) {
      alert('체중·체지방률·골격근량 중 하나 이상 입력하세요.');
      return;
    }
    setSaving(true);
    const res = await fetch('/api/inbody', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId,
        date,
        weight: weight ? Number(weight) : null,
        bodyFat: bodyFat ? Number(bodyFat) : null,
        smm: smm ? Number(smm) : null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const created = await res.json();
      setEntries((prev) => [...prev, { ...created }]);
      setWeight(''); setBodyFat(''); setSmm('');
    } else {
      alert('저장 실패');
    }
  }

  async function remove(id: string) {
    if (!confirm('이 인바디 기록을 삭제할까요?')) return;
    const res = await fetch(`/api/inbody/${id}`, { method: 'DELETE' });
    if (res.ok) setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  // 직전 기록 대비 변화값
  function delta(idx: number, key: 'weight' | 'bodyFat' | 'smm'): string | null {
    const cur = sorted[idx]?.[key];
    if (cur == null) return null;
    for (let i = idx - 1; i >= 0; i--) {
      const prev = sorted[i]?.[key];
      if (prev != null) {
        const d = Math.round((cur - prev) * 10) / 10;
        if (d === 0) return '—';
        return d > 0 ? `▲${d}` : `▼${Math.abs(d)}`;
      }
    }
    return null;
  }

  return (
    <div className="card" data-print-section="인바디 기록">
      <h3 className="font-bold mb-1">📊 인바디 기록 <span className="text-xs font-normal" style={{ color: '#8a8a8a' }}>({entries.length}회)</span></h3>
      <p className="text-xs mb-3" style={{ color: '#8a8a8a' }}>
        체력평가와 별도로 수시 측정 — 날짜를 골라 입력하면 변화 추이가 바로 그래프로 쌓입니다.
      </p>

      {/* 빠른 입력 줄 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        <input type="number" inputMode="decimal" step="0.1" className="input" placeholder="체중 kg" value={weight} onChange={(e) => setWeight(e.target.value)} />
        <input type="number" inputMode="decimal" step="0.1" className="input" placeholder="체지방률 %" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} />
        <input type="number" inputMode="decimal" step="0.1" className="input" placeholder="골격근량 kg" value={smm} onChange={(e) => setSmm(e.target.value)} />
        <button onClick={add} disabled={saving} className="btn-primary">
          {saving ? '저장 중...' : '+ 추가'}
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm py-4 text-center" style={{ color: '#8a8a8a' }}>아직 인바디 기록이 없습니다. 첫 측정을 입력하세요.</p>
      ) : (
        <>
          {/* 첫 측정 대비 요약 */}
          {sorted.length >= 2 && (
            <div className="mb-3 p-3 rounded-lg" style={{ background: '#fafafa', border: '1px solid #e3e3e3' }}>
              <div className="text-xs font-bold mb-1.5" style={{ color: '#111' }}>
                📌 첫 측정 대비 변화{' '}
                <span className="font-medium" style={{ color: '#8a8a8a' }}>
                  {new Date(sorted[0].date).toLocaleDateString('ko-KR')} →{' '}
                  {new Date(sorted[sorted.length - 1].date).toLocaleDateString('ko-KR')}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {METRICS.map((m) => {
                  const vals = sorted.filter((e) => e[m.key] != null);
                  if (vals.length < 2) return null;
                  const first = vals[0][m.key] as number;
                  const last = vals[vals.length - 1][m.key] as number;
                  const diff = Math.round((last - first) * 10) / 10;
                  const pct = first !== 0 ? Math.round((diff / Math.abs(first)) * 100) : null;
                  const improved = diff === 0 ? null : m.betterDown ? diff < 0 : diff > 0;
                  const color = improved === null ? '#6e6e6e' : improved ? '#067647' : '#b42318';
                  return (
                    <span
                      key={m.key}
                      className="text-xs font-semibold tabular-nums px-2 py-1 rounded"
                      style={{ background: '#fff', border: '1px solid #e3e3e3', color: '#333' }}
                    >
                      {m.label} {first} → {last}
                      {m.unit === '%' ? '%' : 'kg'}{' '}
                      <b style={{ color }}>
                        ({diff > 0 ? '+' : ''}{diff}
                        {pct !== null && diff !== 0 ? ` · ${diff > 0 ? '+' : ''}${pct}%` : ''})
                      </b>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* 추이 차트 3종 */}
          {sorted.length >= 2 && (
            <div className="grid md:grid-cols-3 gap-3 mb-4">
              {METRICS.map((m) => {
                const data = sorted
                  .filter((e) => e[m.key] != null)
                  .map((e) => ({ d: fmtDate(e.date), v: e[m.key] as number }));
                if (data.length < 2) return null;
                return (
                  <div key={m.key} className="rounded-lg p-3" style={{ background: '#fafafa', border: '1px solid #e3e3e3' }}>
                    <div className="text-xs font-semibold mb-1" style={{ color: '#111' }}>{m.label} ({m.unit})</div>
                    <ResponsiveContainer width="100%" height={140}>
                      <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
                        <CartesianGrid stroke="#e9e9e9" strokeDasharray="3 3" />
                        <XAxis dataKey="d" tick={{ fontSize: 10, fill: '#8a8a8a' }} stroke="#c4c4c4" />
                        <YAxis tick={{ fontSize: 10, fill: '#8a8a8a' }} stroke="#c4c4c4" domain={['auto', 'auto']} />
                        <Tooltip
                          contentStyle={{ background: '#fff', border: '1px solid #d6d6d6', borderRadius: 8, fontSize: 12 }}
                          formatter={(v) => [`${v} ${m.unit}`, m.label]}
                        />
                        <Line type="monotone" dataKey="v" stroke="#111" strokeWidth={2} dot={{ r: 3, fill: '#111' }} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                );
              })}
            </div>
          )}

          {/* 기록 목록 (최신순) + 직전 대비 변화 */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="text-left text-xs" style={{ color: '#8a8a8a', borderBottom: '1px solid #e3e3e3' }}>
                  <th className="py-1.5 pr-3">날짜</th>
                  <th className="py-1.5 pr-3">체중</th>
                  <th className="py-1.5 pr-3">체지방률</th>
                  <th className="py-1.5 pr-3">골격근량</th>
                  <th className="py-1.5 no-print"></th>
                </tr>
              </thead>
              <tbody>
                {[...sorted].reverse().map((e) => {
                  const idx = sorted.findIndex((s) => s.id === e.id);
                  return (
                    <tr key={e.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td className="py-2 pr-3 tabular-nums">{new Date(e.date).toLocaleDateString('ko-KR')}</td>
                      {(['weight', 'bodyFat', 'smm'] as const).map((k) => (
                        <td key={k} className="py-2 pr-3 tabular-nums">
                          {e[k] != null ? (
                            <>
                              {e[k]}{k === 'bodyFat' ? '%' : 'kg'}
                              {delta(idx, k) && (
                                <span className="text-xs ml-1" style={{ color: '#8a8a8a' }}>{delta(idx, k)}</span>
                              )}
                            </>
                          ) : (
                            <span style={{ color: '#c4c4c4' }}>-</span>
                          )}
                        </td>
                      ))}
                      <td className="py-2 text-right no-print">
                        <button onClick={() => remove(e.id)} className="text-xs underline" style={{ color: '#8a8a8a' }}>
                          삭제
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
