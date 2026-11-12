'use client';

// ⑥ 근력 — 다중반복 1RM 추정: 종목 이름·메모와 함께 최대 4종목
import { estimate1RM_epley, estimate1RM_brzycki, estimate1RM_lombardi } from '@/lib/calculations';
import { EST_EXERCISES, EST_MAX, estClass, estValue, type Est1rmItem } from '@/lib/est1rm';
import { GradeTableButton, useGradeWho } from './GradeTable';

const CUSTOM = '__custom__';
const PILL: Record<string, string> = {
  excellent: 'pill-excellent',
  good: 'pill-good',
  average: 'pill-average',
  below: 'pill-below',
  poor: 'pill-poor',
};

export default function Est1rmCard({
  list,
  onChange,
  weight,
}: {
  list: Est1rmItem[];
  onChange: (next: Est1rmItem[]) => void;
  weight?: number;
}) {
  const who = useGradeWho();
  const age = who?.age ?? 0;
  const sex = who?.sex ?? 'M';
  const rows = list.length ? list : [{ ex: '' }];
  const set = (i: number, patch: Partial<Est1rmItem>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const num = (s: string) => (s === '' ? undefined : Number(s));

  return (
    <div className="card">
      <h3 className="font-bold mb-2">
        다중반복 1RM 추정 <span className="guideline-tag tag-nsca">NSCA</span>
      </h3>
      <p className="text-xs text-slate-500 mb-3">
        10RM 이하의 무게로 실패까지 수행 (초급·고위험군에 적합). <b>종목을 고르고</b> 중량·반복수를 넣으면 그 종목의 1RM
        추정치가 나옵니다. 최대 {EST_MAX}종목 — 같은 종목 이름으로 재평가하면 이전 평가와 비교됩니다.
      </p>

      <div className="space-y-3">
        {rows.map((r, i) => {
          const preset = EST_EXERCISES.some((e) => e.name === r.ex);
          const custom = !preset && r.ex !== '';
          const v = estValue(r);
          const cls = estClass(r, weight, age, sex);
          return (
            <div key={i} className="rounded-xl p-3" style={{ border: '1px solid #e2e2e2', background: '#fff' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold" style={{ color: '#5a5a5a' }}>
                  종목 {i + 1}
                </span>
                {(rows.length > 1 || r.ex || r.w || r.reps || r.memo) && (
                  <button
                    type="button"
                    className="text-xs underline"
                    style={{ color: '#8a8a8a' }}
                    onClick={() => onChange(rows.filter((_, j) => j !== i))}
                  >
                    이 종목 지우기
                  </button>
                )}
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <label className="label">종목</label>
                  <select
                    className="input"
                    value={preset ? r.ex : custom ? CUSTOM : ''}
                    onChange={(e) => set(i, { ex: e.target.value === CUSTOM ? ' ' : e.target.value })}
                    aria-label={`종목 ${i + 1} 이름`}
                  >
                    <option value="">종목 선택</option>
                    {EST_EXERCISES.map((e) => (
                      <option key={e.name} value={e.name}>
                        {e.name}
                      </option>
                    ))}
                    <option value={CUSTOM}>직접 입력</option>
                  </select>
                  {custom && (
                    <input
                      className="input mt-2"
                      placeholder="종목 이름 (예: 체스트프레스 머신)"
                      value={r.ex.trim() === '' ? '' : r.ex}
                      maxLength={30}
                      onChange={(e) => set(i, { ex: e.target.value === '' ? ' ' : e.target.value })}
                      aria-label={`종목 ${i + 1} 이름 직접 입력`}
                    />
                  )}
                </div>
                <div>
                  <label className="label">중량 (kg)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min="0"
                    className="input"
                    value={r.w ?? ''}
                    onChange={(e) => set(i, { w: num(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label">반복수 (≤10)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min="1"
                    className="input"
                    value={r.reps ?? ''}
                    onChange={(e) => set(i, { reps: num(e.target.value) })}
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="label">특이사항 메모</label>
                <input
                  className="input"
                  placeholder="예: 스미스머신 · 하프 스쿼트 · 어깨 통증으로 8회에서 중단"
                  value={r.memo ?? ''}
                  maxLength={100}
                  onChange={(e) => set(i, { memo: e.target.value || undefined })}
                />
              </div>

              {v != null && (
                <div className="result-box mt-3 p-3 rounded-md">
                  <div className="text-2xl font-bold">≈ {v.toFixed(1)} kg</div>
                  <div className="text-xs text-slate-600 mt-1">
                    Epley {estimate1RM_epley(r.w!, r.reps!).toFixed(1)} / Brzycki{' '}
                    {estimate1RM_brzycki(r.w!, r.reps!)?.toFixed(1) || '-'} / Lombardi{' '}
                    {estimate1RM_lombardi(r.w!, r.reps!).toFixed(1)}
                  </div>
                  {cls && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className={PILL[cls.result.classification]}>{cls.result.label}</span>
                      <GradeTableButton test={cls.key} value={cls.ratio} />
                      <span className="text-xs" style={{ color: '#8a8a8a' }}>
                        체중비 {cls.ratio.toFixed(2)} · 추정값으로 본 등급
                      </span>
                    </div>
                  )}
                  {(r.reps ?? 0) > 10 && (
                    <div className="text-xs mt-1" style={{ color: '#c62828' }}>
                      반복수가 10회를 넘으면 추정이 부정확해집니다. 더 무거운 중량으로 10회 이하에서 다시 재 주세요.
                    </div>
                  )}
                  {!r.ex.trim() && (
                    <div className="text-xs mt-1" style={{ color: '#c62828' }}>
                      종목을 골라 주세요 — 결과지에 어떤 운동의 1RM인지 표시됩니다.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {rows.length < EST_MAX && (
        <button type="button" className="btn-secondary mt-3" onClick={() => onChange([...rows, { ex: '' }])}>
          + 종목 추가 ({rows.length}/{EST_MAX})
        </button>
      )}
    </div>
  );
}
