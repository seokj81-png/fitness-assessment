import Link from 'next/link';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const clients = await prisma.client.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      assessments: { orderBy: { date: 'desc' }, take: 1 },
      _count: { select: { assessments: true } },
    },
  });

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

      {clients.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-slate-400 text-5xl mb-4">📋</div>
          <h3 className="text-lg font-semibold mb-2">등록된 회원님가 없습니다</h3>
          <p className="text-sm text-slate-600 mb-6">새 회원님를 등록하고 체력평가를 시작하세요.</p>
          <Link href="/clients/new" className="btn-primary inline-block">
            첫 회원님 등록
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((c) => (
            <Link
              key={c.id}
              href={`/clients/${c.id}`}
              className="card hover:shadow-md hover:border-slate-400 transition block"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{c.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {c.sex === 'M' ? '남' : c.sex === 'F' ? '여' : '-'}
                    {c.dob && ` · ${new Date().getFullYear() - new Date(c.dob).getFullYear()}세`}
                  </p>
                </div>
                <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-1 rounded">
                  {c._count.assessments}회 평가
                </span>
              </div>
              <div className="mt-3 text-xs text-slate-600">
                {c.assessments[0] ? (
                  <>최근 측정: {new Date(c.assessments[0].date).toLocaleDateString('ko-KR')}</>
                ) : (
                  <span className="text-slate-400">평가 기록 없음</span>
                )}
              </div>
              {c.goal && (
                <div className={`mt-2 text-[11px] inline-block px-2 py-0.5 rounded font-medium ${goalColor(c.goal)}`}>
                  {goalLabel(c.goal)}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function goalLabel(g: string) {
  return (
    {
      health: '일반 건강',
      weight: '체중 관리',
      strength: '근력/근비대',
      performance: '경기력',
      rehab: '재활',
    }[g] || g
  );
}

function goalColor(g: string) {
  return (
    {
      health: 'bg-slate-100 text-slate-700',
      weight: 'bg-slate-100 text-slate-700',
      strength: 'bg-slate-100 text-slate-700',
      performance: 'bg-slate-100 text-slate-700',
      rehab: 'bg-slate-100 text-slate-700',
    }[g] || 'bg-slate-700 text-slate-300'
  );
}
