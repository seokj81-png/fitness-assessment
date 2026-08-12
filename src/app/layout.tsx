import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import FontSizeToggle from '@/components/ui/FontSizeToggle';
import './globals.css';

export const metadata: Metadata = {
  title: '파프짐 체력 평가 시스템 | Comprehensive Fitness Assessment',
  description:
    '운동 프로그램 설계를 위한 사전 평가 — ACSM · NSCA · NASM · FMS 가이드라인 기반',
};

// 모바일 핀치 축소 허용 (최소 50%) — 플로어에서 화면 전체 보기용
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 0.5,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <header style={{ background: '#101010' }} className="text-white py-4 md:py-5 px-4 md:px-5 sticky top-0 z-40 border-b border-black">
          <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
            <Link href="/" className="block">
              <h1 className="text-lg md:text-xl font-bold leading-tight tracking-tight">파프짐 체력 평가 시스템</h1>
              <p className="text-[11px] md:text-xs" style={{ color: '#9a9a9a' }}>Comprehensive Fitness Assessment — ACSM · NSCA · NASM · FMS</p>
            </Link>
            <nav className="flex gap-2 text-sm no-print items-center">
              <FontSizeToggle />
              <Link href="/" className="px-3.5 py-2 rounded-md border border-white/30 hover:border-white text-white">
                회원님 목록
              </Link>
              <Link
                href="/clients/new"
                className="px-3.5 py-2 rounded-md bg-white font-semibold hover:opacity-85"
                style={{ color: '#111' }}
              >
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
