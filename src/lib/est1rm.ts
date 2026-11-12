// 다중반복 1RM 추정 — 종목 이름·메모와 함께 최대 4종목 (Assessment.est1rmList, JSON)
import { estimate1RM_avg, classifyAscending } from './calculations';
import { NORM_TEST_MAP, type NormTestKey } from './norm-tests';
import type { Sex } from './types';

export interface Est1rmItem {
  /** 종목 이름 (목록에서 고르거나 직접 입력) */
  ex: string;
  w?: number;
  reps?: number;
  /** 특이사항 메모 */
  memo?: string;
}

export const EST_MAX = 4;

// norm이 있는 종목은 체중비 등급(NSCA)을 같이 보여 준다 — 추정값 기준
export const EST_EXERCISES: { name: string; norm?: NormTestKey }[] = [
  { name: '스쿼트', norm: 'sq' },
  { name: '데드리프트', norm: 'dl' },
  { name: '벤치프레스', norm: 'bp' },
  { name: '바벨 로우' },
  { name: '오버헤드프레스', norm: 'ohp' },
  { name: '레그프레스', norm: 'lp' },
  { name: '랫풀다운' },
  { name: '시티드 로우' },
];

export const estNormKey = (ex: string | undefined) => EST_EXERCISES.find((e) => e.name === (ex ?? '').trim())?.norm;

export function estValue(it: Est1rmItem): number | null {
  if (!it.w || !it.reps || it.w <= 0 || it.reps <= 0) return null;
  const v = estimate1RM_avg(it.w, it.reps);
  return Number.isFinite(v) ? v : null;
}

export const estIsEmpty = (it: Est1rmItem) => !it.ex?.trim() && !it.w && !it.reps && !it.memo?.trim();

// 저장된 값 읽기: 새 목록이 없고 옛 칸(est1rmW·est1rmReps)만 있으면 종목 이름 없는 한 줄로 만든다
export function readEstList(
  list: Est1rmItem[] | null | undefined,
  legacyW?: number | null,
  legacyReps?: number | null,
): Est1rmItem[] {
  if (Array.isArray(list) && list.length) return list.slice(0, EST_MAX);
  if (legacyW || legacyReps) return [{ ex: '', w: legacyW ?? undefined, reps: legacyReps ?? undefined }];
  return [];
}

// 저장용: 빈 줄을 빼고 글자를 다듬는다
export function cleanEstList(list: Est1rmItem[] | undefined): Est1rmItem[] {
  return (list ?? [])
    .filter((it) => !estIsEmpty(it))
    .slice(0, EST_MAX)
    .map((it) => ({
      ex: (it.ex ?? '').trim().slice(0, 30),
      ...(it.w ? { w: it.w } : {}),
      ...(it.reps ? { reps: it.reps } : {}),
      ...(it.memo?.trim() ? { memo: it.memo.trim().slice(0, 100) } : {}),
    }));
}

// 추정 1RM ÷ 체중으로 본 등급 (등급표가 있는 종목만)
export function estClass(it: Est1rmItem, weightKg: number | null | undefined, age: number, sex: Sex) {
  const v = estValue(it);
  const key = estNormKey(it.ex);
  if (v == null || !key || !weightKg) return null;
  const result = classifyAscending(v / weightKg, NORM_TEST_MAP[key].table, age, sex);
  return result ? { key, ratio: v / weightKg, result } : null;
}

export const estLabel = (it: Est1rmItem) => (it.ex?.trim() ? it.ex.trim() : '종목 미기재');
