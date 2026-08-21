'use client';

import { useEffect, useState } from 'react';
import { printPage } from '@/lib/browser';

// 결과 페이지의 [data-print-section] 섹션을 수집해
// 체크된 항목만 인쇄되도록 print-exclude 클래스를 토글한다.
export default function PrintSectionPicker() {
  const [sections, setSections] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const names: string[] = [];
    document.querySelectorAll<HTMLElement>('[data-print-section]').forEach((el) => {
      const n = el.dataset.printSection!;
      if (!names.includes(n)) names.push(n);
    });
    setSections(names);
  }, []);

  function toggle(name: string) {
    const next = new Set(excluded);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setExcluded(next);
    document.querySelectorAll<HTMLElement>('[data-print-section]').forEach((el) => {
      if (el.dataset.printSection === name) {
        el.classList.toggle('print-exclude', next.has(name));
      }
    });
  }

  if (!sections.length) return null;

  return (
    <div className="no-print card" style={{ padding: '14px 18px' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-sm font-bold"
        style={{ color: '#111' }}
      >
        <span>🖨️ 인쇄 항목 선택 <span style={{ color: '#8a8a8a', fontWeight: 500 }}>— 체크된 항목만 인쇄됩니다 ({sections.length - excluded.size}/{sections.length})</span></span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <>
          <div className="flex flex-wrap gap-2 mt-3">
            {sections.map((name) => {
              const on = !excluded.has(name);
              return (
                <button
                  key={name}
                  onClick={() => toggle(name)}
                  className="px-3 py-2 rounded-md text-sm font-semibold transition"
                  style={
                    on
                      ? { background: '#111', color: '#fff', border: '1px solid #111' }
                      : { background: '#fff', color: '#8a8a8a', border: '1px solid #d6d6d6', textDecoration: 'line-through' }
                  }
                >
                  {on ? '✓ ' : ''}{name}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={printPage} className="btn-primary text-sm">
              선택 항목 인쇄
            </button>
            {excluded.size > 0 && (
              <button
                onClick={() => {
                  excluded.forEach((n) => toggle(n));
                }}
                className="btn-secondary text-sm"
              >
                전체 선택
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
