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

// ─────────────────────────────────────────────────────────────
// 평가에 저장하는 카메라 측정값 — Assessment.rom(JSON: Record<string, number>)에 아래 키로 넣는다.
//   ohs_*  옆모습 오버헤드 스쿼트, 가장 깊이 앉은 순간
//   pf_*   서 있는 자세, 정면(또는 뒷모습)
//   ps_*   서 있는 자세, 옆모습
// 부호: lr = 양수면 오른쪽이 높음 / inout = 양수면 안쪽 / fwd = 양수면 앞쪽 (회원 본인 기준 좌우)
// ─────────────────────────────────────────────────────────────
export type CamGroup = 'squat' | 'front' | 'side';
export type CamKey =
  | 'ohs_knee' | 'ohs_hip' | 'ohs_ankle' | 'ohs_trunk' | 'ohs_shoulder'
  | 'pf_shoulder' | 'pf_pelvis' | 'pf_head' | 'pf_kneeL' | 'pf_kneeR'
  | 'ps_head' | 'ps_trunk' | 'ps_knee';
export type CamVals = Partial<Record<CamKey, number | null>>;

export interface CamMetric {
  key: CamKey;
  group: CamGroup;
  name: string;
  short: string;
  how: string;
  signed?: 'lr' | 'inout' | 'fwd';
}

export const CAM_GROUP_NAME: Record<CamGroup, string> = {
  squat: '오버헤드 스쿼트 (옆모습 · 가장 깊이 앉은 순간)',
  front: '서 있는 자세 — 정면',
  side: '서 있는 자세 — 옆모습',
};
export const CAM_GROUP_PREFIX: Record<CamGroup, string> = { squat: 'ohs_', front: 'pf_', side: 'ps_' };

export const CAM_METRICS: CamMetric[] = [
  { key: 'ohs_knee', group: 'squat', name: ANGLE_INFO.knee.name, short: '무릎', how: ANGLE_INFO.knee.how },
  { key: 'ohs_hip', group: 'squat', name: ANGLE_INFO.hip.name, short: '엉덩이', how: ANGLE_INFO.hip.how },
  { key: 'ohs_ankle', group: 'squat', name: ANGLE_INFO.ankle.name, short: '발목', how: ANGLE_INFO.ankle.how },
  { key: 'ohs_trunk', group: 'squat', name: ANGLE_INFO.trunk.name, short: '상체', how: ANGLE_INFO.trunk.how },
  { key: 'ohs_shoulder', group: 'squat', name: ANGLE_INFO.shoulder.name, short: '어깨', how: ANGLE_INFO.shoulder.how },
  { key: 'pf_head', group: 'front', name: '머리 기울기', short: '머리', how: '양쪽 귀를 이은 선이 수평에서 기운 각도', signed: 'lr' },
  { key: 'pf_shoulder', group: 'front', name: '어깨 기울기', short: '어깨', how: '양쪽 어깨를 이은 선이 수평에서 기운 각도', signed: 'lr' },
  { key: 'pf_pelvis', group: 'front', name: '골반 기울기', short: '골반', how: '양쪽 엉덩이 관절을 이은 선이 수평에서 기운 각도', signed: 'lr' },
  { key: 'pf_kneeL', group: 'front', name: '왼쪽 무릎 정렬', short: '왼무릎', how: '엉덩이·무릎·발목이 일직선에서 벗어난 각도 (안쪽 = X자 방향)', signed: 'inout' },
  { key: 'pf_kneeR', group: 'front', name: '오른쪽 무릎 정렬', short: '오른무릎', how: '엉덩이·무릎·발목이 일직선에서 벗어난 각도 (안쪽 = X자 방향)', signed: 'inout' },
  { key: 'ps_head', group: 'side', name: '머리 앞뒤 위치', short: '머리', how: '어깨→귀 선이 수직에서 기운 각도 (앞쪽 = 머리가 어깨보다 앞)', signed: 'fwd' },
  { key: 'ps_trunk', group: 'side', name: '몸통 기울기', short: '몸통', how: '엉덩이→어깨 선이 수직에서 기운 각도', signed: 'fwd' },
  { key: 'ps_knee', group: 'side', name: '무릎 굽힘', short: '무릎', how: '곧게 편 상태 0° — 엉덩이·무릎·발목 세 점으로 계산' },
];

export const camMetricsOf = (g: CamGroup) => CAM_METRICS.filter((m) => m.group === g);

const SIGN_WORD: Record<NonNullable<CamMetric['signed']>, [string, string]> = {
  lr: ['오른쪽 높음', '왼쪽 높음'],
  inout: ['안쪽', '바깥쪽'],
  fwd: ['앞쪽', '뒤쪽'],
};

