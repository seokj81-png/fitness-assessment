import type { ReactNode } from 'react';

// 인체 모형 교정 부위 색표시 — 회원 설명용 (트레이너 피드백: "근육 명칭보다 부위로")
// 이완(빨강)과 강화(파랑)를 별도 패널로 분리해 각각 앞·뒤 그림에 단색으로 표시한다.
// 부위 배치는 표준 전신 근육 차트(전면/후면) 기준. 마크는 실루엣에 clipPath로 잘라 몸 밖으로 나가지 않는다.

const OVER_COLOR = '#b42318'; // 과활성 = 이완·스트레칭 (기능색 예외 — 빨강)
const UNDER_COLOR = '#175cd3'; // 저활성 = 활성화·강화 (기능색 예외 — 파랑)
const BODY_FILL = '#e8e8ec';

type RegionId =
  | 'neck-front' | 'neck-deep' | 'shoulder-front' | 'chest' | 'ribs-side' | 'abs' | 'abs-deep'
  | 'hip-front' | 'hip-front-outer' | 'thigh-front' | 'thigh-front-inner' | 'thigh-front-outer'
  | 'thigh-inner' | 'shin'
  | 'neck-back' | 'shoulder-back' | 'upper-back' | 'lats' | 'low-back'
  | 'glutes' | 'glute-deep' | 'hip-side'
  | 'thigh-back' | 'thigh-back-inner' | 'thigh-outer' | 'knee-back'
  | 'calf' | 'calf-inner' | 'calf-outer';

const REGION_LABELS: Record<RegionId, string> = {
  'neck-front': '목 앞·옆',
  'neck-deep': '목 앞 깊은 근육',
  'shoulder-front': '어깨 앞',
  chest: '가슴',
  'ribs-side': '옆갈비(겨드랑이 아래)',
  abs: '복부(겉 근육)',
  'abs-deep': '복부 깊은 근육(코어)',
  'hip-front': '고관절 앞(사타구니)',
  'hip-front-outer': '골반 앞·옆(허벅지 바깥 위)',
  'thigh-front': '허벅지 앞',
  'thigh-front-inner': '무릎 위 안쪽',
  'thigh-front-outer': '허벅지 앞 바깥',
  'thigh-inner': '허벅지 안쪽',
  shin: '정강이',
  'neck-back': '목 뒤·어깨 위',
  'shoulder-back': '어깨 뒤',
  'upper-back': '등 상부(날개뼈 사이)',
  lats: '등 옆(광배근)',
  'low-back': '허리(척추 옆)',
  glutes: '엉덩이',
  'glute-deep': '엉덩이 깊은 근육',
  'hip-side': '골반 옆(엉덩이 위 바깥)',
  'thigh-back': '허벅지 뒤',
  'thigh-back-inner': '허벅지 뒤 안쪽',
  'thigh-outer': '허벅지 바깥(IT밴드)',
  'knee-back': '무릎 뒤',
  calf: '종아리',
  'calf-inner': '종아리 안쪽',
  'calf-outer': '종아리 바깥',
};

// 근육 토큰 → 부위. 원문을 쉼표·가운뎃점 등으로 토큰화한 뒤,
// 각 토큰마다 "가장 먼저 일치하는 규칙 1개"만 적용 (구체적 규칙을 앞에 배치).
// 한 보상 항목에서 과활성/저활성이 늘 반대편에 나오는 쌍(TFL↔중둔근, 표층 복근↔심부 코어,
// 대원근↔회전근개, 가자미근↔슬와근)은 서로 다른 부위로 분리해 두 패널이 같은 부위를 가리키지 않게 한다.
const MUSCLE_REGION_RULES: Array<{ kw: string[]; region: RegionId }> = [
  { kw: ['내측 비복근'], region: 'calf-inner' },
  { kw: ['외측 비복근'], region: 'calf-outer' },
  { kw: ['후경골근'], region: 'calf-inner' },
  { kw: ['전경골근'], region: 'shin' },
  { kw: ['비골근'], region: 'calf-outer' },
  { kw: ['슬와근'], region: 'knee-back' },
  { kw: ['비복근', '가자미근'], region: 'calf' },
  { kw: ['내측 햄스트링'], region: 'thigh-back-inner' },
  { kw: ['햄스트링', '대퇴이두', '반건양근', '반막양근'], region: 'thigh-back' },
  { kw: ['내측광근', 'VMO'], region: 'thigh-front-inner' },
  { kw: ['외측광근'], region: 'thigh-front-outer' },
  { kw: ['대퇴직근', '봉공근', '사두'], region: 'thigh-front' },
  { kw: ['내전근', '박근'], region: 'thigh-inner' },
  { kw: ['장경인대', 'IT band', 'IT밴드'], region: 'thigh-outer' },
  { kw: ['장요근', '고관절 굴곡근'], region: 'hip-front' },
  { kw: ['TFL', '대퇴근막장근'], region: 'hip-front-outer' },
  { kw: ['소둔근', '이상근'], region: 'glute-deep' },
  { kw: ['중둔근'], region: 'hip-side' },
  { kw: ['대둔근', '둔근'], region: 'glutes' },
  { kw: ['척추기립근', '기립근', '요방형근'], region: 'low-back' },
  { kw: ['광배근', '대원근'], region: 'lats' },
  { kw: ['복횡근', '심부 코어', 'TvA'], region: 'abs-deep' },
  { kw: ['복직근', '복사근', '복근'], region: 'abs' },
  { kw: ['상부승모근', '상부 승모근', '견갑거근'], region: 'neck-back' },
  { kw: ['심부경부굴곡근', '심부 경부', '심부 경추', '경추 굴곡근'], region: 'neck-deep' },
  { kw: ['흉쇄유돌근', '사각근', 'SCM'], region: 'neck-front' },
  { kw: ['흉근'], region: 'chest' }, // 대흉근·소흉근
  { kw: ['전거근'], region: 'ribs-side' },
  { kw: ['능형근', '하부승모근', '중부승모근', '하부 승모근', '중부 승모근', '승모근'], region: 'upper-back' },
  { kw: ['회전근개', '후면 삼각근', '극하근', '소원근'], region: 'shoulder-back' },
  { kw: ['오훼완근'], region: 'shoulder-front' },
];

