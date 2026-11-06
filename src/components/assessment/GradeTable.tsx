'use client';

// 등급표 창 — 등급 배지 옆 「등급표」를 누르면 그 검사의 연령대별 5등급 기준 전체를 보여 준다.
// 회원 연령대 줄은 회색, 본인 기록이 속한 칸은 검정 반전. 남/여 전환 가능(회원 성별이 기본).
import { createContext, useContext, useEffect, useId, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Sex } from '@/lib/types';
import {
  NORM_TEST_MAP,
  AGE_GROUPS,
  GRADE_NAMES,
  normAgeGroup,
  gradeIndex,
  type NormTestKey,
} from '@/lib/norm-tests';

// 입력 화면은 탭마다 나이·성별을 넘기지 않아도 되도록 폼 맨 위에서 한 번 넣어 둔다.
const WhoContext = createContext<{ age: number; sex: Sex } | null>(null);
export function GradeWhoProvider({ age, sex, children }: { age: number; sex: Sex; children: ReactNode }) {
  return <WhoContext.Provider value={{ age, sex }}>{children}</WhoContext.Provider>;
}

const ageLabel = (g: number) => (g === 20 ? '20대 이하' : g === 60 ? '60대 이상' : `${g}대`);

export function GradeTableButton({
  test,
  value,
  age: ageProp,
  sex: sexProp,
  children,
}: {
  test: NormTestKey;
  /** 본인 기록 (등급표와 같은 단위 — 1RM은 체중비, 악력은 좌+우 합계) */
  value?: number | null;
  age?: number;
  sex?: Sex;
  /** 없으면 작은 「등급표」 버튼, 있으면 그 내용을 누를 수 있게 만든다 */
  children?: ReactNode;
}) {
  const who = useContext(WhoContext);
  const age = ageProp ?? who?.age ?? 0;
  const sex = sexProp ?? who?.sex ?? 'M';
  const [open, setOpen] = useState(false);

  return (
    <>
      {children ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className="text-left font-semibold print:no-underline"
          style={{ color: '#111', textDecoration: 'underline dotted', textUnderlineOffset: 3 }}
          title="눌러서 연령대별 등급표 보기"
        >
          {children}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className="print:hidden inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold"
          style={{ background: '#fff', color: '#111', border: '1px solid #bdbdbd' }}
        >
          등급표 <span aria-hidden>›</span>
        </button>
      )}
      {open && <GradeTableModal test={test} value={value} age={age} sex={sex} onClose={() => setOpen(false)} />}
    </>
  );
}

