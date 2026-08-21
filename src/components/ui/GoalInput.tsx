'use client';

import { useState } from 'react';

// 운동 목적 — 기본 5종 + 직접 입력 (트레이너 피드백: 타이핑 입력 요청)
const KNOWN: [string, string][] = [
  ['health', '일반 건강 General Health'],
  ['weight', '체중 관리 Weight Management'],
  ['strength', '근력/근비대 Strength/Hypertrophy'],
  ['performance', '경기력 Performance'],
  ['rehab', '재활 Rehabilitation'],
];

export default function GoalInput({ defaultValue = 'health' }: { defaultValue?: string }) {
  const isKnown = KNOWN.some(([k]) => k === defaultValue);
  const [mode, setMode] = useState(isKnown ? defaultValue : 'custom');
  const [custom, setCustom] = useState(isKnown ? '' : defaultValue);
  const value = mode === 'custom' ? custom.trim() : mode;

  return (
    <>
      <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
        {KNOWN.map(([k, l]) => (
          <option key={k} value={k}>{l}</option>
        ))}
        <option value="custom">직접 입력…</option>
      </select>
      {mode === 'custom' && (
        <input
          className="input mt-2"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="예) 바디프로필, 마라톤 완주, 골프 비거리"
          autoFocus
        />
      )}
      <input type="hidden" name="goal" value={value} />
    </>
  );
}
