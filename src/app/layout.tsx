import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import FontSizeToggle from '@/components/ui/FontSizeToggle';
import AppInstall from '@/components/ui/AppInstall';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './globals.css';

export const metadata: Metadata = {
  title: '파프짐 체력 평가 시스템 | Comprehensive Fitness Assessment',
  description:
    '운동 프로그램 설계를 위한 사전 평가 — ACSM · NSCA · NASM · FMS 가이드라인 기반',
  // 앱 설치(PWA): 크롬 '앱 설치'·안드로이드 홈 화면·아이폰 '홈 화면에 추가'
  applicationName: '파프짐 체력평가',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: '파프짐 체력평가', statusBarStyle: 'black' },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
};

// 모바일 핀치 축소 허용 (최소 50%) — 플로어에서 화면 전체 보기용
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 0.5,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#ffffff', // 설치된 앱의 창 제목 표시줄·안드로이드 상단바 색 (헤더와 동일)
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {/* 머리줄 — 파프짐 OS와 같은 결: 흰 바탕·가는 아래 선·워드마크 로고 아래 자간 넓힌 작은 이름 */}
        <header className="sticky top-0 z-40 border-b" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-x-3 gap-y-2 px-4 sm:px-6 py-3">
            <Link href="/" aria-label="파프짐 체력평가 홈" className="flex shrink-0 flex-col items-start gap-[3px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/pafgym-logo-nav.png" alt="PAFGYM" width={114} height={36} className="h-8 sm:h-9 w-auto" />
              <span
                aria-hidden="true"
                className="flex w-full justify-between text-[8px] font-medium leading-none"
                style={{ color: 'var(--text-2)' }}
              >
                {'체력평가시스템'.split('').map((ch, i) => (
                  <span key={i}>{ch}</span>
                ))}
              </span>
              <h1 className="sr-only">파프짐 체력 평가 시스템</h1>
            </Link>
            <nav className="flex gap-2 text-sm no-print items-center flex-wrap">
              <AppInstall />
              <FontSizeToggle />
              {/* 좁은 화면에서는 숨김 — 로고를 누르면 회원님 목록(홈)으로 간다 */}
              <Link href="/" className="btn-secondary hidden sm:inline-block">
                회원님 목록
              </Link>
              <Link href="/clients/new" className="btn-primary">
                + 새 회원님
              </Link>
            </nav>
          </div>
        </header>
        <main className="max-w-7xl mx-auto p-4 md:p-5">{children}</main>
      </body>
    </html>
  );
}