function GradeTableModal({
  test,
  value,
  age,
  sex,
  onClose,
}: {
  test: NormTestKey;
  value?: number | null;
  age: number;
  sex: Sex;
  onClose: () => void;
}) {
  const t = NORM_TEST_MAP[test];
  const [viewSex, setViewSex] = useState<Sex>(sex);
  const titleId = useId();
  const myGroup = age > 0 ? normAgeGroup(age) : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const f = (v: number) => (t.digits ? v.toFixed(t.digits) : String(Math.round(v)));
  // 본인 값: 반올림하면 칸 판정과 어긋나 보일 수 있어 정수는 그대로, 소수는 1자리(체중비는 2자리)
  const fMine = (v: number) => (t.digits ? v.toFixed(t.digits) : Number.isInteger(v) ? String(v) : v.toFixed(1));
  const hasMine = value != null && myGroup != null;
  const myIdx = hasMine ? gradeIndex(value!, t.table[sex][myGroup!]) : null;

  return createPortal(
    <div
      className="print:hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:w-[min(560px,calc(100%-32px))] max-h-[88vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-4 sm:p-5"
        style={{ background: '#fff', color: '#111' }}
      >
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 id={titleId} className="text-lg font-bold leading-snug">
            {t.name} 등급표{' '}
            <span className="text-sm font-normal" style={{ color: '#6e6e6e' }}>
              ({t.unit})
            </span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="shrink-0 w-8 h-8 rounded-full text-lg leading-none"
            style={{ background: '#f2f2f2', color: '#111' }}
          >
            ×
          </button>
        </div>
        <p className="text-xs mb-3" style={{ color: '#6e6e6e' }}>
          {t.source} · 값이 클수록 좋음 · 각 칸은 그 등급의 상한값
        </p>

        {hasMine && (
          <div className="mb-3 px-3 py-2 rounded-lg text-sm" style={{ background: '#f2f2f2' }}>
            본인 기록 <b className="tabular-nums">{fMine(value!)}{t.unit === '체중비' ? '' : ` ${t.unit}`}</b>
            {t.unit === '체중비' ? ' (체중비)' : ''} →{' '}
            <b>{ageLabel(myGroup!)} {sex === 'M' ? '남성' : '여성'}</b> 기준 <b>{GRADE_NAMES[myIdx!]}</b>
          </div>
        )}

        <div className="inline-flex rounded-lg p-0.5 mb-3" style={{ background: '#f2f2f2' }} role="group" aria-label="성별">
          {(['M', 'F'] as Sex[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setViewSex(s)}
              aria-pressed={viewSex === s}
              className="px-4 py-1 rounded-md text-sm font-semibold"
              style={viewSex === s ? { background: '#111', color: '#fff' } : { background: 'transparent', color: '#555' }}
            >
              {s === 'M' ? '남성' : '여성'}
              {s === sex ? ' (회원)' : ''}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[12px] sm:text-[13px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="text-left text-xs" style={{ color: '#6e6e6e', borderBottom: '1.5px solid #d6d6d6' }}>
                <th className="py-1.5 pr-1 font-semibold">연령대</th>
                {GRADE_NAMES.map((n) => (
                  <th key={n} className="py-1.5 px-0.5 sm:px-1 font-semibold whitespace-nowrap">
                    {n}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AGE_GROUPS.map((g) => {
                const [a, b, c, d] = t.table[viewSex][g];
                const isMyRow = viewSex === sex && g === myGroup;
                const cells = [`≤${f(a)}`, `~${f(b)}`, `~${f(c)}`, `~${f(d)}`, `>${f(d)}`];
                return (
                  <tr
                    key={g}
                    style={{ borderBottom: '1px solid #ececec', background: isMyRow ? '#f2f2f2' : undefined }}
                  >
                    <td className="py-2 pr-1 whitespace-nowrap" style={{ fontWeight: isMyRow ? 700 : 500 }}>
                      {isMyRow ? '▸ ' : ''}
                      {ageLabel(g)}
                    </td>
                    {cells.map((txt, i) => {
                      const mine = isMyRow && myIdx === i;
                      return (
                        <td
                          key={i}
                          className="py-2 px-0.5 sm:px-1 tabular-nums whitespace-nowrap"
                          style={
                            mine
                              ? { background: '#111', color: '#fff', fontWeight: 700, borderRadius: 6 }
                              : { color: i >= 3 ? '#111' : '#555', fontWeight: i >= 3 ? 600 : 400 }
                          }
                        >
                          {txt}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <ul className="mt-3 space-y-1 text-xs" style={{ color: '#6e6e6e' }}>
          {myGroup != null && viewSex === sex && (
            <li>· ▸ 표시 줄이 회원 연령대({age}세)입니다{hasMine ? ', 검정 칸이 이번 기록입니다' : ''}.</li>
          )}
          <li>· 10대는 20대 기준, 70세 이상은 60대 기준으로 판정합니다.</li>
          {t.how && <li>· {t.how}</li>}
        </ul>

        <button
          type="button"
          onClick={onClose}
          className="sm:hidden mt-4 w-full py-2.5 rounded-lg text-sm font-semibold"
          style={{ background: '#111', color: '#fff' }}
        >
          닫기
        </button>
      </div>
    </div>,
    document.body,
  );
}
