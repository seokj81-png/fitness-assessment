'use client';

// 보고서 링크 공유 — 모바일에서 OS 공유 시트(카톡·메시지 등)를 연다.
// Web Share API 미지원 환경(구형 브라우저·일부 데스크톱)은 링크 복사로 대체.
export default function ShareButton({ title }: { title: string }) {
  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        /* 사용자가 공유 시트를 닫은 경우 — 무시 */
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        alert('보고서 링크가 복사되었습니다.\n카톡·문자에 붙여넣어 전송하세요.');
      } catch {
        prompt('아래 링크를 복사해 공유하세요:', url);
      }
    }
  }

  return (
    <button onClick={share} className="btn-secondary">
      📤 공유
    </button>
  );
}
