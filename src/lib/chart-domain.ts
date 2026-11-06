// 변화 그래프 Y축 범위 — 축을 0부터 그리거나 기준선까지 넓히면 실제 변화가 평평해 보인다
// (대표 피드백 2026-11-06). 측정값 최소~최대에 여유를 두고 보기 좋은 눈금으로 맞춘다.
// 단, 측정 오차 수준의 작은 차이를 과장하지 않도록 값 크기에 비례한 최소 폭(minSpan)을 보장한다.

function niceStep(raw: number, integer = false): number {
  if (!(raw > 0)) return 1;
  const e = Math.floor(Math.log10(raw));
  const f = raw / Math.pow(10, e);
  const n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 && !integer ? 2.5 : f <= 5 ? 5 : 10;
  const step = n * Math.pow(10, e);
  return integer ? Math.max(1, Math.round(step)) : step;
}

export interface NiceDomain {
  domain: [number, number];
  ticks: number[];
}

export function niceDomain(
  values: (number | null | undefined)[],
  opts: { minSpan?: number; lower?: number; upper?: number; minSpanRatio?: number } = {}
): NiceDomain | null {
  const v = values.filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
  if (v.length === 0) return null;
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  const mid = (lo + hi) / 2;
  // 최소 폭: 값의 12%(기본) 또는 1 단위 — 70kg에서 0.1kg 변화가 화면을 꽉 채우지 않게
  const minSpan = opts.minSpan ?? Math.max(Math.abs(mid) * (opts.minSpanRatio ?? 0.12), 1);
  const span = hi - lo;
  const pad = Math.max(span * 0.25, (minSpan - span) / 2);
  let a = lo - pad;
  let b = hi + pad;
  if (opts.lower != null && a < opts.lower) a = opts.lower;
  if (opts.upper != null && b > opts.upper) b = opts.upper;
  // 값이 모두 정수(회·bpm·mmHg 등)면 눈금도 정수
  const integer = v.every((x) => Number.isInteger(x));
  const step = niceStep((b - a) / 4, integer);
  let start = Math.floor(a / step) * step;
  let end = Math.ceil(b / step) * step;
  if (opts.lower != null && start < opts.lower) start = opts.lower;
  if (opts.upper != null && end > opts.upper) end = opts.upper;
  const ticks: number[] = [];
  for (let t = start; t <= end + step * 1e-6; t += step) ticks.push(Math.round(t * 1000) / 1000);
  if (ticks[ticks.length - 1] < end) ticks.push(end);
  return { domain: [start, end], ticks };
}
