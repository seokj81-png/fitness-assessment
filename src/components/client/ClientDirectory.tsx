'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

export interface ClientRow {
  id: string;
  name: string;
  sex: string;
  age: number | null;
  branch: string | null;
  trainer: string | null;
  goal: string | null;
  count: number;
  lastDate: string | null; // ISO
}

const GOAL_LABEL: Record<string, string> = {
  health: '일반 건강',
  weight: '체중 관리',
  strength: '근력/근비대',
  performance: '경기력',
  rehab: '재활',
};

export default function ClientDirectory({ rows }: { rows: ClientRow[] }) {
  const [q, setQ] = useState('');
  const [branch, setBranch] = useState<string>('전체');
  const [trainer, setTrainer] = useState<string>('전체');

  // 데이터에 실제 존재하는 지점·트레이너만 필터 옵션으로
  const branches = useMemo(() => {
    const set = new Set(rows.map((r) => r.branch).filter(Boolean) as string[]);
    return ['전체', ...Array.from(set).sort(), ...(rows.some((r) => !r.branch) ? ['미지정'] : [])];
  }, [rows]);
  const trainers = useMemo(() => {
    const set = new Set(rows.map((r) => r.trainer).filter(Boolean) as string[]);
    return ['전체', ...Array.from(set).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (branch === '미지정' && r.branch) return false;
      if (branch !== '전체' && branch !== '미지정' && r.branch !== branch) return false;
      if (trainer !== '전체' && r.trainer !== trainer) return false;
      if (q) {
        const needle = q.toLowerCase();
        const hay = `${r.name} ${r.trainer ?? ''}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [rows, q, branch, trainer]);

  return (
    <div>
      {/* 검색 + 필터 바 */}
      <div className="card" style={{ padding: '14px 16px' }}>
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <input
            className="input md:max-w-xs"
            placeholder="🔍 이름·트레이너 검색"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {trainers.length > 1 && (
            <select className="input md:max-w-[180px]" value={trainer} onChange={(e) => setTrainer(e.target.value)}>
              {trainers.map((t) => (
                <option key={t} value={t}>{t === '전체' ? '담당 트레이너: 전체' : t}</option>
              ))}
            </select>
          )}
        </div>
        {branches.length > 1 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {branches.map((b) => {
              const on = branch === b;
              return (
                <button
                  key={b}
                  onClick={() => setBranch(b)}
                  className="px-3 py-1.5 rounded-full text-sm font-semibold transition"
                  style={
                    on
                      ? { background: '#111', color: '#fff', border: '1px solid #111' }
                      : { background: '#fff', color: '#555', border: '1px solid #d6d6d6' }
                  }
                >
                  {b}
                </button>
              );
            })}
          </div>
        )}
        <div className="text-xs mt-2" style={{ color: '#8a8a8a' }}>
          {filtered.length}명 / 전체 {rows.length}명
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-12 text-sm" style={{ color: '#8a8a8a' }}>
          조건에 맞는 회원이 없습니다.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/clients/${c.id}`}
              className="card hover:shadow-md hover:border-slate-400 transition block"
              style={{ marginBottom: 0 }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{c.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {c.sex === 'M' ? '남' : c.sex === 'F' ? '여' : '-'}
                    {c.age != null && ` · ${c.age}세`}
                  </p>
                </div>
                <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-1 rounded">
                  {c.count}회 평가
                </span>
              </div>
              <div className="mt-3 text-xs text-slate-600">
                {c.lastDate ? (
                  <>최근 측정: {new Date(c.lastDate).toLocaleDateString('ko-KR')}</>
                ) : (
                  <span className="text-slate-400">평가 기록 없음</span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {c.branch && (
                  <span className="text-[11px] px-2 py-0.5 rounded font-semibold" style={{ background: '#111', color: '#fff' }}>
                    {c.branch}
                  </span>
                )}
                {c.trainer && (
                  <span className="text-[11px] px-2 py-0.5 rounded font-medium" style={{ background: '#fff', color: '#333', border: '1px solid #c4c4c4' }}>
                    담당 {c.trainer}
                  </span>
                )}
                {c.goal && (
                  <span className="text-[11px] px-2 py-0.5 rounded font-medium bg-slate-100 text-slate-700">
                    {GOAL_LABEL[c.goal] || c.goal}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
