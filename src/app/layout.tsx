import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: '파프짐 체력 평가 시스템 | Comprehensive Fitness Assessment',
  description:
    '운동 프로그램 설계를 위한 사전 평가 — ACSM · NSCA · NASM · FMS 가이드라인 기반',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <header className="bg-gradient-to-r from-slate-900 to-blue-800 text-white py-5 px-5 shadow-md sticky top-0 z-40">
          <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
            <Link href="/" className="block">
              <h1 className="text-xl font-bold leading-tight">파프짐 체력 평가 시스템</h1>
              <p className="text-xs opacity-80">Comprehensive Fitness Assessment — ACSM · NSCA · NASM · FMS</p>
            </Link>
            <nav className="flex gap-2 text-sm no-print">
              <Link href="/" className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20">
                회원님 목록
              </Link>
              <Link
                href="/clients/new"
                className="px-3 py-1.5 rounded bg-white text-blue-800 font-semibold hover:bg-blue-50"
              >
                + 새 회원님
              </Link>
            </nav>
          </div>
        </header>
        <main className="max-w-7xl mx-auto p-5">{children}</main>
      </body>
    </html>
  );
}
