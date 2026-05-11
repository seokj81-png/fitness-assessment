'use client';

import Image from 'next/image';

export default function BodyPostureViewer() {
  return (
    <div className="card mb-4">
      <h3 className="font-bold mb-2">
        NASM 정적 자세 평가 <span className="guideline-tag tag-nasm">NASM</span>
      </h3>
      <p className="text-xs text-slate-500 mb-3">
        5가지 운동 사슬(kinetic chain) 체크포인트를 전면·측면·후면에서 관찰합니다.
        파란 번호가 NASM의 5 Kinetic Chain Checkpoints입니다.
      </p>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="grid grid-cols-3">
          {[
            { label: '전면 Anterior', bg: '#1d4ed8' },
            { label: '측면 Lateral',  bg: '#0f766e' },
            { label: '후면 Posterior', bg: '#6d28d9' },
          ].map(({ label, bg }) => (
            <div key={label} className="text-center py-2 text-white text-sm font-semibold" style={{ background: bg }}>
              {label}
            </div>
          ))}
        </div>
        <div className="bg-slate-100 p-4">
          <Image
            src="/body-posture.png"
            alt="전면·측면·후면 신체 자세 평가 일러스트"
            width={1900}
            height={1076}
            className="w-full h-auto"
            priority
          />
        </div>
      </div>
    </div>
  );
}
