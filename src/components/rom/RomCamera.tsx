'use client';

// 카메라 관절 각도 — 두 가지로 쓴다.
//   squat   옆모습 오버헤드 스쿼트: 「측정 시작/끝」 → 최대값·가장 깊이 앉은 순간
//   posture 서 있는 자세: 정면(뒷모습)·옆모습을 알아서 구분 → 「지금 자세 기록」
// 영상은 기기 안에서만 처리한다(서버로 보내지 않음). onApply가 있으면 잰 값을 평가 입력으로 돌려준다.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PoseLandmarker } from '@mediapipe/tasks-vision';
import {
  ANGLE_INFO,
  ANGLE_KEYS,
  CAM_GROUP_PREFIX,
  EAR_LM,
  EMPTY_ANGLES,
  LM,
  camMetricsOf,
  computeAngles,
  computePostureFront,
  computePostureSide,
  formatCam,
  pickSide,
  smoothAngles,
  smoothVals,
  toPixels,
  viewCheck,
  type Angles,
  type CamKey,
  type CamVals,
  type Pt,
  type Side,
  type ViewState,
} from '@/lib/pose-angles';

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task';

export type CamMode = 'squat' | 'posture';
export interface CamApply {
  /** 평가(rom)에 넣을 값 */
  rom: Record<string, number>;
  /** 이번에 잰 묶음의 키 앞머리 — 받는 쪽은 이 앞머리의 옛 값을 지우고 rom을 넣는다 */
  prefixes: string[];
  /** 같이 남길 화면 캡처(압축 JPEG dataURL) */
  photos: string[];
}

type Source = 'none' | 'camera' | 'video' | 'image';
type Phase = 'ready' | 'measuring' | 'done';
type Peak = { max: Angles; deep: Angles | null };
type PView = 'front' | 'side';
type Capture = { vals: CamVals; snap: string | null };

const newPeak = (): Peak => ({ max: { ...EMPTY_ANGLES }, deep: null });
const fmt = (v: number | null | undefined) => (v == null ? '—' : `${Math.round(v)}°`);
const round1 = (v: number) => Math.round(v * 10) / 10;

const GUIDE_SQUAT: Record<ViewState, string> = {
  none: '사람이 보이지 않습니다. 머리부터 발끝까지 화면에 들어오게 해 주세요.',
  partial: '몸 일부가 가려졌거나 화면 밖입니다. 머리부터 발끝까지 보이게 뒤로 물러나 주세요.',
  front: '옆모습으로 서 주세요. 몸의 옆면이 카메라를 바라봐야 합니다.',
  ok: '측정할 수 있습니다.',
};
const GUIDE_POSTURE: Record<ViewState, string> = {
  none: GUIDE_SQUAT.none,
  partial: GUIDE_SQUAT.partial,
  front: '정면(또는 뒷모습)으로 인식했습니다. 편하게 선 자세에서 「지금 자세 기록」을 눌러 주세요.',
  ok: '옆모습으로 인식했습니다. 편하게 선 자세에서 「지금 자세 기록」을 눌러 주세요.',
};

// 화면 캡처를 사진 칸에 넣을 크기로 줄인다 (자세 사진과 같은 기준: 긴 쪽 900px, JPEG 0.72)
function shrink(src: HTMLCanvasElement | null): string | null {
  if (!src || !src.width || !src.height) return null;
  try {
    const scale = Math.min(1, 900 / Math.max(src.width, src.height));
    const c = document.createElement('canvas');
    c.width = Math.round(src.width * scale);
    c.height = Math.round(src.height * scale);
    c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.72);
  } catch {
    return null;
  }
}

