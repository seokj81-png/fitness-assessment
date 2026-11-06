import type { ClassifiedResult } from '@/lib/types';
import { pillClass } from '@/components/assessment/classification';
import { GradeTableButton } from '@/components/assessment/GradeTable';
import type { NormTestKey } from '@/lib/norm-tests';

interface Props {
  result: ClassifiedResult | null | undefined;
  unit?: string;
  children?: React.ReactNode;
  /** 연령별 등급표가 있는 검사면 키를 준다 → 배지 옆 「등급표」 (나이·성별은 폼의 GradeWhoProvider에서) */
  norm?: NormTestKey;
}

export default function ResultBox({ result, unit, children, norm }: Props) {
  if (!result) {
    return (
      <div className="text-sm text-slate-400 p-3 bg-slate-800 border border-slate-700 rounded-md">
        {children || '필수 값 입력 후 자동 계산'}
      </div>
    );
  }
  return (
    <div className="p-3 rounded-md" style={{ background: '#f2f2f2', border: '1px solid #111' }}>
      <div className="text-2xl font-bold text-slate-100">
        {typeof result.value === 'number' ? result.value.toFixed(1) : result.value} {unit}
      </div>
      {norm ? (
        <div className="flex items-center gap-2 flex-wrap">
          <span className={pillClass(result.classification)}>{result.label}</span>
          <GradeTableButton test={norm} value={typeof result.value === 'number' ? result.value : null} />
        </div>
      ) : (
        <span className={pillClass(result.classification)}>{result.label}</span>
      )}
      {result.note && <div className="text-xs text-slate-400 mt-1">{result.note}</div>}
      {children}
    </div>
  );
}
