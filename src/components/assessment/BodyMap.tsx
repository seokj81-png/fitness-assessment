import type { ReactNode } from 'react';

// 인체 모형 교정 부위 색표시 — 회원 설명용 (트레이너 피드백: "근육 명칭보다 부위로")
// 자세 증후군·움직임 보상의 과활성/저활성 근육 문자열을 부위로 변환해
// 앞·뒤 실루엣에 빨강(이완·스트레칭)/파랑(활성화·강화)으로 칠한다.

const OVER_COLOR = '#b42318'; // 과활성 = 이완·스트레칭 (기능색 예외 — 빨강)
const UNDER_COLOR = '#175cd3'; // 저활성 = 활성화·강화 (기능색 예외 — 파랑)

type RegionId =
  | 'neck-front' | 'shoulder-front' | 'chest' | 'ribs-side' | 'abs'
  | 'hip-front' | 'thigh-front' | 'thigh-inner' | 'shin'
  | 'neck-back' | 'shoulder-back' | 'upper-back' | 'lats' | 'low-back'
  | 'glutes' | 'hip-side' | 'thigh-back' | 'thigh-outer' | 'calf';

const REGION_LABELS: Record<RegionId, string> = {
  'neck-front': '목 앞·옆',
  'shoulder-front': '어깨 앞',
  chest: '가슴',
  'ribs-side': '옆갈비',
  abs: '복부(코어)',
  'hip-front': '고관절 앞',
  'thigh-front': '허벅지 앞',
  'thigh-inner': '허벅지 안쪽',
  shin: '정강이',
  'neck-back': '목 뒤·어깨 위',
  'shoulder-back': '어깨 뒤',
  'upper-back': '등 상부(날개뼈 사이)',
  lats: '등 옆(겨드랑이 아래)',
  'low-back': '허리',
  glutes: '엉덩이',
  'hip-side': '골반 옆',
  'thigh-back': '허벅지 뒤',
  'thigh-outer': '허벅지 바깥',
  calf: '종아리',
};

// 근육명 키워드 → 부위. norms.ts의 한글 근육 표기(문장 통째)를 substring으로 매칭.
const MUSCLE_REGION_RULES: Array<{ kw: string[]; region: RegionId }> = [
  { kw: ['비복근', '가자미근', '후경골근', '슬와근', '비골근'], region: 'calf' },
  { kw: ['전경골근'], region: 'shin' },
  { kw: ['내전근', '박근'], region: 'thigh-inner' },
  { kw: ['장경인대', 'IT band', 'IT밴드'], region: 'thigh-outer' },
  { kw: ['햄스트링', '대퇴이두'], region: 'thigh-back' },
  { kw: ['대퇴직근', '내측광근', '외측광근', 'VMO', '봉공근', '사두'], region: 'thigh-front' },
  { kw: ['장요근', '고관절 굴곡근'], region: 'hip-front' },
  { kw: ['TFL', '소둔근'], region: 'hip-side' },
  { kw: ['대둔근', '중둔근', '이상근'], region: 'glutes' },
  { kw: ['척추기립근', '요방형근'], region: 'low-back' },
  { kw: ['광배근'], region: 'lats' },
  { kw: ['복횡근', '복직근', '복사근', '복근군', '심부 코어', 'TvA'], region: 'abs' },
  { kw: ['상부승모근', '상부 승모근', '견갑거근'], region: 'neck-back' },
  { kw: ['흉쇄유돌근', '사각근', '심부경부굴곡근', '심부 경부'], region: 'neck-front' },
  { kw: ['흉근'], region: 'chest' }, // 대흉근·소흉근·대·소흉근 모두 매칭
  { kw: ['전거근'], region: 'ribs-side' },
  { kw: ['능형근', '중·하부승모근', '중·하부 승모근', '중부승모근', '하부승모근', '중부 승모근', '하부 승모근'], region: 'upper-back' },
  { kw: ['회전근개', '후면 삼각근', '대원근'], region: 'shoulder-back' },
  { kw: ['오훼완근'], region: 'shoulder-front' },
];

function mapToRegions(texts: string[]): Set<RegionId> {
  const out = new Set<RegionId>();
  const joined = texts.join(' / ');
  for (const rule of MUSCLE_REGION_RULES) {
    if (rule.kw.some((k) => joined.includes(k))) out.add(rule.region);
  }
  return out;
}