export default function RomCamera({
  mode: modeProp,
  onApply,
  photoRoom = 0,
}: {
  /** 정해 주면 그 방식만 쓴다(평가 입력 화면). 없으면 화면에서 고른다. */
  mode?: CamMode;
  onApply?: (r: CamApply) => void;
  /** 평가의 자세 사진 칸에 남은 자리 수 */
  photoRoom?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const snapRef = useRef<HTMLCanvasElement | null>(null);
  const plRef = useRef<PoseLandmarker | null>(null);
  const plPromiseRef = useRef<Promise<PoseLandmarker> | null>(null);
  const runIdRef = useRef(0); // 시작 요청이 겹치면 마지막 것만 살린다
  const streamRef = useRef<MediaStream | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const rafRef = useRef(0);
  const lastTsRef = useRef(0);
  const lastUiRef = useRef(0);
  const fpsRef = useRef(0);
  const sideRef = useRef<Side | null>(null);
  const smoothRef = useRef<Angles>({ ...EMPTY_ANGLES });
  const phaseRef = useRef<Phase>('ready');
  const peakRef = useRef<Peak>(newPeak());
  // 자세 방식
  const pViewRef = useRef<PView | null>(null);
  const pSmoothRef = useRef<CamVals>({});
  const pBufRef = useRef<{ ts: number; vals: CamVals }[]>([]);

  const [mode, setMode] = useState<CamMode>(modeProp ?? 'squat');
  const modeRef = useRef<CamMode>(mode);
  modeRef.current = mode;

  const [source, setSource] = useState<Source>('none');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [paused, setPaused] = useState(false);
  const [live, setLive] = useState<Angles>({ ...EMPTY_ANGLES });
  const [liveP, setLiveP] = useState<CamVals>({});
  const [pView, setPView] = useState<PView | null>(null);
  const [view, setView] = useState<ViewState>('none');
  const [side, setSide] = useState<Side | null>(null);
  const [fps, setFps] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const [result, setResult] = useState<Peak | null>(null);
  const [snapUrl, setSnapUrl] = useState<string | null>(null);
  const [caps, setCaps] = useState<Partial<Record<PView, Capture>>>({});
  const [withPhoto, setWithPhoto] = useState(true);

  const ensureLandmarker = useCallback(() => {
    if (plPromiseRef.current) return plPromiseRef.current;
    setLoading('자세 인식 준비 중… (처음 한 번만 몇 초 걸립니다)');
    const p = (async () => {
      const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
      const make = (delegate: 'GPU' | 'CPU') =>
        PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate },
          runningMode: 'VIDEO',
          numPoses: 1,
        });
      try {
        return await make('GPU');
      } catch {
        return await make('CPU');
      }
    })();
    plPromiseRef.current = p;
    p.catch(() => {
      if (plPromiseRef.current === p) plPromiseRef.current = null;
    });
    return p;
  }, []);

  const stopSource = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.srcObject = null;
      v.removeAttribute('src');
      v.load();
    }
    imgRef.current = null;
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  // 새 화면을 열 때: 스쿼트 측정은 처음부터, 자세 기록(정면·옆모습)은 그대로 둔다
  const resetMeasure = useCallback(() => {
    phaseRef.current = 'ready';
    peakRef.current = newPeak();
    smoothRef.current = { ...EMPTY_ANGLES };
    sideRef.current = null;
    lastTsRef.current = 0;
    fpsRef.current = 0;
    pViewRef.current = null;
    pSmoothRef.current = {};
    pBufRef.current = [];
    setPhase('ready');
    setResult(null);
    setSnapUrl(null);
  }, []);

  // 한 프레임: 자세 인식 → 각도 계산 → 화면에 그리기
  const tick = useCallback(() => {
    rafRef.current = requestAnimationFrame(tick);
    const canvas = canvasRef.current;
    const pl = plRef.current;
    if (!canvas || !pl) return;
    const img = imgRef.current;
    const v = videoRef.current;
    const src: HTMLImageElement | HTMLVideoElement | null = img ?? v;
    if (!src) return;
    const W = img ? img.naturalWidth : v!.videoWidth;
    const H = img ? img.naturalHeight : v!.videoHeight;
    if (!W || !H || (!img && v!.readyState < 2)) return;
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }

    let ts = performance.now();
    if (ts <= lastTsRef.current) ts = lastTsRef.current + 1;
    const dt = lastTsRef.current ? ts - lastTsRef.current : 33;
    lastTsRef.current = ts;
    fpsRef.current = fpsRef.current ? fpsRef.current * 0.8 + (1000 / dt) * 0.2 : 1000 / dt;
    // 떨림 줄이기는 시간 기준(약 0.08초)으로 — 인식이 느린 기기에서도 최대값이 깎이지 않게 한다
    const alpha = Math.max(0.3, 1 - Math.exp(-dt / 80));

    // 화면을 먼저 캔버스에 그리고, 그 캔버스로 자세를 인식한다 —
    // 인식하는 동안 영상이 앞으로 가도 뼈대 선과 화면이 어긋나지 않는다.
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(src, 0, 0, W, H);

    let lm: Pt[] | undefined;
    try {
      lm = pl.detectForVideo(canvas, ts).landmarks[0];
    } catch {
      return;
    }

    const cssScale = canvas.clientWidth ? W / canvas.clientWidth : 1;
    let state: ViewState = 'none';
    let angles: Angles = { ...EMPTY_ANGLES };
    let pVals: CamVals = {};
    let pv: PView | null = null;

    if (lm && lm.length >= 33) {
      const s = pickSide(lm, sideRef.current);
      sideRef.current = s;
      const px = toPixels(lm, W, H);
      state = viewCheck(px, s, W, H);

      if (modeRef.current === 'squat') {
        angles = smoothAngles(smoothRef.current, computeAngles(px, s), alpha);
        smoothRef.current = angles;
        drawSquat(ctx, px, s, angles, W, H, cssScale);

        if (phaseRef.current === 'measuring' && state !== 'none') {
          const pk = peakRef.current;
          for (const k of ANGLE_KEYS) {
            const a = angles[k];
            if (a != null && (pk.max[k] == null || a > pk.max[k]!)) pk.max[k] = a;
          }
          // 가장 깊이 앉은 순간 = 무릎이 가장 많이 굽은 프레임 — 그때의 각도와 화면을 남긴다
          if (angles.knee != null && (pk.deep?.knee == null || angles.knee > pk.deep.knee)) {
            pk.deep = { ...angles };
            const snap = (snapRef.current ??= document.createElement('canvas'));
            if (snap.width !== W || snap.height !== H) {
              snap.width = W;
              snap.height = H;
            }
            snap.getContext('2d')?.drawImage(canvas, 0, 0);
          }
        }
      } else {
        pv = state === 'front' ? 'front' : state === 'ok' ? 'side' : null;
        if (pv !== pViewRef.current) {
          pViewRef.current = pv;
          pSmoothRef.current = {};
          pBufRef.current = [];
        }
        if (pv) {
          pVals = smoothVals(pSmoothRef.current, pv === 'front' ? computePostureFront(px) : computePostureSide(px, s), alpha);
          pSmoothRef.current = pVals;
          const buf = pBufRef.current;
          buf.push({ ts, vals: pVals });
          while (buf.length && ts - buf[0].ts > 1000) buf.shift();
          if (pv === 'front') drawFront(ctx, px, pVals, W, H, cssScale);
          else drawSide(ctx, px, s, pVals, W, H, cssScale);
        }
      }
    } else {
      smoothRef.current = { ...EMPTY_ANGLES };
      pViewRef.current = null;
      pSmoothRef.current = {};
      pBufRef.current = [];
    }

    if (ts - lastUiRef.current > 120) {
      lastUiRef.current = ts;
      setLive(angles);
      setLiveP(pVals);
      setPView(pv);
      setView(state);
      setSide(sideRef.current);
      setFps(fpsRef.current);
    }
  }, []);

  const begin = useCallback(
    async (kind: Source, attach: () => Promise<void>) => {
      const runId = ++runIdRef.current;
      setError(null);
      stopSource();
      resetMeasure();
      try {
        const pl = await ensureLandmarker();
        if (runId !== runIdRef.current) return;
        plRef.current = pl;
        setLoading(kind === 'camera' ? '카메라 여는 중…' : '불러오는 중…');
        await attach();
        if (runId !== runIdRef.current) return;
        cancelAnimationFrame(rafRef.current);
        setSource(kind);
        setPaused(false);
        setLoading(null);
        rafRef.current = requestAnimationFrame(tick);
      } catch (e) {
        if (runId !== runIdRef.current) return;
        stopSource();
        setSource('none');
        setLoading(null);
        const name = (e as { name?: string })?.name;
        setError(
          name === 'NotAllowedError'
            ? '카메라 사용이 허용되지 않았습니다. 브라우저 주소창의 카메라 권한을 허용해 주세요.'
            : name === 'NotFoundError'
              ? '이 기기에서 카메라를 찾지 못했습니다. 촬영한 영상 파일로 시험해 보세요.'
              : `시작하지 못했습니다: ${(e as Error)?.message ?? e}`,
        );
      }
    },
    [ensureLandmarker, resetMeasure, stopSource, tick],
  );

  const startCamera = useCallback(
    (face: 'environment' | 'user') =>
      begin('camera', async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('이 주소에서는 카메라를 쓸 수 없습니다(https 또는 localhost에서만 가능).');
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: face }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        streamRef.current = stream;
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play();
      }),
    [begin],
  );

  const startUrl = useCallback(
    (url: string, isImage: boolean, crossOrigin: boolean) =>
      begin(isImage ? 'image' : 'video', async () => {
        if (isImage) {
          const img = new Image();
          if (crossOrigin) img.crossOrigin = 'anonymous';
          img.src = url;
          await img.decode();
          imgRef.current = img;
        } else {
          const v = videoRef.current!;
          if (crossOrigin) v.crossOrigin = 'anonymous';
          else v.removeAttribute('crossorigin');
          v.src = url;
          v.loop = true;
          await v.play();
        }
      }),
    [begin],
  );

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const url = URL.createObjectURL(f);
    void startUrl(url, f.type.startsWith('image/'), false).then(() => {
      blobUrlRef.current = url;
    });
  };

  // 개발용: /rom-lab?src=<영상·사진 주소>&mode=posture 로 바로 시험
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || modeProp) return;
    const q = new URLSearchParams(window.location.search);
    if (q.get('mode') === 'posture') setMode('posture');
    const src = q.get('src');
    if (src) void startUrl(src, /\.(jpe?g|png|webp)(\?|$)/i.test(src), /^https?:/.test(src));
  }, [startUrl, modeProp]);

  useEffect(
    () => () => {
      runIdRef.current++;
      stopSource();
      void plPromiseRef.current?.then((pl) => pl.close()).catch(() => {});
      plPromiseRef.current = null;
      plRef.current = null;
    },
    [stopSource],
  );

  const stop = () => {
    runIdRef.current++;
    stopSource();
    setSource('none');
    setLive({ ...EMPTY_ANGLES });
    setLiveP({});
    setPView(null);
    setView('none');
  };

  const togglePause = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPaused(false);
    } else {
      v.pause();
      setPaused(true);
    }
  };

  const startMeasure = () => {
    peakRef.current = newPeak();
    phaseRef.current = 'measuring';
    setResult(null);
    setSnapUrl(null);
    setPhase('measuring');
  };

  const endMeasure = () => {
    phaseRef.current = 'done';
    const pk = peakRef.current;
    setResult({ max: { ...pk.max }, deep: pk.deep ? { ...pk.deep } : null });
    setSnapUrl(pk.deep ? shrink(snapRef.current) : null);
    setPhase('done');
  };

  // 자세: 최근 1초 평균값과 지금 화면을 남긴다 (정면·옆모습 따로, 다시 누르면 덮어씀)
  const capturePosture = () => {
    const pv = pViewRef.current;
    const buf = pBufRef.current;
    if (!pv || !buf.length) return;
    const vals: CamVals = {};
    for (const m of camMetricsOf(pv)) {
      const xs = buf.map((b) => b.vals[m.key]).filter((x): x is number => x != null);
      vals[m.key] = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
    }
    const snap = shrink(canvasRef.current);
    setCaps((prev) => ({ ...prev, [pv]: { vals, snap } }));
  };

  const switchMode = (m: CamMode) => {
    if (m === mode) return;
    setMode(m);
    resetMeasure();
    setCaps({});
  };

  const canApply = mode === 'squat' ? !!result?.deep : !!(caps.front || caps.side);
  const photosReady = mode === 'squat' ? (snapUrl ? 1 : 0) : (caps.front?.snap ? 1 : 0) + (caps.side?.snap ? 1 : 0);

  const apply = () => {
    if (!onApply || !canApply) return;
    const rom: Record<string, number> = {};
    const prefixes: string[] = [];
    const photos: string[] = [];
    if (mode === 'squat' && result?.deep) {
      prefixes.push(CAM_GROUP_PREFIX.squat);
      for (const k of ANGLE_KEYS) {
        const v = result.deep[k];
        if (v != null) rom[`ohs_${k}`] = round1(v);
      }
      if (snapUrl) photos.push(snapUrl);
    } else {
      for (const pv of ['front', 'side'] as PView[]) {
        const c = caps[pv];
        if (!c) continue;
        prefixes.push(CAM_GROUP_PREFIX[pv]);
        for (const [k, v] of Object.entries(c.vals)) if (v != null) rom[k] = round1(v);
        if (c.snap) photos.push(c.snap);
      }
    }
    onApply({ rom, prefixes, photos: withPhoto ? photos.slice(0, Math.max(0, photoRoom)) : [] });
  };

  const running = source !== 'none';
  const btn = 'px-4 py-2.5 rounded-full text-sm font-semibold';
  const dark = { background: '#2c2c2c', color: '#fff' };
  const light = { background: '#fff', color: '#2c2c2c', border: '1px solid #c8c8c8' };
  const guide = mode === 'squat' ? GUIDE_SQUAT[view] : GUIDE_POSTURE[view];
  const guideOk = mode === 'squat' ? view === 'ok' : view === 'ok' || view === 'front';

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <h2 className="text-xl font-bold">카메라 관절 각도</h2>
        <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: '#2c2c2c', color: '#fff' }}>
          시제품
        </span>
      </div>
      <p className="text-sm mb-3" style={{ color: '#5a5a5a' }}>
        {mode === 'squat'
          ? '옆모습 오버헤드 스쿼트를 카메라로 비추면 무릎·엉덩이·발목·어깨 각도가 화면에 표시됩니다.'
          : '서 있는 자세를 정면(또는 뒷모습)과 옆모습으로 비추면 머리·어깨·골반 기울기와 무릎 정렬이 화면에 표시됩니다.'}{' '}
        영상은 이 기기 안에서만 처리합니다.
      </p>

      {!modeProp && (
        <div className="inline-flex rounded-full p-0.5 mb-3" style={{ background: '#ededed' }} role="group" aria-label="측정 종류">
          {(
            [
              ['squat', '움직임 · 오버헤드 스쿼트'],
              ['posture', '자세 · 서 있는 자세'],
            ] as [CamMode, string][]
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              aria-pressed={mode === m}
              className="px-4 py-1.5 rounded-full text-sm font-semibold"
              style={mode === m ? dark : { background: 'transparent', color: '#5a5a5a' }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 flex-wrap mb-3">
        {!running ? (
          <>
            <button type="button" className={btn} style={dark} onClick={() => void startCamera(facing)} disabled={!!loading}>
              카메라 켜기
            </button>
            <label className={`${btn} cursor-pointer`} style={light}>
              영상·사진 파일 열기
              <input type="file" accept="video/*,image/*" className="hidden" onChange={onFile} disabled={!!loading} />
            </label>
          </>
        ) : (
          <>
            {mode === 'squat' ? (
              phase !== 'measuring' ? (
                <button type="button" className={btn} style={dark} onClick={startMeasure}>
                  {phase === 'done' ? '다시 측정' : '측정 시작'}
                </button>
              ) : (
                <button type="button" className={btn} style={dark} onClick={endMeasure}>
                  측정 끝
                </button>
              )
            ) : (
              <button
                type="button"
                className={btn}
                style={pView ? dark : { background: '#9a9a9a', color: '#fff' }}
                onClick={capturePosture}
                disabled={!pView}
              >
                지금 자세 기록{pView ? ` (${pView === 'front' ? '정면' : '옆모습'})` : ''}
              </button>
            )}
            {source === 'camera' && (
              <button
                type="button"
                className={btn}
                style={light}
                onClick={() => {
                  const next = facing === 'environment' ? 'user' : 'environment';
                  setFacing(next);
                  void startCamera(next);
                }}
              >
                카메라 전환 ({facing === 'environment' ? '후면' : '전면'})
              </button>
            )}
            {source === 'video' && (
              <button type="button" className={btn} style={light} onClick={togglePause}>
                {paused ? '재생' : '일시정지'}
              </button>
            )}
            {source !== 'camera' && (
              <label className={`${btn} cursor-pointer`} style={light}>
                다른 파일
                <input type="file" accept="video/*,image/*" className="hidden" onChange={onFile} />
              </label>
            )}
            <button type="button" className={btn} style={light} onClick={stop}>
              끄기
            </button>
          </>
        )}
      </div>

      {loading && (
        <p className="text-sm mb-3" role="status" style={{ color: '#5a5a5a' }}>
          {loading}
        </p>
      )}
      {error && (
        <p className="text-sm mb-3 px-3 py-2 rounded-lg" role="alert" style={{ background: '#f2f2f2', color: '#c62828' }}>
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="relative rounded-xl overflow-hidden" style={{ background: '#2c2c2c', minHeight: running ? undefined : 240 }}>
            <video ref={videoRef} playsInline muted className="hidden" />
            <canvas
              ref={canvasRef}
              className="block w-full h-auto mx-auto"
              style={{ maxHeight: '72vh', objectFit: 'contain', display: running ? 'block' : 'none' }}
            />
            {!running && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-center px-6" style={{ color: '#9a9a9a' }}>
                카메라를 켜거나, 촬영해 둔 영상·사진 파일을 열어 주세요.
              </div>
            )}
            {running && mode === 'squat' && phase === 'measuring' && (
              <span className="absolute top-3 left-3 text-xs font-bold px-2 py-1 rounded" style={{ background: '#c62828', color: '#fff' }}>
                ● 측정 중
              </span>
            )}
          </div>
          {running && (
            <p className="text-sm mt-2 font-semibold" role="status" style={{ color: guideOk ? '#2c2c2c' : '#c62828' }}>
              {guide}
              {mode === 'squat' && view === 'ok' && side ? ` (${side === 'L' ? '왼쪽' : '오른쪽'} 옆모습)` : ''}
            </p>
          )}
          {running && source !== 'image' && fps > 0 && (
            <p className="text-xs mt-1" style={{ color: fps < 8 ? '#c62828' : '#6e6e6e' }}>
              인식 속도 초당 {fps < 10 ? fps.toFixed(1) : Math.round(fps)}장
              {fps < 8 && mode === 'squat' ? ' — 이 기기에서는 느립니다. 천천히 움직이고, 가장 깊이 앉은 자세에서 1~2초 멈춰 주세요.' : ''}
            </p>
          )}
        </div>

        <div>
          {mode === 'squat' ? (
            <>
              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr className="text-left text-xs" style={{ color: '#6e6e6e', borderBottom: '1.5px solid #d6d6d6' }}>
                    <th className="py-1.5 font-semibold">관절</th>
                    <th className="py-1.5 font-semibold text-right">지금</th>
                    <th className="py-1.5 font-semibold text-right">최대</th>
                    <th className="py-1.5 font-semibold text-right whitespace-nowrap">깊이 앉은 순간</th>
                  </tr>
                </thead>
                <tbody>
                  {ANGLE_KEYS.map((k) => (
                    <tr key={k} style={{ borderBottom: '1px solid #ececec' }}>
                      <td className="py-2 pr-1">{ANGLE_INFO[k].name}</td>
                      <td className="py-2 text-right tabular-nums font-bold">{fmt(running ? live[k] : null)}</td>
                      <td className="py-2 text-right tabular-nums">{fmt(result?.max[k])}</td>
                      <td className="py-2 text-right tabular-nums">{fmt(result?.deep?.[k])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {phase === 'done' && result && !result.deep && (
                <p className="text-xs mt-2" style={{ color: '#c62828' }}>
                  측정하는 동안 무릎이 인식되지 않았습니다. 전신이 보이게 한 뒤 다시 측정해 주세요.
                </p>
              )}
              {snapUrl && (
                <figure className="mt-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={snapUrl} alt="가장 깊이 앉은 순간의 화면" className="w-full rounded-lg" style={{ border: '1px solid #d6d6d6' }} />
                  <figcaption className="text-xs mt-1" style={{ color: '#6e6e6e' }}>
                    가장 깊이 앉은 순간 (무릎이 가장 많이 굽은 화면)
                  </figcaption>
                </figure>
              )}
            </>
          ) : (
            <>
              {(['front', 'side'] as PView[]).map((pv) => (
                <div key={pv} className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-bold">{pv === 'front' ? '정면 (또는 뒷모습)' : '옆모습'}</h3>
                    {caps[pv] && (
                      <button
                        type="button"
                        className="text-xs underline"
                        style={{ color: '#6e6e6e' }}
                        onClick={() => setCaps((prev) => ({ ...prev, [pv]: undefined }))}
                      >
                        기록 지우기
                      </button>
                    )}
                  </div>
                  <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr className="text-left text-xs" style={{ color: '#6e6e6e', borderBottom: '1.5px solid #d6d6d6' }}>
                        <th className="py-1.5 font-semibold">항목</th>
                        <th className="py-1.5 font-semibold text-right">지금</th>
                        <th className="py-1.5 font-semibold text-right">기록</th>
                      </tr>
                    </thead>
                    <tbody>
                      {camMetricsOf(pv).map((m) => (
                        <tr key={m.key} style={{ borderBottom: '1px solid #ececec' }}>
                          <td className="py-2 pr-1">{m.name}</td>
                          <td className="py-2 text-right tabular-nums whitespace-nowrap" style={{ color: '#5a5a5a' }}>
                            {formatCam(m, running && pView === pv ? liveP[m.key] : null)}
                          </td>
                          <td className="py-2 text-right tabular-nums font-bold whitespace-nowrap">
                            {formatCam(m, caps[pv]?.vals[m.key])}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {caps[pv]?.snap && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={caps[pv]!.snap!}
                      alt={`${pv === 'front' ? '정면' : '옆모습'} 기록 화면`}
                      className="mt-2 w-full rounded-lg"
                      style={{ border: '1px solid #d6d6d6' }}
                    />
                  )}
                </div>
              ))}
            </>
          )}

          {onApply && (
            <div className="mt-3 p-3 rounded-xl" style={{ background: '#f6f6f6', border: '1px solid #e2e2e2' }}>
              <button
                type="button"
                className={`${btn} w-full`}
                style={canApply ? dark : { background: '#9a9a9a', color: '#fff' }}
                disabled={!canApply}
                onClick={apply}
              >
                이 값을 평가에 넣기
              </button>
              {photoRoom > 0 ? (
                <label className="flex items-center gap-2 mt-2 text-xs" style={{ color: '#5a5a5a' }}>
                  <input type="checkbox" checked={withPhoto} onChange={(e) => setWithPhoto(e.target.checked)} />
                  화면 캡처도 자세 사진에 추가 (남은 자리 {photoRoom}장{photosReady > photoRoom ? `, ${photoRoom}장만 들어갑니다` : ''})
                </label>
              ) : (
                <p className="mt-2 text-xs" style={{ color: '#8a8a8a' }}>
                  자세 사진 4장이 다 차서 화면 캡처는 넣지 않고 각도만 넣습니다.
                </p>
              )}
              {!canApply && (
                <p className="mt-1 text-xs" style={{ color: '#8a8a8a' }}>
                  {mode === 'squat' ? '「측정 시작」→ 스쿼트 →「측정 끝」을 마치면 넣을 수 있습니다.' : '「지금 자세 기록」을 누르면 넣을 수 있습니다.'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 text-sm">
        <div>
          <h3 className="font-bold mb-1">촬영 방법</h3>
          {mode === 'squat' ? (
            <ol className="list-decimal pl-5 space-y-0.5" style={{ color: '#5a5a5a' }}>
              <li>회원이 카메라에 옆모습으로 섭니다(몸의 옆면이 카메라를 바라봄).</li>
              <li>머리부터 발끝까지 들어오되 회원이 화면에 크게 차도록 하고, 카메라는 세워서 움직이지 않게 둡니다.</li>
              <li>「측정 시작」을 누르고 팔을 머리 위로 든 채 스쿼트를 합니다.</li>
              <li>일어선 뒤 「측정 끝」을 누르면 최대값과 가장 깊이 앉은 순간의 각도가 남습니다.</li>
            </ol>
          ) : (
            <ol className="list-decimal pl-5 space-y-0.5" style={{ color: '#5a5a5a' }}>
              <li>카메라를 수평으로 세워 두고(기울면 기울기 값이 틀어집니다), 머리부터 발끝까지 들어오되 회원이 화면에 크게 차도록 합니다. 작게 찍히면 값이 흔들립니다.</li>
              <li>회원이 정면(또는 뒷모습)으로 편하게 서면 「지금 자세 기록」을 누릅니다.</li>
              <li>회원이 옆으로 돌아서면 다시 「지금 자세 기록」을 누릅니다. 정면·옆모습은 알아서 구분합니다.</li>
              <li>다시 누르면 그 방향의 기록이 새 값으로 바뀝니다.</li>
            </ol>
          )}
        </div>
        <div>
          <h3 className="font-bold mb-1">각도 읽는 법</h3>
          <ul className="space-y-0.5" style={{ color: '#5a5a5a' }}>
            {mode === 'squat'
              ? ANGLE_KEYS.map((k) => (
                  <li key={k}>
                    · <b style={{ color: '#2c2c2c' }}>{ANGLE_INFO[k].short}</b> — {ANGLE_INFO[k].how}
                  </li>
                ))
              : [...camMetricsOf('front'), ...camMetricsOf('side')]
                  .filter((m) => m.key !== 'pf_kneeR')
                  .map((m) => (
                    <li key={m.key}>
                      · <b style={{ color: '#2c2c2c' }}>{m.key === 'pf_kneeL' ? '무릎 정렬' : m.name}</b> — {m.how}
                    </li>
                  ))}
          </ul>
        </div>
      </div>
      <p className="text-xs mt-4 px-3 py-2 rounded-lg" style={{ background: '#f2f2f2', color: '#5a5a5a' }}>
        카메라 한 대로 잰 참고값입니다. 각도계로 잰 값과 다를 수 있고, 촬영 거리·각도·옷에 따라 달라집니다. 같은 조건으로
        찍어 변화를 비교하는 용도로 씁니다.
        {mode === 'posture' ? ' 1~2° 정도의 작은 기울기는 측정 오차일 수 있습니다. 좌우는 회원 본인 기준입니다.' : ' 회전 동작(내회전·외회전)은 재지 않습니다.'}
      </p>
    </div>
  );
}

// ── 화면에 그리기 ──────────────────────────────────────────────
type Draw = { ctx: CanvasRenderingContext2D; px: Pt[]; W: number; H: number; unit: number; fs: number };

// cssScale = 캔버스 픽셀 ÷ 화면에 보이는 픽셀 — 작은 화면에서도 글자가 12px 아래로 내려가지 않게 한다
function setup(ctx: CanvasRenderingContext2D, px: Pt[], W: number, H: number, cssScale: number): Draw {
  const unit = Math.max(W, H) / 100; // 화면 크기에 맞춘 굵기·글자 단위
  const fs = Math.max(12 * cssScale, unit * 2.4);
  ctx.font = `700 ${fs}px "Pretendard Variable", Pretendard, -apple-system, "Apple SD Gothic Neo", sans-serif`;
  ctx.textBaseline = 'middle';
  return { ctx, px, W, H, unit, fs };
}

const seen = (d: Draw, i: number) => (d.px[i]?.visibility ?? 0) >= 0.5;

function chain(d: Draw, ids: number[], width: number, alpha = 1) {
  const { ctx, px, unit } = d;
  ctx.globalAlpha = alpha;
  for (let i = 0; i < ids.length - 1; i++) {
    if (!seen(d, ids[i]) || !seen(d, ids[i + 1])) continue;
    const p = px[ids[i]], q = px[ids[i + 1]];
    for (const [w, c] of [[width + unit * 0.5, '#000'], [width, '#fff']] as const) {
      ctx.strokeStyle = c;
      ctx.lineWidth = w;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

function dots(d: Draw, ids: number[]) {
  const { ctx, px, unit } = d;
  for (const i of ids) {
    if (!seen(d, i)) continue;
    ctx.beginPath();
    ctx.arc(px[i].x, px[i].y, unit * 0.9, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.lineWidth = unit * 0.3;
    ctx.strokeStyle = '#000';
    ctx.stroke();
  }
}

// 기준선(점선): 수직·수평
function dashed(d: Draw, x1: number, y1: number, x2: number, y2: number) {
  const { ctx, unit } = d;
  ctx.save();
  ctx.setLineDash([unit * 1.2, unit * 0.9]);
  for (const [w, c] of [[unit * 0.5, 'rgba(0,0,0,0.55)'], [unit * 0.25, '#fff']] as const) {
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.restore();
}

// 글자 상자 — 서로 겹치면 아래로 민다. dir: +1 = 점의 오른쪽, -1 = 왼쪽
function labels(d: Draw, items: { x: number; y: number; dir: number; text: string }[]) {
  const { ctx, W, H, unit, fs } = d;
  const pad = fs * 0.35, bh = fs * 1.5, gap = unit * 1.6;
  const boxes = items.map((it) => {
    const w = ctx.measureText(it.text).width + pad * 2;
    let x = it.dir > 0 ? it.x + gap : it.x - gap - w;
    if (x + w > W) x = it.x - gap - w;
    if (x < 0) x = Math.min(it.x + gap, W - w);
    return { x: Math.max(0, x), y: it.y - bh / 2, w, text: it.text };
  });
  boxes.sort((p, q) => p.y - q.y);
  for (let i = 1; i < boxes.length; i++) {
    for (let j = 0; j < i; j++) {
      const p = boxes[j], q = boxes[i];
      if (q.x < p.x + p.w && p.x < q.x + q.w && q.y < p.y + bh + 2) q.y = p.y + bh + 2;
    }
  }
  for (const b of boxes) {
    const y = Math.min(H - bh, Math.max(0, b.y));
    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.beginPath();
    ctx.roundRect(b.x, y, b.w, bh, fs * 0.3);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(b.text, b.x + pad, y + bh / 2 + fs * 0.05);
  }
}

function drawSquat(ctx: CanvasRenderingContext2D, px: Pt[], side: Side, a: Angles, W: number, H: number, cssScale: number) {
  const d = setup(ctx, px, W, H, cssScale);
  const { unit } = d;
  const other: Side = side === 'L' ? 'R' : 'L';
  chain(d, [LM.shoulder[other], LM.hip[other], LM.knee[other], LM.ankle[other]], unit * 0.35, 0.35); // 반대쪽은 흐리게
  chain(d, [LM.wrist[side], LM.elbow[side], LM.shoulder[side], LM.hip[side], LM.knee[side], LM.ankle[side]], unit * 0.6);
  chain(d, [LM.heel[side], LM.ankle[side], LM.toe[side]], unit * 0.45);
  dots(d, [LM.shoulder[side], LM.elbow[side], LM.hip[side], LM.knee[side], LM.ankle[side]]);

  // 무릎·발목 글자는 몸 앞쪽, 어깨·엉덩이는 몸 뒤쪽
  const hipP = px[LM.hip[side]], kneeP = px[LM.knee[side]], heelP = px[LM.heel[side]], toeP = px[LM.toe[side]];
  const front = seen(d, LM.heel[side]) && seen(d, LM.toe[side]) ? Math.sign(toeP.x - heelP.x) || 1 : Math.sign(kneeP.x - hipP.x) || 1;
  const items: { x: number; y: number; dir: number; text: string }[] = [];
  const add = (i: number, dir: number, text: string) => {
    if (seen(d, i)) items.push({ x: px[i].x, y: px[i].y, dir, text });
  };
  if (a.shoulder != null) add(LM.shoulder[side], -front, `어깨 ${Math.round(a.shoulder)}°`);
  if (a.hip != null) add(LM.hip[side], -front, `엉덩이 ${Math.round(a.hip)}°`);
  if (a.knee != null) add(LM.knee[side], front, `무릎 ${Math.round(a.knee)}°`);
  if (a.ankle != null) add(LM.ankle[side], front, `발목 ${Math.round(a.ankle)}°`);
  labels(d, items);
}

const metric = (k: CamKey) => camMetricsOf(k.startsWith('pf_') ? 'front' : 'side').find((m) => m.key === k)!;

function drawFront(ctx: CanvasRenderingContext2D, px: Pt[], v: CamVals, W: number, H: number, cssScale: number) {
  const d = setup(ctx, px, W, H, cssScale);
  const { unit } = d;
  for (const s of ['L', 'R'] as Side[]) chain(d, [LM.hip[s], LM.knee[s], LM.ankle[s]], unit * 0.5);
  // 좌우를 잇는 선 + 그 높이의 수평 기준선
  const pairs: [number, number, CamKey][] = [
    [EAR_LM.L, EAR_LM.R, 'pf_head'],
    [LM.shoulder.L, LM.shoulder.R, 'pf_shoulder'],
    [LM.hip.L, LM.hip.R, 'pf_pelvis'],
  ];
  const items: { x: number; y: number; dir: number; text: string }[] = [];
  for (const [l, r, key] of pairs) {
    if (!seen(d, l) || !seen(d, r)) continue;
    const midY = (px[l].y + px[r].y) / 2;
    const x1 = Math.min(px[l].x, px[r].x) - unit * 4, x2 = Math.max(px[l].x, px[r].x) + unit * 4;
    dashed(d, x1, midY, x2, midY);
    chain(d, [l, r], unit * 0.6);
    const val = v[key];
    if (val != null) items.push({ x: x2, y: midY, dir: 1, text: `${metric(key).short} ${formatCam(metric(key), val)}` });
  }
  dots(d, [EAR_LM.L, EAR_LM.R, LM.shoulder.L, LM.shoulder.R, LM.hip.L, LM.hip.R, LM.knee.L, LM.knee.R, LM.ankle.L, LM.ankle.R]);
  // 무릎 글자는 몸 바깥쪽에
  if (seen(d, LM.hip.L) && seen(d, LM.hip.R)) {
    const midX = (px[LM.hip.L].x + px[LM.hip.R].x) / 2;
    for (const [s, key] of [['L', 'pf_kneeL'], ['R', 'pf_kneeR']] as [Side, CamKey][]) {
      const val = v[key];
      const i = LM.knee[s];
      if (val != null && seen(d, i)) items.push({ x: px[i].x, y: px[i].y, dir: px[i].x >= midX ? 1 : -1, text: `무릎 ${formatCam(metric(key), val)}` });
    }
  }
  labels(d, items);
}

function drawSide(ctx: CanvasRenderingContext2D, px: Pt[], side: Side, v: CamVals, W: number, H: number, cssScale: number) {
  const d = setup(ctx, px, W, H, cssScale);
  const { unit } = d;
  const ear = EAR_LM[side];
  // 발목에서 위로 올린 수직 기준선
  if (seen(d, LM.ankle[side])) {
    const a = px[LM.ankle[side]];
    const top = seen(d, ear) ? px[ear].y - unit * 6 : 0;
    dashed(d, a.x, a.y, a.x, Math.max(0, top));
  }
  chain(d, [ear, LM.shoulder[side], LM.hip[side], LM.knee[side], LM.ankle[side]], unit * 0.6);
  chain(d, [LM.heel[side], LM.ankle[side], LM.toe[side]], unit * 0.45);
  dots(d, [ear, LM.shoulder[side], LM.hip[side], LM.knee[side], LM.ankle[side]]);
  const heelP = px[LM.heel[side]], toeP = px[LM.toe[side]];
  const front = seen(d, LM.heel[side]) && seen(d, LM.toe[side]) ? Math.sign(toeP.x - heelP.x) || 1 : 1;
  const items: { x: number; y: number; dir: number; text: string }[] = [];
  const add = (i: number, key: CamKey) => {
    const val = v[key];
    if (val != null && seen(d, i)) items.push({ x: px[i].x, y: px[i].y, dir: -front, text: `${metric(key).short} ${formatCam(metric(key), val)}` });
  };
  add(ear, 'ps_head');
  add(LM.shoulder[side], 'ps_trunk');
  add(LM.knee[side], 'ps_knee');
  labels(d, items);
}
