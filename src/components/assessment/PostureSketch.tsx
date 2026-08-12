'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';

/** 캔버스 내부 해상도 — dataURL 크기 절약 (원본 비율 1900×1076의 60%) */
const CANVAS_W = 1140;
const CANVAS_H = 646;
const MAX_UNDO = 20;
const INK_COLOR = '#111';

type Tool = 'pen' | 'thick' | 'eraser';

const TOOL_CONFIG: Record<Tool, { width: number; composite: GlobalCompositeOperation }> = {
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
  const undoStackRef = useRef<ImageData[]>([]);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const initialValueRef = useRef(value);
  const [tool, setTool] = useState<Tool>('pen');
  const [canUndo, setCanUndo] = useState(false);

  const getCtx = useCallback((): CanvasRenderingContext2D | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d', { willReadFrequently: true });
  }, []);

  // 마운트 시 기존 스케치 복원
  useEffect(() => {
    const src = initialValueRef.current;
    if (!src) return;
    const ctx = getCtx();
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(img, 0, 0, CANVAS_W, CANVAS_H);
    };
    img.src = src;
  }, [getCtx]);

  /** CSS 표시 크기 → 캔버스 내부 좌표 변환 */
  const getPoint = (e: ReactPointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
    };
  };

  /** 전체 픽셀 alpha 검사 — 1140×646이라 부담 없음 */
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

  const handlePointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
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
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
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

  const buttonStyle = (active: boolean): CSSProperties => ({
    background: active ? '#111' : '#fff',
    color: active ? '#fff' : '#111',
    border: '1px solid #cfcfcf',
    minWidth: 40,
    minHeight: 40,
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
      </div>

      {/* 스케치 영역 */}
      <div
        className="relative w-full overflow-hidden rounded-xl"
        style={{ aspectRatio: '1900 / 1076', border: '1px solid #e3e3e3' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/body-posture.png"
          alt="체형 평가 그림 — 전면·측면·후면"
          className="absolute inset-0 h-full w-full object-contain"
          style={{ pointerEvents: 'none', background: '#f5f5f5' }}
          draggable={false}
        />
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="absolute inset-0 h-full w-full"
          style={{ touchAction: 'none', cursor: 'crosshair' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endStroke}
          onPointerLeave={endStroke}
          onPointerCancel={endStroke}
        />
      </div>

      <p className="mt-1.5 text-xs" style={{ color: '#8a8a8a' }}>
        체형 그림 위에 직접 표시하세요 — 주름·벌크·비대칭 등 (저장 시 함께 기록됩니다)
      </p>
    </div>
  );
}
