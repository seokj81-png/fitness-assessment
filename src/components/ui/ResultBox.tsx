import type { ClassifiedResult } from '@/lib/types';
import { pillClass } from '@/components/assessment/classification';

interface Props {
  result: ClassifiedResult | null | undefined;
  unit?: string;
  children?: React.ReactNode;
}

export default function ResultBox({ result, unit, children }: Props) {
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
      <span className={pillClass(result.classification)}>{result.label}</span>
      {result.note && <div className="text-xs text-slate-400 mt-1">{result.note}</div>}
      {children}
    </div>
  );
}
