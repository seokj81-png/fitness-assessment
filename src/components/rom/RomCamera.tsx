'use client';

// 카메라 관절 각도 — 시제품(1단계): 옆모습 오버헤드 스쿼트 한 동작.
// 영상은 기기 안에서만 처리한다(서버로 보내지 않음). 저장 기능 없음.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PoseLandmarker } from '@mediapipe/tasks-vision';
import {
  ANGLE_INFO,
  ANGLE_KEYS,
  EMPTY_ANGLES,
  LM,
  computeAngles,
  pickSide,
  smoothAngles,
  toPixels,
  viewCheck,
  type Angles,
  type Pt,
  type Side,
  type ViewState,
} from '@/lib/pose-angles';

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task';

type Source = 'none' | 'camera' | 'video' | 'image';
type Phase = 'ready' | 'measuring' | 'done';
type Peak = { max: Angles; deep: Angles | null };

const newPeak = (): Peak => ({ max: { ...EMPTY_ANGLES }, deep: null });

const GUIDE: Record<ViewState, string> = {
  none: '사람이 보이지 않습니다. 머리부터 발끝까지 화면에 들어오게 해 주세요.',
  partial: '몸 일부가 가려졌거나 화면 밖입니다. 머리부터 발끝까지 보이게 뒤로 물러나 주세요.',
  front: '옆모습으로 서 주세요. 몸의 옆면이 카메라를 바라봐야 합니다.',
  ok: '측정할 수 있습니다.',
};

const fmt = (v: number | null | undefined) => (v == null ? '—' : `${Math.round(v)}°`);

