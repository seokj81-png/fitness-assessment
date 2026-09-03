import type { CSSProperties } from 'react';
import {
  VO2MAX_NORMS,
  GRIP_NORMS,
  BP_RATIO_NORMS,
  SQ_RATIO_NORMS,
  DL_RATIO_NORMS,
  OHP_RATIO_NORMS,
  PC_RATIO_NORMS,
  LP_RATIO_NORMS,
  PUSHUP_NORMS,
  YMCA_BP_NORMS,
  CURLUP_NORMS,
  SQUAT_END_NORMS,
  PULLUP_NORMS,
  BALANCE_NORMS,
  type NormTable,
  type AgeGroup,
} from '@/lib/norms';
import type { Sex } from '@/lib/types';

function ag(age: number): AgeGroup {
  return Math.min(60, Math.max(20, Math.floor(age / 10) * 10)) as AgeGroup;
}

export type NormTestKey =
  | 'vo2max' | 'grip' | 'bp' | 'sq' | 'dl' | 'ohp' | 'pc' | 'lp'
  | 'pushup' | 'ymcaBp' | 'curlup' | 'squatEnd' | 'pullup' | 'balance';

const TESTS: Array<{ key: NormTestKey; name: string; table: NormTable; unit: string; digits: number }> = [
  { key: 'vo2max', name: 'VO₂max', table: VO2MAX_NORMS, unit: 'ml/kg/min', digits: 0 },
  { key: 'grip', name: '악력 합산', table: GRIP_NORMS, unit: 'kg', digits: 0 },
  { key: 'bp', name: '벤치프레스', table: BP_RATIO_NORMS, unit: '체중비', digits: 2 },
  { key: 'sq', name: '스쿼트', table: SQ_RATIO_NORMS, unit: '체중비', digits: 2 },
  { key: 'dl', name: '데드리프트', table: DL_RATIO_NORMS, unit: '체중비', digits: 2 },
  { key: 'ohp', name: '오버헤드프레스', table: OHP_RATIO_NORMS, unit: '체중비', digits: 2 },
  { key: 'pc', name: '파워클린', table: PC_RATIO_NORMS, unit: '체중비', digits: 2 },
  { key: 'lp', name: '레그프레스', table: LP_RATIO_NORMS, unit: '체중비', digits: 2 },
  { key: 'pushup', name: '푸시업', table: PUSHUP_NORMS, unit: '회', digits: 0 },
  { key: 'ymcaBp', name: 'YMCA 벤치', table: YMCA_BP_NORMS, unit: '회', digits: 0 },
  { key: 'curlup', name: '컬업', table: CURLUP_NORMS, unit: '회', digits: 0 },
  { key: 'squatEnd', name: '스쿼트 지구력', table: SQUAT_END_NORMS, unit: '회', digits: 0 },
  { key: 'pullup', name: '풀업', table: PULLUP_NORMS, unit: '회', digits: 0 },
  { key: 'balance', name: '외발서기 (눈뜨고)', table: BALANCE_NORMS, unit: '초', digits: 0 },
];

// 값이 클수록 우수 기준: ≤a / ~b / ~c / ~d / >d → 등급 칸 인덱스 0~4
function gradeIndex(v: number, [a, b, c, d]: readonly number[]): number {
  if (v <= a) return 0;
  if (v <= b) return 1;
  if (v <= c) return 2;
  if (v <= d) return 3;
  return 4;
}