function mapToRegions(texts: string[]): Set<RegionId> {
  const out = new Set<RegionId>();
  const tokens = texts
    .join(',')
    .split(/[,·/()]/)
    .map((t) => t.trim())
    .filter(Boolean);
  for (const token of tokens) {
    const rule = MUSCLE_REGION_RULES.find((r) => r.kw.some((k) => token.includes(k)));
    if (rule) out.add(rule.region);
  }
  return out;
}

// ── 표시 도형 (figure 중심 x=0 기준 좌표) ──

type Mark =
  | { kind: 'e'; x: number; y: number; rx: number; ry: number; rot?: number }
  | { kind: 'p'; d: string };

/** 좌우 대칭 타원 한 쌍 */
const pair = (x: number, y: number, rx: number, ry: number, rot = 0): Mark[] => [
  { kind: 'e', x, y, rx, ry, rot },
  { kind: 'e', x: -x, y, rx, ry, rot: -rot },
];

const REGION_MARKS: Record<RegionId, { view: 'front' | 'back'; marks: Mark[] }> = {
  // ── 앞 ──
  'neck-front': { view: 'front', marks: pair(6, 55, 3.5, 8, 15) },
  'neck-deep': { view: 'front', marks: [{ kind: 'e', x: 0, y: 58, rx: 4.5, ry: 7 }] },
  'shoulder-front': { view: 'front', marks: pair(39, 81, 8.5, 9.5) },
  chest: { view: 'front', marks: pair(18, 93, 15, 12, 10) },
  'ribs-side': { view: 'front', marks: pair(32, 120, 5.5, 12, -10) },
  abs: { view: 'front', marks: [{ kind: 'e', x: 0, y: 144, rx: 13, ry: 28 }] },
  'abs-deep': { view: 'front', marks: [{ kind: 'e', x: 0, y: 166, rx: 9, ry: 13 }] },
  'hip-front': { view: 'front', marks: pair(13, 200, 8, 11, 25) },
  'hip-front-outer': { view: 'front', marks: pair(31, 197, 6, 11) },
  'thigh-front': { view: 'front', marks: pair(20, 260, 10, 36) },
  'thigh-front-inner': { view: 'front', marks: pair(14, 278, 4.5, 21) },
  'thigh-front-outer': { view: 'front', marks: pair(27, 255, 5.5, 30) },
  'thigh-inner': { view: 'front', marks: pair(10, 248, 4.5, 25) },
  shin: { view: 'front', marks: pair(18, 352, 5.5, 30) },
  // ── 뒤 ──
  'neck-back': {
    view: 'back',
    // 상부승모근 — 목에서 양쪽 어깨로 퍼지는 쐐기 (실루엣의 목→어깨 경사 위에 놓임)
    marks: [{ kind: 'p', d: 'M-8 51 Q0 47 8 51 L36 78 Q18 70 0 68 Q-18 70 -36 78 Z' }],
  },
  'shoulder-back': { view: 'back', marks: pair(39, 83, 9, 10) },
  'upper-back': { view: 'back', marks: [{ kind: 'e', x: 0, y: 102, rx: 13, ry: 22 }] },
  lats: { view: 'back', marks: pair(20, 134, 11, 21, 14) },
  'low-back': { view: 'back', marks: pair(7, 172, 5.5, 17) }, // 기립근 두 기둥
  'hip-side': { view: 'back', marks: pair(31, 196, 6.5, 11) },
  glutes: { view: 'back', marks: pair(16, 211, 14, 13) },
  'glute-deep': { view: 'back', marks: pair(14, 207, 7, 4.5, -20) },
  'thigh-back': { view: 'back', marks: pair(19, 262, 10, 36) },
  'thigh-back-inner': { view: 'back', marks: pair(13, 262, 4.5, 30) },
  'thigh-outer': { view: 'back', marks: pair(30, 256, 3, 28) },
  'knee-back': { view: 'back', marks: pair(17, 302, 6.5, 6) },
  calf: { view: 'back', marks: pair(18, 342, 7, 26) },
  'calf-inner': { view: 'back', marks: pair(15, 342, 3.5, 23) },
  'calf-outer': { view: 'back', marks: pair(22, 342, 4.5, 24) },
};