// 화면 표시용: "3° 오른쪽 높음" · "12°" · "—"
export function formatCam(m: CamMetric, v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  const r = Math.round(Math.abs(v));
  if (!m.signed) return `${Math.round(v)}°`;
  if (r === 0) return '0°';
  return `${r}° ${SIGN_WORD[m.signed][v > 0 ? 0 : 1]}`;
}

// 좌·우 두 점을 이은 선의 기울기. 양수 = 오른쪽이 높음 (화면 좌표는 y가 아래로 커진다)
function tiltLR(l: Pt, r: Pt): number {
  const dx = Math.abs(l.x - r.x);
  if (dx === 0) return 0;
  return Math.atan2(l.y - r.y, dx) * DEG;
}

// 정면 무릎 정렬: 엉덩이–발목 직선에서 무릎이 벗어난 각도. 양수 = 몸 가운데(안쪽)로
function kneeFrontal(hip: Pt, knee: Pt, ankle: Pt, midX: number): number | null {
  const span = ankle.y - hip.y;
  if (span <= 0) return null;
  const xLine = hip.x + (ankle.x - hip.x) * ((knee.y - hip.y) / span);
  const dev = 180 - angleAt(hip, knee, ankle);
  const inward = (knee.x - xLine) * (midX - xLine) > 0;
  return inward ? dev : -dev;
}

const EAR = { L: 7, R: 8 } as const;

export function computePostureFront(px: Pt[], minVis = 0.5): CamVals {
  const g = (i: number) => (vis(px[i]) >= minVis ? px[i] : null);
  const eL = g(EAR.L), eR = g(EAR.R);
  const sL = g(LM.shoulder.L), sR = g(LM.shoulder.R);
  const hL = g(LM.hip.L), hR = g(LM.hip.R);
  const kL = g(LM.knee.L), kR = g(LM.knee.R);
  const aL = g(LM.ankle.L), aR = g(LM.ankle.R);
  const midX = hL && hR ? (hL.x + hR.x) / 2 : null;
  return {
    pf_head: eL && eR ? tiltLR(eL, eR) : null,
    pf_shoulder: sL && sR ? tiltLR(sL, sR) : null,
    pf_pelvis: hL && hR ? tiltLR(hL, hR) : null,
    pf_kneeL: midX != null && hL && kL && aL ? kneeFrontal(hL, kL, aL, midX) : null,
    pf_kneeR: midX != null && hR && kR && aR ? kneeFrontal(hR, kR, aR, midX) : null,
  };
}

// 옆모습에서 몸이 바라보는 쪽: +1 = 화면 오른쪽, -1 = 화면 왼쪽
export function facingDir(px: Pt[], side: Side): number {
  const heel = px[LM.heel[side]], toe = px[LM.toe[side]];
  if (vis(heel) >= 0.5 && vis(toe) >= 0.5 && toe.x !== heel.x) return Math.sign(toe.x - heel.x);
  const nose = px[0], ear = px[EAR[side]];
  if (nose && ear && nose.x !== ear.x) return Math.sign(nose.x - ear.x);
  return 1;
}

export function computePostureSide(px: Pt[], side: Side, minVis = 0.5): CamVals {
  const g = (i: number) => (vis(px[i]) >= minVis ? px[i] : null);
  const ear = g(EAR[side]), sh = g(LM.shoulder[side]), hp = g(LM.hip[side]), kn = g(LM.knee[side]), an = g(LM.ankle[side]);
  const f = facingDir(px, side);
  const signed = (from: Pt, to: Pt) => {
    const t = tiltFromVertical(from, to);
    return (to.x - from.x) * f >= 0 ? t : -t;
  };
  return {
    ps_head: ear && sh ? signed(sh, ear) : null,
    ps_trunk: sh && hp ? signed(hp, sh) : null,
    ps_knee: hp && kn && an ? 180 - angleAt(hp, kn, an) : null,
  };
}

export const EAR_LM = EAR;

// 떨림 줄이기(키가 정해지지 않은 값 묶음용)
export function smoothVals(prev: CamVals, next: CamVals, alpha = 0.4): CamVals {
  const out: CamVals = {};
  for (const k of Object.keys(next) as CamKey[]) {
    const p = prev[k], n = next[k];
    out[k] = n == null ? null : p == null ? n : p + alpha * (n - p);
  }
  return out;
}

// 저장된 rom(JSON)에서 카메라 측정값이 있는 묶음만 골라낸다
export function camGroupsIn(rom: Record<string, number> | null | undefined): CamGroup[] {
  if (!rom) return [];
  return (['front', 'side', 'squat'] as CamGroup[]).filter((g) => camMetricsOf(g).some((m) => typeof rom[m.key] === 'number'));
}