// 회원 연령대·성별의 5등급 기준 범위표 — 트레이너 설명용.
// values를 주면 본인 기록이 속한 등급 칸을 반전 표시.
export default function NormsTable({
  age,
  sex,
  values,
}: {
  age: number;
  sex: Sex;
  values?: Partial<Record<NormTestKey, number>>;
}) {
  const g = ag(age);
  const f = (v: number, d: number) => (d ? v.toFixed(d) : String(Math.round(v)));
  // 본인 값: 정수면 그대로, 소수면 1자리(43.3) — 반전 칸은 원값으로 판정하므로
  // 46.3을 '46'으로 반올림하면 '~46' 칸 대신 '~50' 칸이 반전돼 모순처럼 보임
  const fMine = (v: number, d: number) =>
    d ? v.toFixed(d) : Number.isInteger(v) ? String(v) : v.toFixed(1);
  const hasValues = values && Object.values(values).some((v) => v != null);

  return (
    <div className="card">
      <h3 className="font-bold mb-1">
        연령별 등급 기준표{' '}
        <span className="text-sm font-normal" style={{ color: '#8a8a8a' }}>
          — {g}대 {sex === 'M' ? '남성' : '여성'} 기준
        </span>
      </h3>
      <p className="text-xs mb-3" style={{ color: '#8a8a8a' }}>
        ACSM·NSCA 규준. 값이 클수록 우수 — 각 칸은 해당 등급의 범위입니다. 회원 설명용.
        {hasValues && (
          <>
            {' '}
            <span
              data-mine=""
              className="inline-block px-1.5 rounded font-semibold"
              style={{ background: '#111', color: '#fff' }}
            >
              반전 칸
            </span>{' '}
            = 이번 측정에서 본인 기록이 속한 등급.
          </>
        )}
      </p>
      {/* 모바일: 표가 화면보다 넓어 가로 스크롤됨을 안내 */}
      <p className="md:hidden text-xs mb-1" style={{ color: '#6e6e6e' }}>
        ↔ 표를 옆으로 밀면 전체 등급이 보입니다
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse', minWidth: 560 }}>
          <thead>
            <tr className="text-left text-xs" style={{ color: '#8a8a8a', borderBottom: '1.5px solid #d6d6d6' }}>
              <th className="py-1.5 pr-3">검사</th>
              <th className="py-1.5 pr-2">매우낮음</th>
              <th className="py-1.5 pr-2">낮음</th>
              <th className="py-1.5 pr-2">평균</th>
              <th className="py-1.5 pr-2">우수</th>
              <th className="py-1.5">매우우수</th>
            </tr>
          </thead>
          <tbody>
            {TESTS.map((t) => {
              const range = t.table[sex][g];
              const [a, b, c, d] = range;
              const mine = values?.[t.key];
              const myIdx = mine != null ? gradeIndex(mine, range) : null;
              const cellStyle = (idx: number, base: CSSProperties): CSSProperties =>
                myIdx === idx
                  ? { background: '#111', color: '#fff', fontWeight: 700, borderRadius: 6 }
                  : base;
              // data-mine: 인쇄 시 배경 미출력 설정에서도 반전 칸이 보이도록 globals.css @media print에서 처리
              const mineAttr = (idx: number) => (myIdx === idx ? { 'data-mine': '' } : {});
              return (
                <tr key={t.key} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td className="py-1.5 pr-3 font-semibold" style={{ color: '#111' }}>
                    {t.name} <span className="text-[10px] font-normal" style={{ color: '#9a9a9a' }}>({t.unit})</span>
                    {mine != null && (
                      <span className="block text-xs font-bold" style={{ color: '#111' }}>
                        ▸ 본인 {fMine(mine, t.digits)}
                      </span>
                    )}
                  </td>
                  <td {...mineAttr(0)} className="py-1.5 pr-2 tabular-nums px-1" style={cellStyle(0, { color: '#555' })}>≤{f(a, t.digits)}</td>
                  <td {...mineAttr(1)} className="py-1.5 pr-2 tabular-nums px-1" style={cellStyle(1, { color: '#555' })}>~{f(b, t.digits)}</td>
                  <td {...mineAttr(2)} className="py-1.5 pr-2 tabular-nums px-1" style={cellStyle(2, { color: '#333' })}>~{f(c, t.digits)}</td>
                  <td {...mineAttr(3)} className="py-1.5 pr-2 tabular-nums font-semibold px-1" style={cellStyle(3, { color: '#111' })}>~{f(d, t.digits)}</td>
                  <td {...mineAttr(4)} className="py-1.5 tabular-nums font-bold px-1" style={cellStyle(4, { color: '#111' })}>&gt;{f(d, t.digits)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] mt-2" style={{ color: '#8a8a8a' }}>
        플랭크(McGill): {sex === 'M' ? '남 72초' : '여 40초'} 이상 양호 · Sorensen: 120초 미만 요통 위험 ·
        BMI(아시아-태평양): 정상 18.5–22.9 · 체지방률 양호 상한: {sex === 'M' ? '19%' : '25%'}
      </p>
    </div>
  );
}
