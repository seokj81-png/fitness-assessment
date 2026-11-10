// 카메라 관절 각도(시제품) — 자세 인식 점(MediaPipe Pose 33점)에서 옆모습 관절 각도를 계산한다.
// 카메라 한 대(2D)라서 카메라를 마주 보는 면의 굽힘·폄만 다룬다. 회전(내회전·외회전)은 다루지 않는다.

export type Pt = { x: number; y: number; visibility?: number };
export type Side = 'L' | 'R';

// MediaPipe Pose 점 번호
export const LM = {
  shoulder: { L: 11, R: 12 },
  elbow: { L: 13, R: 14 },
  wrist: { L: 15, R: 16 },
  hip: { L: 23, R: 24 },
  knee: { L: 25, R: 26 },
  ankle: { L: 27, R: 28 },
  heel: { L: 29, R: 30 },
  toe: { L: 31, R: 32 },
} as const;

export type AngleKey = 'knee' | 'hip' | 'ankle' | 'trunk' | 'shoulder';
export type Angles = Record<AngleKey, number | null>;

export const ANGLE_KEYS: AngleKey[] = ['knee', 'hip', 'ankle', 'trunk', 'shoulder'];

export const ANGLE_INFO: Record<AngleKey, { name: string; short: string; how: string }> = {
  knee: { name: '무릎 굽힘', short: '무릎', how: '곧게 편 상태 0° — 엉덩이·무릎·발목 세 점으로 계산' },
  hip: { name: '엉덩이 굽힘', short: '엉덩이', how: '곧게 선 상태 0° — 어깨·엉덩이·무릎 세 점으로 계산' },
  ankle: { name: '발목 굽힘 (정강이 기울기)', short: '발목', how: '정강이가 수직에서 앞으로 기운 각도 — 발바닥이 바닥에 붙어 있을 때의 발목 굽힘' },
  trunk: { name: '상체 기울기', short: '상체', how: '엉덩이→어깨 선이 수직에서 기운 각도' },
  shoulder: { name: '어깨 올림', short: '어깨', how: '팔을 내린 상태 0°, 몸통과 일직선으로 올리면 180° — 엉덩이·어깨·팔꿈치 세 점으로 계산' },
};

export const EMPTY_ANGLES: Angles = { knee: null, hip: null, ankle: null, trunk: null, shoulder: null };

const DEG = 180 / Math.PI;

// b에서 a·c를 바라본 사이각(0~180°)
export function angleAt(a: Pt, b: Pt, c: Pt): number {
  const v1x = a.x - b.x, v1y = a.y - b.y;
  const v2x = c.x - b.x, v2y = c.y - b.y;
  const n1 = Math.hypot(v1x, v1y), n2 = Math.hypot(v2x, v2y);
  if (n1 === 0 || n2 === 0) return 0;
  const cos = Math.min(1, Math.max(-1, (v1x * v2x + v1y * v2y) / (n1 * n2)));
  return Math.acos(cos) * DEG;
}

// from→to 선이 수직(위쪽)에서 기운 각도(0~180°). 화면 좌표는 y가 아래로 커진다.
export function tiltFromVertical(from: Pt, to: Pt): number {
  const vx = to.x - from.x, vy = to.y - from.y;
  const n = Math.hypot(vx, vy);
  if (n === 0) return 0;
  return Math.acos(Math.min(1, Math.max(-1, -vy / n))) * DEG;
}

const vis = (p?: Pt) => p?.visibility ?? 0;

// 정규화 좌표(0~1)를 픽셀 좌표로 — 가로세로 비율이 달라 그대로 쓰면 각도가 틀어진다.
export function toPixels(lm: Pt[], w: number, h: number): Pt[] {
  return lm.map((p) => ({ x: p.x * w, y: p.y * h, visibility: p.visibility }));
}

// 카메라 쪽 몸(더 잘 보이는 쪽)을 고른다. 깜빡이며 바뀌지 않게 차이가 0.1 넘을 때만 바꾼다.
export function pickSide(lm: Pt[], current: Side | null): Side {
  const score = (s: Side) =>
    (vis(lm[LM.shoulder[s]]) + vis(lm[LM.hip[s]]) + vis(lm[LM.knee[s]]) + vis(lm[LM.ankle[s]])) / 4;
  const l = score('L'), r = score('R');
  if (current && Math.abs(l - r) < 0.1) return current;
  return l >= r ? 'L' : 'R';
}

export type ViewState = 'none' | 'partial' | 'front' | 'ok';

// 화면 상태: 사람 없음 / 전신이 안 보임 / 옆모습 아님 / 측정 가능
export function viewCheck(px: Pt[] | undefined, side: Side, w: number, h: number, minVis = 0.5): ViewState {
  if (!px || px.length < 33) return 'none';
  const sh = px[LM.shoulder[side]], hp = px[LM.hip[side]], kn = px[LM.knee[side]], an = px[LM.ankle[side]];
  const inFrame = (p: Pt) => p.x >= 0 && p.x <= w && p.y >= 0 && p.y <= h;
  if ([sh, hp, kn, an].some((p) => vis(p) < minVis || !inFrame(p))) return 'partial';
  // 옆모습이면 두 어깨가 화면에서 거의 겹친다
  const torso = Math.hypot(sh.x - hp.x, sh.y - hp.y);
  const shoulderGap = Math.abs(px[LM.shoulder.L].x - px[LM.shoulder.R].x);
  if (torso > 0 && shoulderGap / torso > 0.5) return 'front';
  return 'ok';
}

export function computeAngles(px: Pt[], side: Side, minVis = 0.5): Angles {
  const g = (i: number) => (vis(px[i]) >= minVis ? px[i] : null);
  const sh = g(LM.shoulder[side]), el = g(LM.elbow[side]);
  const hp = g(LM.hip[side]), kn = g(LM.knee[side]), an = g(LM.ankle[side]);
  return {
    knee: hp && kn && an ? 180 - angleAt(hp, kn, an) : null,
    hip: sh && hp && kn ? 180 - angleAt(sh, hp, kn) : null,
    ankle: kn && an ? tiltFromVertical(an, kn) : null,
    trunk: sh && hp ? tiltFromVertical(hp, sh) : null,
    shoulder: sh && hp && el ? angleAt(hp, sh, el) : null,
  };
}

// 떨림 줄이기(지수 평활). 값이 사라지면 그대로 비운다.
export function smoothAngles(prev: Angles, next: Angles, alpha = 0.4): Angles {
  const out = { ...EMPTY_ANGLES };
  for (const k of ANGLE_KEYS) {
    const p = prev[k], n = next[k];
    out[k] = n == null ? null : p == null ? n : p + alpha * (n - p);
  }
  return out;
}