// ── SVG 도형 정의 (좌표는 figure 중심 cx 기준 상대값) ──

type Shape = { cx: number; cy: number; rx: number; ry: number };
/** 부위별 표시 도형 — mirror true면 좌우 한 쌍 */
const REGION_SHAPES: Record<RegionId, { view: 'front' | 'back'; mirror: boolean; s: Shape }> = {
  'neck-front': { view: 'front', mirror: false, s: { cx: 0, cy: 62, rx: 11, ry: 9 } },
  'shoulder-front': { view: 'front', mirror: true, s: { cx: 38, cy: 82, rx: 11, ry: 8 } },
  chest: { view: 'front', mirror: true, s: { cx: 17, cy: 97, rx: 15, ry: 11 } },
  'ribs-side': { view: 'front', mirror: true, s: { cx: 31, cy: 127, rx: 6, ry: 14 } },
  abs: { view: 'front', mirror: false, s: { cx: 0, cy: 150, rx: 15, ry: 26 } },
  'hip-front': { view: 'front', mirror: true, s: { cx: 17, cy: 199, rx: 11, ry: 10 } },
  'thigh-front': { view: 'front', mirror: true, s: { cx: 18, cy: 262, rx: 11, ry: 34 } },
  'thigh-inner': { view: 'front', mirror: true, s: { cx: 6, cy: 256, rx: 5, ry: 30 } },
  shin: { view: 'front', mirror: true, s: { cx: 17, cy: 368, rx: 7, ry: 32 } },
  'neck-back': { view: 'back', mirror: false, s: { cx: 0, cy: 68, rx: 22, ry: 9 } },
  'shoulder-back': { view: 'back', mirror: true, s: { cx: 38, cy: 84, rx: 11, ry: 8 } },
  'upper-back': { view: 'back', mirror: false, s: { cx: 0, cy: 106, rx: 21, ry: 16 } },
  lats: { view: 'back', mirror: true, s: { cx: 21, cy: 140, rx: 11, ry: 19 } },
  'low-back': { view: 'back', mirror: false, s: { cx: 0, cy: 176, rx: 15, ry: 13 } },
  glutes: { view: 'back', mirror: true, s: { cx: 15, cy: 211, rx: 13, ry: 12 } },
  'hip-side': { view: 'back', mirror: true, s: { cx: 33, cy: 199, rx: 7, ry: 12 } },
  'thigh-back': { view: 'back', mirror: true, s: { cx: 18, cy: 262, rx: 11, ry: 34 } },
  'thigh-outer': { view: 'back', mirror: true, s: { cx: 30, cy: 258, rx: 5, ry: 30 } },
  calf: { view: 'back', mirror: true, s: { cx: 17, cy: 366, rx: 8, ry: 30 } },
};

/** 밑그림 실루엣 — cx 중심 */
function Silhouette({ cx }: { cx: number }) {
  const fill = '#ececec';
  const stroke = '#c8c8c8';
  const p = (d: string) => <path d={d} fill={fill} stroke={stroke} strokeWidth={1.2} strokeLinejoin="round" />;
  return (
    <g transform={`translate(${cx}, 0)`}>
      <circle cx={0} cy={36} r={19} fill={fill} stroke={stroke} strokeWidth={1.2} />
      <rect x={-7} y={53} width={14} height={13} rx={4} fill={fill} stroke={stroke} strokeWidth={1.2} />
      {/* 몸통 */}
      {p('M-42 74 L42 74 L30 165 L36 208 L-36 208 L-30 165 Z')}
      {/* 팔 */}
      {p('M-42 76 L-30 82 L-46 208 L-58 205 Z')}
      {p('M42 76 L30 82 L46 208 L58 205 Z')}
      {/* 다리 */}
      {p('M-34 208 L-4 208 L-8 330 L-10 424 L-27 424 L-31 330 Z')}
      {p('M34 208 L4 208 L8 330 L10 424 L27 424 L31 330 Z')}
      {/* 발 */}
      <ellipse cx={-19} cy={430} rx={12} ry={5.5} fill={fill} stroke={stroke} strokeWidth={1.2} />
      <ellipse cx={19} cy={430} rx={12} ry={5.5} fill={fill} stroke={stroke} strokeWidth={1.2} />
    </g>
  );
}

