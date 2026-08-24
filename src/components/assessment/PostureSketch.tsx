'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';

/** 캔버스 내부 해상도 — dataURL 크기 절약 (원본 비율 1900×1076의 60%) */
const CANVAS_W = 1140;
/** 그림 영역 높이 — 기존 저장 스케치(1140×646)와의 정렬을 위해 값 유지 */
const IMAGE_H = 646;
/** 통증·특이사항 표시 여백을 아래에 추가한 전체 캔버스 높이 */
const CANVAS_H = 820;
const MAX_UNDO = 20;
const INK_COLOR = '#111';
const ZOOM_STEPS = [1, 1.5, 2, 3];

type Tool = 'pen' | 'thick' | 'eraser' | 'pan';

const TOOL_CONFIG: Record<Exclude<Tool, 'pan'>, { width: number; composite: GlobalCompositeOperation }> = {
  pen: { width: 2.5, composite: 'source-over' },
  thick: { width: 6, composite: 'source-over' },
  eraser: { width: 20, composite: 'destination-out' },
};

const TOOL_BUTTONS: { id: Tool; label: string }[] = [
  { id: 'pen', label: '✏️ 펜' },
  { id: 'thick', label: '🖊️ 굵게' },
  { id: 'eraser', label: '⬜ 지우개' },
];

interface Props {
  /** 기존 스케치 PNG dataURL (편집 모드 복원용) */
  value?: string;
  /** 스트로크 끝날 때마다 호출, 빈 캔버스면 undefined */
  onChange: (dataUrl: string | undefined) => void;
}

