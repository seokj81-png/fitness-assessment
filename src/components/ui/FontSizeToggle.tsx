'use client';

import { useEffect, useState } from 'react';

// 전역 글자 크기 조절 — html font-size %를 바꾸면 rem 기반(tailwind text-*) 크기가 함께 조절됨
const SIZES = [
  { key: 'sm', label: '가', px: '13px', pct: '87.5%', title: '작게' },
  { key: 'md', label: '가', px: '15px', pct: '100%', title: '보통' },
  { key: 'lg', label: '가', px: '17px', pct: '112.5%', title: '크게' },
] as const;

const STORAGE_KEY = 'pafgym-font-size';

export default function FontSizeToggle() {
  const [size, setSize] = useState<string>('md');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SIZES.some((s) => s.key === saved)) {
      setSize(saved);
      apply(saved);
    }
  }, []);

  function apply(key: string) {
    const s = SIZES.find((x) => x.key === key);
    document.documentElement.style.fontSize = s ? s.pct : '100%';
  }

  function choose(key: string) {
    setSize(key);
    localStorage.setItem(STORAGE_KEY, key);
    apply(key);
  }

  return (
    <div
      className="flex items-center rounded-md overflow-hidden no-print"
      style={{ border: '1px solid rgba(255,255,255,0.3)' }}
      aria-label="글자 크기 조절"
    >
      {SIZES.map((s) => (
        <button
          key={s.key}
          onClick={() => choose(s.key)}
          title={`글자 ${s.title}`}
          className="px-2.5 transition"
          style={{
            fontSize: s.px,
            lineHeight: '34px',
            height: 36,
            background: size === s.key ? '#fff' : 'transparent',
            color: size === s.key ? '#111' : '#fff',
            fontWeight: 700,
          }}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