function RegionMarks({
  cx,
  view,
  over,
  under,
}: {
  cx: number;
  view: 'front' | 'back';
  over: Set<RegionId>;
  under: Set<RegionId>;
}) {
  const nodes: ReactNode[] = [];
  (Object.keys(REGION_SHAPES) as RegionId[]).forEach((id) => {
    const def = REGION_SHAPES[id];
    if (def.view !== view) return;
    const isOver = over.has(id);
    const isUnder = under.has(id);
    if (!isOver && !isUnder) return;
    const fill = isOver && isUnder ? 'url(#bm-split)' : isOver ? OVER_COLOR : UNDER_COLOR;
    const xs = def.mirror ? [def.s.cx, -def.s.cx] : [def.s.cx];
    xs.forEach((x, i) => {
      nodes.push(
        <ellipse
          key={`${id}-${i}`}
          cx={cx + x}
          cy={def.s.cy}
          rx={def.s.rx}
          ry={def.s.ry}
          fill={fill}
          opacity={0.6}
        />
      );
    });
  });
  return <>{nodes}</>;
}

export default function BodyMap({
  overactive,
  underactive,
}: {
  /** 과활성(이완 대상) 근육 문자열들 — 증후군·보상 데이터 원문 그대로 */
  overactive: string[];
  /** 저활성(강화 대상) 근육 문자열들 */
  underactive: string[];
}) {
  const over = mapToRegions(overactive);
  const under = mapToRegions(underactive);
  if (over.size === 0 && under.size === 0) return null;

  const label = (ids: Set<RegionId>) =>
    (Object.keys(REGION_LABELS) as RegionId[])
      .filter((id) => ids.has(id))
      .map((id) => REGION_LABELS[id])
      .join(' · ');

  return (
    <div className="mt-4">
      <div className="text-sm font-semibold mb-1" style={{ color: '#111' }}>
        교정 부위 한눈에 보기 <span className="text-xs font-normal" style={{ color: '#8a8a8a' }}>— 회원 설명용</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mb-2">
        <span>
          <span className="inline-block w-3 h-3 rounded-sm align-[-2px] mr-1" style={{ background: OVER_COLOR, opacity: 0.75 }} />
          <b style={{ color: OVER_COLOR }}>이완·스트레칭</b> <span style={{ color: '#555' }}>(뭉치고 짧아진 부위)</span>
        </span>
        <span>
          <span className="inline-block w-3 h-3 rounded-sm align-[-2px] mr-1" style={{ background: UNDER_COLOR, opacity: 0.75 }} />
          <b style={{ color: UNDER_COLOR }}>활성화·강화</b> <span style={{ color: '#555' }}>(약해진 부위)</span>
        </span>
      </div>
      <div className="rounded-xl p-2" style={{ border: '1px solid #e3e3e3', background: '#fcfcfc' }}>
        <svg viewBox="0 0 400 470" role="img" aria-label="교정 부위 인체도 — 앞·뒤" style={{ width: '100%', maxWidth: 420, display: 'block', margin: '0 auto' }}>
          <defs>
            {/* 이완+강화 모두 해당 시 대각 이분할 */}
            <linearGradient id="bm-split" x1="0" y1="0" x2="1" y2="1">
              <stop offset="50%" stopColor={OVER_COLOR} />
              <stop offset="50%" stopColor={UNDER_COLOR} />
            </linearGradient>
          </defs>
          <Silhouette cx={100} />
          <Silhouette cx={300} />
          <RegionMarks cx={100} view="front" over={over} under={under} />
          <RegionMarks cx={300} view="back" over={over} under={under} />
          <text x={100} y={460} textAnchor="middle" fontSize={13} fill="#8a8a8a">앞</text>
          <text x={300} y={460} textAnchor="middle" fontSize={13} fill="#8a8a8a">뒤</text>
        </svg>
      </div>
      <div className="text-xs mt-2 space-y-0.5">
        {over.size > 0 && (
          <p><b style={{ color: OVER_COLOR }}>이완·스트레칭:</b> <span style={{ color: '#333' }}>{label(over)}</span></p>
        )}
        {under.size > 0 && (
          <p><b style={{ color: UNDER_COLOR }}>활성화·강화:</b> <span style={{ color: '#333' }}>{label(under)}</span></p>
        )}
        <p style={{ color: '#9a9a9a' }}>표시는 대표 부위 기준의 개략도입니다 — 정확한 근육은 위 목록 참고.</p>
      </div>
    </div>
  );
}
