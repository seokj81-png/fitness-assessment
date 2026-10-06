import type { Metadata } from 'next';

// 인터넷이 끊겼을 때 서비스 워커(public/sw.js)가 보여 주는 안내 페이지.
// CSS·JS가 못 올라와도 읽히도록 인라인 스타일만 쓴다.
export const metadata: Metadata = { title: '인터넷 연결 없음 | 파프짐 체력 평가 시스템' };

export default function OfflinePage() {
  return (
    <div
      style={{
        maxWidth: 520,
        margin: '48px auto',
        padding: '32px 24px',
        background: '#fff',
        border: '1px solid #e3e3e3',
        borderRadius: 12,
        textAlign: 'center',
        wordBreak: 'keep-all',
      }}
    >
      <div style={{ fontSize: 44, lineHeight: 1 }} aria-hidden>
        📡
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: '14px 0 8px' }}>인터넷이 연결되어 있지 않아요</h2>
      <p style={{ color: '#555', lineHeight: 1.6, margin: '0 0 20px' }}>
        회원 정보와 평가 기록은 인터넷이 있어야 불러올 수 있어요.
        <br />
        와이파이나 데이터를 켠 뒤 다시 시도해 주세요.
      </p>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- 전체 새로고침이 필요 */}
      <a
        href="/"
        style={{
          display: 'inline-block',
          padding: '10px 20px',
          background: '#111',
          color: '#fff',
          borderRadius: 8,
          fontWeight: 700,
          textDecoration: 'none',
        }}
      >
        다시 시도
      </a>
    </div>
  );
}