export default function RomCamera() {
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

  const [source, setSource] = useState<Source>('none');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [paused, setPaused] = useState(false);
  const [live, setLive] = useState<Angles>({ ...EMPTY_ANGLES });
  const [view, setView] = useState<ViewState>('none');
  const [side, setSide] = useState<Side | null>(null);
  const [fps, setFps] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const [result, setResult] = useState<Peak | null>(null);
  const [snapUrl, setSnapUrl] = useState<string | null>(null);

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

  const resetMeasure = useCallback(() => {
    phaseRef.current = 'ready';
    peakRef.current = newPeak();
    smoothRef.current = { ...EMPTY_ANGLES };
    sideRef.current = null;
    lastTsRef.current = 0;
    fpsRef.current = 0;
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

    let state: ViewState = 'none';
    let angles: Angles = { ...EMPTY_ANGLES };
    if (lm && lm.length >= 33) {
      const s = pickSide(lm, sideRef.current);
      sideRef.current = s;
      const px = toPixels(lm, W, H);
      state = viewCheck(px, s, W, H);
      angles = smoothAngles(smoothRef.current, computeAngles(px, s), alpha);
      smoothRef.current = angles;
      drawOverlay(ctx, px, s, angles, W, H, canvas.clientWidth ? W / canvas.clientWidth : 1);

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
      smoothRef.current = { ...EMPTY_ANGLES };
    }

    if (ts - lastUiRef.current > 120) {
      lastUiRef.current = ts;
      setLive(angles);
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

  // 개발용: /rom-lab?src=<영상·사진 주소> 로 바로 시험
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const src = new URLSearchParams(window.location.search).get('src');
    if (src) void startUrl(src, /\.(jpe?g|png|webp)(\?|$)/i.test(src), /^https?:/.test(src));
  }, [startUrl]);

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
    try {
      setSnapUrl(pk.deep && snapRef.current ? snapRef.current.toDataURL('image/jpeg', 0.85) : null);
    } catch {
      setSnapUrl(null);
    }
    setPhase('done');
  };

  const running = source !== 'none';
  const btn = 'px-4 py-2.5 rounded-lg text-sm font-semibold';
  const dark = { background: '#111', color: '#fff' };
  const light = { background: '#fff', color: '#111', border: '1px solid #bdbdbd' };

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <h2 className="text-xl font-bold">카메라 관절 각도</h2>
        <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: '#111', color: '#fff' }}>
          시제품
        </span>
      </div>
      <p className="text-sm mb-4" style={{ color: '#555' }}>
        옆모습 오버헤드 스쿼트를 카메라로 비추면 무릎·엉덩이·발목·어깨 각도가 화면에 표시됩니다. 영상은 이 기기
        안에서만 처리하고 저장하지 않습니다.
      </p>

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
            {phase !== 'measuring' ? (
              <button type="button" className={btn} style={dark} onClick={startMeasure}>
                {phase === 'done' ? '다시 측정' : '측정 시작'}
              </button>
            ) : (
              <button type="button" className={btn} style={dark} onClick={endMeasure}>
                측정 끝
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
            <button type="button" className={btn} style={light} onClick={stop}>
              끄기
            </button>
          </>
        )}
      </div>

      {loading && (
        <p className="text-sm mb-3" role="status" style={{ color: '#555' }}>
          {loading}
        </p>
      )}
      {error && (
        <p className="text-sm mb-3 px-3 py-2 rounded-lg" role="alert" style={{ background: '#f2f2f2', color: '#b00020' }}>
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <div
            className="relative rounded-xl overflow-hidden"
            style={{ background: '#111', minHeight: running ? undefined : 240 }}
          >
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
            {running && phase === 'measuring' && (
              <span
                className="absolute top-3 left-3 text-xs font-bold px-2 py-1 rounded"
                style={{ background: '#b00020', color: '#fff' }}
              >
                ● 측정 중
              </span>
            )}
          </div>
          {running && (
            <p className="text-sm mt-2 font-semibold" role="status" style={{ color: view === 'ok' ? '#111' : '#b00020' }}>
              {GUIDE[view]}
              {view === 'ok' && side ? ` (${side === 'L' ? '왼쪽' : '오른쪽'} 옆모습)` : ''}
            </p>
          )}
          {running && source !== 'image' && fps > 0 && (
            <p className="text-xs mt-1" style={{ color: fps < 8 ? '#b00020' : '#6e6e6e' }}>
              인식 속도 초당 {fps < 10 ? fps.toFixed(1) : Math.round(fps)}장
              {fps < 8 ? ' — 이 기기에서는 느립니다. 천천히 움직이고, 가장 깊이 앉은 자세에서 1~2초 멈춰 주세요.' : ''}
            </p>
          )}
        </div>

        <div>
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
            <p className="text-xs mt-2" style={{ color: '#b00020' }}>
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
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 text-sm">
        <div>
          <h3 className="font-bold mb-1">촬영 방법</h3>
          <ol className="list-decimal pl-5 space-y-0.5" style={{ color: '#555' }}>
            <li>회원이 카메라에 옆모습으로 섭니다(몸의 옆면이 카메라를 바라봄).</li>
            <li>머리부터 발끝까지 화면에 들어오게 하고, 카메라는 세워서 움직이지 않게 둡니다.</li>
            <li>「측정 시작」을 누르고 팔을 머리 위로 든 채 스쿼트를 합니다.</li>
            <li>일어선 뒤 「측정 끝」을 누르면 최대값과 가장 깊이 앉은 순간의 각도가 남습니다.</li>
          </ol>
        </div>
        <div>
          <h3 className="font-bold mb-1">각도 읽는 법</h3>
          <ul className="space-y-0.5" style={{ color: '#555' }}>
            {ANGLE_KEYS.map((k) => (
              <li key={k}>
                · <b style={{ color: '#111' }}>{ANGLE_INFO[k].short}</b> — {ANGLE_INFO[k].how}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="text-xs mt-4 px-3 py-2 rounded-lg" style={{ background: '#f2f2f2', color: '#555' }}>
        카메라 한 대로 잰 참고값입니다. 각도계로 잰 값과 다를 수 있고, 촬영 거리·각도·옷에 따라 달라집니다. 같은
        조건으로 찍어 변화를 비교하는 용도로 씁니다. 회전 동작(내회전·외회전)은 재지 않습니다.
      </p>
    </div>
  );
}

// ── 화면에 그리기 ──────────────────────────────────────────────
// cssScale = 캔버스 픽셀 ÷ 화면에 보이는 픽셀 — 작은 화면에서도 글자가 12px 아래로 내려가지 않게 한다
function drawOverlay(ctx: CanvasRenderingContext2D, px: Pt[], side: Side, a: Angles, W: number, H: number, cssScale: number) {
  const unit = Math.max(W, H) / 100; // 화면 크기에 맞춘 굵기·글자 단위
  const ok = (i: number) => (px[i]?.visibility ?? 0) >= 0.5;
  const chain = (ids: number[], width: number, alpha: number) => {
    ctx.globalAlpha = alpha;
    for (let i = 0; i < ids.length - 1; i++) {
      if (!ok(ids[i]) || !ok(ids[i + 1])) continue;
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
  };

  const other: Side = side === 'L' ? 'R' : 'L';
  // 반대쪽은 흐리게
  chain([LM.shoulder[other], LM.hip[other], LM.knee[other], LM.ankle[other]], unit * 0.35, 0.35);
  // 카메라 쪽
  chain([LM.wrist[side], LM.elbow[side], LM.shoulder[side], LM.hip[side], LM.knee[side], LM.ankle[side]], unit * 0.6, 1);
  chain([LM.heel[side], LM.ankle[side], LM.toe[side]], unit * 0.45, 1);

  for (const i of [LM.shoulder[side], LM.elbow[side], LM.hip[side], LM.knee[side], LM.ankle[side]]) {
    if (!ok(i)) continue;
    ctx.beginPath();
    ctx.arc(px[i].x, px[i].y, unit * 0.9, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.lineWidth = unit * 0.3;
    ctx.strokeStyle = '#000';
    ctx.stroke();
  }

  const fs = Math.max(12 * cssScale, unit * 2.4);
  ctx.font = `700 ${fs}px -apple-system, "Apple SD Gothic Neo", "Pretendard", sans-serif`;
  ctx.textBaseline = 'middle';
  // 글자 상자: 무릎·발목은 몸 앞쪽, 어깨·엉덩이는 몸 뒤쪽에 두고, 그래도 겹치면 아래로 민다
  const hipP = px[LM.hip[side]], kneeP = px[LM.knee[side]], heelP = px[LM.heel[side]], toeP = px[LM.toe[side]];
  const front = ok(LM.heel[side]) && ok(LM.toe[side]) ? Math.sign(toeP.x - heelP.x) || 1 : Math.sign(kneeP.x - hipP.x) || 1;
  const pad = fs * 0.35, bh = fs * 1.5, gap = unit * 1.6;
  const boxes: { x: number; y: number; w: number; text: string }[] = [];
  const add = (i: number, dir: number, text: string) => {
    if (!ok(i)) return;
    const w = ctx.measureText(text).width + pad * 2;
    let x = dir > 0 ? px[i].x + gap : px[i].x - gap - w;
    if (x + w > W) x = px[i].x - gap - w;
    if (x < 0) x = px[i].x + gap;
    boxes.push({ x, y: px[i].y - bh / 2, w, text });
  };
  if (a.shoulder != null) add(LM.shoulder[side], -front, `어깨 ${Math.round(a.shoulder)}°`);
  if (a.hip != null) add(LM.hip[side], -front, `엉덩이 ${Math.round(a.hip)}°`);
  if (a.knee != null) add(LM.knee[side], front, `무릎 ${Math.round(a.knee)}°`);
  if (a.ankle != null) add(LM.ankle[side], front, `발목 ${Math.round(a.ankle)}°`);
  boxes.sort((p, q) => p.y - q.y);
  for (let i = 1; i < boxes.length; i++) {
    for (let j = 0; j < i; j++) {
      const p = boxes[j], q = boxes[i];
      const overlapX = q.x < p.x + p.w && p.x < q.x + q.w;
      if (overlapX && q.y < p.y + bh + 2) q.y = p.y + bh + 2;
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