export default function PostureSketch({ value, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const undoStackRef = useRef<ImageData[]>([]);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const panStartRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number } | null>(null);
  const initialValueRef = useRef(value);
  const [tool, setTool] = useState<Tool>('pen');
  const [canUndo, setCanUndo] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const getCtx = useCallback((): CanvasRenderingContext2D | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d', { willReadFrequently: true });
  }, []);

  // 마운트 시 기존 스케치 복원 — 원본 픽셀 크기 그대로 상단 정렬
  // (구버전 1140×646 스케치도 그림 영역과 정확히 겹침)
  useEffect(() => {
    const src = initialValueRef.current;
    if (!src) return;
    const ctx = getCtx();
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.globalCompositeOperation = 'source-over';
      const scale = CANVAS_W / img.width;
      ctx.drawImage(img, 0, 0, CANVAS_W, img.height * scale);
    };
    img.src = src;
  }, [getCtx]);

  /** CSS 표시 크기 → 캔버스 내부 좌표 변환 (줌 상태에서도 rect가 함께 커져 그대로 성립) */
  const getPoint = (e: ReactPointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
    };
  };

  /** 전체 픽셀 alpha 검사 — 1140×820이라 부담 없음 */
  const isCanvasEmpty = (ctx: CanvasRenderingContext2D): boolean => {
    const data = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] !== 0) return false;
    }
    return true;
  };

  const emitChange = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    onChange(isCanvasEmpty(ctx) ? undefined : canvas.toDataURL('image/png'));
  }, [getCtx, onChange]);

  const pushUndo = (ctx: CanvasRenderingContext2D) => {
    const stack = undoStackRef.current;
    stack.push(ctx.getImageData(0, 0, CANVAS_W, CANVAS_H));
    if (stack.length > MAX_UNDO) stack.shift();
    setCanUndo(true);
  };

  /** 팬 오프셋을 뷰포트 안으로 제한 */
  const clampPan = useCallback((p: { x: number; y: number }, z: number) => {
    const vp = viewportRef.current;
    if (!vp || z <= 1) return { x: 0, y: 0 };
    const rect = vp.getBoundingClientRect();
    const minX = rect.width * (1 - z);
    const minY = rect.height * (1 - z);
    return {
      x: Math.min(0, Math.max(minX, p.x)),
      y: Math.min(0, Math.max(minY, p.y)),
    };
  }, []);

  /** 뷰포트 중심을 유지하며 줌 단계 변경 */
  const changeZoom = (next: number) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const ratio = next / zoom;
    const nextPan = clampPan(
      { x: cx - (cx - pan.x) * ratio, y: cy - (cy - pan.y) * ratio },
      next
    );
    setZoom(next);
    setPan(nextPan);
    if (next === 1 && tool === 'pan') setTool('pen');
  };

  const zoomIdx = ZOOM_STEPS.indexOf(zoom);

  const handlePointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);

    if (tool === 'pan') {
      panStartRef.current = { clientX: e.clientX, clientY: e.clientY, panX: pan.x, panY: pan.y };
      return;
    }

    pushUndo(ctx);
    drawingRef.current = true;

    const { width, composite } = TOOL_CONFIG[tool];
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = INK_COLOR;
    ctx.lineWidth = width;
    ctx.globalCompositeOperation = composite;

    const p = getPoint(e, canvas);
    lastPointRef.current = p;
    // 탭 한 번에도 점이 찍히도록 미세 선분을 그린다
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.01, p.y);
    ctx.stroke();
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (tool === 'pan') {
      const start = panStartRef.current;
      if (!start) return;
      setPan(
        clampPan(
          { x: start.panX + (e.clientX - start.clientX), y: start.panY + (e.clientY - start.clientY) },
          zoom
        )
      );
      return;
    }
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = getCtx();
    const last = lastPointRef.current;
    if (!canvas || !ctx || !last) return;
    const p = getPoint(e, canvas);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPointRef.current = p;
  };

  const endStroke = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    if (tool === 'pan') {
      panStartRef.current = null;
      return;
    }
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    emitChange();
  };

  const handleUndo = () => {
    const ctx = getCtx();
    if (!ctx) return;
    const snapshot = undoStackRef.current.pop();
    if (!snapshot) return;
    ctx.putImageData(snapshot, 0, 0);
    setCanUndo(undoStackRef.current.length > 0);
    emitChange();
  };

  const handleClear = () => {
    const ctx = getCtx();
    if (!ctx) return;
    pushUndo(ctx); // 지우기 전 저장 — undo로 복구 가능
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    onChange(undefined);
  };

  const buttonStyle = (active: boolean, disabled = false): CSSProperties => ({
    background: active ? '#111' : '#fff',
    color: active ? '#fff' : '#111',
    border: '1px solid #cfcfcf',
    minWidth: 40,
    minHeight: 40,
    opacity: disabled ? 0.4 : 1,
  });

  const buttonClass = 'rounded-md px-3 py-2 text-sm';

  return (
    <div>
      {/* 도구 바 */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {TOOL_BUTTONS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={buttonClass}
            style={buttonStyle(tool === id)}
            onClick={() => setTool(id)}
            aria-pressed={tool === id}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          className={buttonClass}
          style={{ ...buttonStyle(false), opacity: canUndo ? 1 : 0.4 }}
          onClick={handleUndo}
          disabled={!canUndo}
        >
          ↩️ 실행취소
        </button>
        <button
          type="button"
          className={buttonClass}
          style={buttonStyle(false)}
          onClick={handleClear}
        >
          🗑️ 전체 지우기
        </button>
        {/* 확대·이동 — 세밀한 표시용 (트레이너 피드백) */}
        <span className="inline-flex items-center gap-1.5 ml-auto">
          <button
            type="button"
            className={buttonClass}
            style={buttonStyle(false, zoomIdx <= 0)}
            onClick={() => zoomIdx > 0 && changeZoom(ZOOM_STEPS[zoomIdx - 1])}
            disabled={zoomIdx <= 0}
            aria-label="축소"
          >
            🔍−
          </button>
          <span className="text-xs tabular-nums" style={{ color: '#555', minWidth: 34, textAlign: 'center' }}>
            {zoom.toFixed(1)}×
          </span>
          <button
            type="button"
            className={buttonClass}
            style={buttonStyle(false, zoomIdx >= ZOOM_STEPS.length - 1)}
            onClick={() => zoomIdx < ZOOM_STEPS.length - 1 && changeZoom(ZOOM_STEPS[zoomIdx + 1])}
            disabled={zoomIdx >= ZOOM_STEPS.length - 1}
            aria-label="확대"
          >
            🔍＋
          </button>
          <button
            type="button"
            className={buttonClass}
            style={buttonStyle(tool === 'pan', zoom === 1)}
            onClick={() => setTool('pan')}
            disabled={zoom === 1}
            aria-pressed={tool === 'pan'}
          >
            ✋ 이동
          </button>
        </span>
      </div>

      {/* 스케치 영역 — 확대 시 stage 전체가 커지고, 좌표 변환은 rect 기반이라 그대로 동작 */}
      <div
        ref={viewportRef}
        className="relative w-full overflow-hidden rounded-xl"
        style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}`, border: '1px solid #e3e3e3' }}
      >
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/body-posture.png"
            alt="체형 평가 그림 — 전면·측면·후면"
            className="absolute left-0 top-0 w-full object-contain"
            style={{ height: `${(IMAGE_H / CANVAS_H) * 100}%`, pointerEvents: 'none', background: '#f5f5f5' }}
            draggable={false}
          />
          {/* 통증·특이사항 표시 여백 (트레이너 피드백 — 여백 확대) */}
          <div
            className="absolute left-0 right-0 bottom-0 flex items-start justify-center"
            style={{
              top: `${(IMAGE_H / CANVAS_H) * 100}%`,
              background: '#fcfcfc',
              borderTop: '1px dashed #d6d6d6',
              pointerEvents: 'none',
            }}
          >
            <span className="text-[11px] mt-1" style={{ color: '#c4c4c4' }}>
              ✍ 통증 부위·특이사항 표시 여백
            </span>
          </div>
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="absolute inset-0 h-full w-full"
            style={{ touchAction: 'none', cursor: tool === 'pan' ? 'grab' : 'crosshair' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endStroke}
            onPointerLeave={endStroke}
            onPointerCancel={endStroke}
          />
        </div>
      </div>

      <p className="mt-1.5 text-xs" style={{ color: '#8a8a8a' }}>
        체형 그림 위에 직접 표시하세요 — 주름·벌크·비대칭 등. 아래 여백에는 통증 부위·특이사항을
        자유롭게 적으세요. 🔍＋ 확대 후 ✋ 이동으로 세밀하게 그릴 수 있습니다. (저장 시 함께 기록됩니다)
      </p>
    </div>
  );
}