/** 실루엣 도형 — 윤곽선 없이 같은 색으로 겹쳐 매끈한 단일 실루엣으로 합성. clipPath에도 재사용 */
function SilhouetteShapes() {
  return (
    <>
      {/* 머리·목 */}
      <ellipse cx={0} cy={30} rx={16} ry={19} />
      <rect x={-9} y={42} width={18} height={26} rx={6} />
      {/* 목→어깨 경사 (승모근 라인) */}
      <path d="M-9 56 L-42 73 L42 73 L9 56 Z" />
      {/* 몸통 — 어깨→가슴→허리→골반 */}
      <path d="M-44 72 C-47 77 -47 84 -46 92 C-44 114 -36 130 -32 146 C-29 160 -30 172 -34 184 C-38 196 -40 206 -38 216 C-36 222 -24 227 0 227 C24 227 36 222 38 216 C40 206 38 196 34 184 C30 172 29 160 32 146 C36 130 44 114 46 92 C47 84 47 77 44 72 C28 62 -28 62 -44 72 Z" />
      {/* 어깨 둥글림 */}
      <circle cx={-38} cy={76} r={10} />
      <circle cx={38} cy={76} r={10} />
      {/* 팔 — 어깨에서 손목까지 완만히 벌어지는 밴드 */}
      <path d="M-44 70 C-52 74 -55 86 -56 102 L-60 186 C-60 196 -59 202 -58 208 L-47 208 C-47 200 -47 193 -48 186 L-45 104 C-44 92 -42 80 -38 73 Z" />
      <path d="M44 70 C52 74 55 86 56 102 L60 186 C60 196 59 202 58 208 L47 208 C47 200 47 193 48 186 L45 104 C44 92 42 80 38 73 Z" />
      <ellipse cx={-54} cy={216} rx={6.5} ry={9} />
      <ellipse cx={54} cy={216} rx={6.5} ry={9} />
      {/* 다리 */}
      <path d="M-38 212 C-36 248 -32 276 -29 300 C-30 322 -28 342 -25 362 C-23 378 -22 390 -21 400 L-9 400 C-9 388 -10 374 -11 360 C-13 336 -13 314 -12 298 C-10 272 -7 248 -4 226 C-14 221 -28 218 -38 212 Z" />
      <path d="M38 212 C36 248 32 276 29 300 C30 322 28 342 25 362 C23 378 22 390 21 400 L9 400 C9 388 10 374 11 360 C13 336 13 314 12 298 C10 272 7 248 4 226 C14 221 28 218 38 212 Z" />
      {/* 발 */}
      <ellipse cx={-16} cy={408} rx={12.5} ry={6.5} />
      <ellipse cx={16} cy={408} rx={12.5} ry={6.5} />
    </>
  );
}

function Marks({ view, regions, color }: { view: 'front' | 'back'; regions: Set<RegionId>; color: string }) {
  const nodes: ReactNode[] = [];
  (Object.keys(REGION_MARKS) as RegionId[]).forEach((id) => {
    const def = REGION_MARKS[id];
    if (def.view !== view || !regions.has(id)) return;
    def.marks.forEach((m, i) => {
      // 흰 테두리 — 세부 부위가 겹칠 때 각 타원이 구분돼 보이도록
      if (m.kind === 'p') {
        nodes.push(<path key={`${id}-${i}`} d={m.d} fill={color} fillOpacity={0.72} stroke="#fff" strokeWidth={1.2} />);
      } else {
        nodes.push(
          <ellipse
            key={`${id}-${i}`}
            cx={m.x}
            cy={m.y}
            rx={m.rx}
            ry={m.ry}
            fill={color}
            fillOpacity={0.72}
            stroke="#fff"
            strokeWidth={1.2}
            transform={m.rot ? `rotate(${m.rot} ${m.x} ${m.y})` : undefined}
          />
        );
      }
    });
  });
  return <>{nodes}</>;
}

