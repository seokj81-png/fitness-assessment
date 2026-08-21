import Link from 'next/link';
import { prisma } from '@/lib/db';
import { fullAge } from '@/lib/calculations';
import ClientDirectory, { type ClientRow } from '@/components/client/ClientDirectory';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const clients = await prisma.client.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      assessments: { orderBy: { date: 'desc' }, take: 1 },
      _count: { select: { assessments: true } },
    },
  });

  const rows: ClientRow[] = clients.map((c) => ({
    id: c.id,
    name: c.name,
    sex: c.sex,
    age: fullAge(c.dob),
    branch: c.branch,
    trainer: c.trainer,
    goal: c.goal,
    count: c._count.assessments,
    lastDate: c.assessments[0] ? c.assessments[0].date.toISOString() : null,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">회원님 목록</h2>
          <p className="text-sm text-slate-600 mt-1">
            운동 프로그램 설계 전 종합 체력평가 · Subject Directory
          </p>
        </div>
        <Link href="/clients/new" className="btn-primary">
          + 새 회원님 등록
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-slate-400 text-5xl mb-4">📋</div>
          <h3 className="text-lg font-semibold mb-2">등록된 회원님이 없습니다</h3>
          <p className="text-sm text-slate-600 mb-6">새 회원님을 등록하고 체력평가를 시작하세요.</p>
          <Link href="/clients/new" className="btn-primary inline-block">
            첫 회원님 등록
          </Link>
        </div>
      ) : (
        <ClientDirectory rows={rows} />
      )}
    </div>
  );
}
