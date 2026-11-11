'use client';

// 평가 입력 화면(③ 자세 · ④ 움직임)에 넣는 카드 — 「카메라로 재기」를 누르면 카메라 창이 뜨고,
// 「이 값을 평가에 넣기」를 누르면 각도가 이 평가(rom)에 들어가 저장 때 같이 저장된다.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import RomCamera, { type CamApply, type CamMode } from './RomCamera';
import CamAngleSummary from './CamAngleSummary';
import { CAM_GROUP_PREFIX, camGroupsIn, type CamGroup } from '@/lib/pose-angles';

const GROUPS: Record<CamMode, CamGroup[]> = { squat: ['squat'], posture: ['front', 'side'] };

export default function CameraAngleCard({
  mode,
  rom,
  photoRoom,
  onApply,
  onClear,
}: {
  mode: CamMode;
  rom: Record<string, number> | undefined;
  /** 자세 사진 칸에 남은 자리 수 */
  photoRoom: number;
  onApply: (r: CamApply) => void;
  /** 이 카드의 카메라 측정값 지우기 (키 앞머리 목록) */
  onClear: (prefixes: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const groups = GROUPS[mode];
  const saved = camGroupsIn(rom).filter((g) => groups.includes(g));

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="card">
      <h3 className="font-bold mb-1">
        카메라로 각도 재기{' '}
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-1 align-middle" style={{ background: '#2c2c2c', color: '#fff' }}>
          시제품
        </span>
      </h3>
      <p className="text-xs mb-3" style={{ color: '#6e6e6e' }}>
        {mode === 'squat'
          ? '옆모습 오버헤드 스쿼트를 카메라로 비춰 무릎·엉덩이·발목·어깨 각도를 잽니다. 가장 깊이 앉은 순간의 값이 이 평가에 저장됩니다.'
          : '서 있는 자세를 정면·옆모습으로 비춰 머리·어깨·골반 기울기와 무릎 정렬을 잽니다. 기록한 값이 이 평가에 저장됩니다.'}{' '}
        참고값이며 영상은 이 기기 안에서만 처리합니다.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
          📷 {saved.length ? '카메라로 다시 재기' : '카메라로 재기'}
        </button>
        {saved.length > 0 && (
          <button type="button" className="btn-secondary" onClick={() => onClear(groups.map((g) => CAM_GROUP_PREFIX[g]))}>
            측정값 지우기
          </button>
        )}
      </div>
      {saved.length > 0 && (
        <div className="mt-3">
          <CamAngleSummary rom={rom} groups={groups} />
        </div>
      )}

      {open &&
        createPortal(
          <div
            className="no-print fixed inset-0 z-[70] overflow-y-auto"
            style={{ background: 'rgba(0,0,0,0.45)' }}
            role="dialog"
            aria-modal="true"
            aria-label="카메라로 각도 재기"
          >
            <div className="min-h-full sm:min-h-0 sm:my-6 mx-auto w-full sm:w-[min(1080px,calc(100%-32px))] sm:rounded-2xl p-4 sm:p-6" style={{ background: '#fff', color: '#2c2c2c' }}>
              <div className="flex justify-end mb-2">
                <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
                  닫기 ×
                </button>
              </div>
              <RomCamera
                mode={mode}
                photoRoom={photoRoom}
                onApply={(r) => {
                  onApply(r);
                  setOpen(false);
                }}
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