/** 한 인체(앞 또는 뒤) — 실루엣 + 실루엣으로 클리핑된 마크 */
function Figure({ view, regions, color, clipId }: { view: 'front' | 'back'; regions: Set<RegionId>; color: string; clipId: string }) {
  return (
    <>
      <g fill={BODY_FILL}>
        <SilhouetteShapes />
      </g>
      <g clipPath={`url(#${clipId})`}>
        <Marks view={view} regions={regions} color={color} />
      </g>
    </>
  );
}

/** 앞·뒤 인체 한 쌍에 단색 마킹 — 패널 1개 */
function FigurePanel({
  panelKey,
  regions,
  both,
  color,
  title,
  subtitle,
}: {
  panelKey: string;
  regions: Set<RegionId>;
  /** 이완·강화 양쪽에 모두 등장하는 부위 — 라벨에 ※ 표시 */
  both: Set<RegionId>;
  color: string;
  title: string;
  subtitle: string;
}) {
  // clipPath는 참조 요소의 좌표계(figure 로컬)로 적용되므로 앞·뒤 그림이 같은 정의를 공유
  const clipId = `bm-clip-${panelKey}`;
  const labels = (Object.keys(REGION_LABELS) as RegionId[])
    .filter((id) => regions.has(id))
    .map((id) => REGION_LABELS[id] + (both.has(id) ? '※' : ''));
  return (
    <div className="rounded-xl p-3" style={{ border: '1px solid #e3e3e3', background: '#fff', breakInside: 'avoid' }}>
      <div className="text-sm font-bold" style={{ color }}>
        <span className="inline-block w-3 h-3 rounded-sm align-[-1px] mr-1.5" style={{ background: color, opacity: 0.8 }} />
        {title}
      </div>
      <div className="text-xs mb-1" style={{ color: '#6e6e6e' }}>{subtitle}</div>
      <svg viewBox="0 0 360 468" role="img" aria-label={`${title} 부위 인체도`} style={{ width: '100%', maxWidth: 330, display: 'block', margin: '0 auto' }}>
        <defs>
          <clipPath id={clipId}>
            <SilhouetteShapes />
          </clipPath>
        </defs>
        <g transform="translate(95, 4)">
          <Figure view="front" regions={regions} color={color} clipId={clipId} />
        </g>
        <g transform="translate(265, 4)">
          <Figure view="back" regions={regions} color={color} clipId={clipId} />
        </g>
        <text x={95} y={448} textAnchor="middle" fontSize={14} fill="#8a8a8a">앞</text>
        <text x={265} y={448} textAnchor="middle" fontSize={14} fill="#8a8a8a">뒤</text>
      </svg>
      <p className="text-xs mt-1.5" style={{ color: '#333' }}>
        <b style={{ color }}>{labels.join(' · ')}</b>
      </p>
    </div>
  );
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
  // 양쪽에 모두 등장하는 부위 — 좌우가 다른 보상(비대칭 체중 이동 등)이나
  // 여러 소견이 겹칠 때 생김. 회원이 모순으로 읽지 않도록 ※로 안내
  const both = new Set<RegionId>([...over].filter((id) => under.has(id)));

  return (
    <div className="mt-4">
      <div className="text-sm font-semibold mb-2" style={{ color: '#111' }}>
        교정 부위 한눈에 보기 <span className="text-xs font-normal" style={{ color: '#8a8a8a' }}>— 회원 설명용</span>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {over.size > 0 && (
          <FigurePanel
            panelKey="over"
            regions={over}
            both={both}
            color={OVER_COLOR}
            title="이완·스트레칭 (풀어주기)"
            subtitle="뭉치고 짧아져 있는 부위 — 폼롤러·스트레칭으로 풀어주세요"
          />
        )}
        {under.size > 0 && (
          <FigurePanel
            panelKey="under"
            regions={under}
            both={both}
            color={UNDER_COLOR}
            title="활성화·강화 (키워주기)"
            subtitle="제 역할을 못 하고 있는 부위 — 운동으로 깨워주세요"
          />
        )}
      </div>
      <p className="text-xs mt-1.5" style={{ color: '#6e6e6e' }}>
        표시는 대표 부위 기준의 개략도입니다 — 정확한 근육 목록은 위 자세·움직임 분석 참고.
        {both.size > 0 && (
          <>
            {' '}
            <b>※ 부위</b>는 좌우가 다르거나 여러 소견이 겹쳐 풀어줄 근육과 키워줄 근육이 같은 부위에 함께 있는 경우입니다.
          </>
        )}
      </p>
    </div>
  );
}
