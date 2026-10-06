'use client';

import { useEffect, useState } from 'react';

// 크롬이 '설치 가능' 판정을 내리면 beforeinstallprompt 이벤트가 온다 (안드로이드·데스크톱 크롬).
// 아이폰 Safari는 이 이벤트가 없어 버튼이 보이지 않는다 → 공유 → 홈 화면에 추가로 안내.
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export default function AppInstall() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    const nav = navigator as Navigator & { standalone?: boolean };
    const standalone = window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
    if (standalone) return; // 이미 앱으로 열림

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!deferred) return null;

  async function install() {
    if (!deferred) return;
    const ev = deferred;
    setDeferred(null); // prompt()는 한 번만 쓸 수 있음
    await ev.prompt();
    await ev.userChoice.catch(() => undefined);
  }

  return (
    <button
      type="button"
      onClick={install}
      title="이 시스템을 앱처럼 설치합니다 (홈 화면·앱 목록에 아이콘 추가)"
      className="px-3.5 py-2 rounded-md border border-white/30 hover:border-white text-white"
    >
      📲 앱 설치
    </button>
  );
}
