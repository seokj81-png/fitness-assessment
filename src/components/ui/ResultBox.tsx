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
      <div className="text-sm text-slate-500 p-3 bg-slate-50 border border-slate-200 rounded-md">
        {children || '필수 값 입력 후 자동 계산'}
      </div>
    );
  }
  return (
    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
      <div className="text-2xl font-bold text-slate-900">
        {typeof result.value === 'number' ? result.value.toFixed(1) : result.value} {unit}
      </div>
      <span className={pillClass(result.classification)}>{result.label}</span>
      {result.note && <div className="text-xs text-slate-600 mt-1">{result.note}</div>}
      {children}
    </div>
  );
}
