import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import DeleteClientButton from './DeleteClientButton';

export const dynamic = 'force-dynamic';

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: { assessments: { orderBy: { date: 'desc' } } },
  });
  if (!client) notFound();

  const age = client.dob ? new Date().getFullYear() - new Date(client.dob).getFullYear() : null;

  return (
    <div>
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <Link href="/" className="text-xs text-blue-600 hover:underline">
            ← 회원님 목록
          </Link>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">{client.name}</h2>
          <div className="text-sm text-slate-600 mt-1">
            {client.sex === 'M' ? '남성' : '여성'}
            {age && ` · ${age}세`}
            {client.height && ` · ${client.height} cm`}
            {client.weight && ` · ${client.weight} kg`}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/clients/${client.id}/edit`} className="btn-secondary">
            정보 수정
          </Link>
          <Link href={`/clients/${client.id}/assessment/new`} className="btn-primary">
            + 새 체력평가
          </Link>
          <DeleteClientButton id={client.id} />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        <div className="card md:col-span-1">
          <h3 className="font-bold text-slate-900 mb-3">기본 정보</h3>
          <dl className="text-sm space-y-2">
            <Row label="운동경력">{expLabel(client.experience)}</Row>
            <Row label="운동 목적">{goalLabel(client.goal)}</Row>
            <Row label="직업">{client.occupation || '-'}</Row>
            <Row label="흡연">
              {client.smoking === 'yes' ? '현재' : client.smoking === 'ex' ? '과거' : '비흡연'}
            </Row>
            <Row label="등록일">{new Date(client.createdAt).toLocaleDateString('ko-KR')}</Row>
          </dl>
          {client.medical && (
            <div className="mt-4 text-sm">
              <div className="label mb-1">의료 이력</div>
              <p className="text-slate-700 whitespace-pre-wrap text-xs bg-slate-50 p-2 rounded border border-slate-200">
                {client.medical}
              </p>
            </div>
          )}
        </div>

        <div className="md:col-span-2">
          <div className="card">
            <h3 className="font-bold text-slate-900 mb-3">평가 이력 ({client.assessments.length}회)</h3>
            {client.assessments.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">
                아직 체력평가 기록이 없습니다. 상단의 &lsquo;+ 새 체력평가&rsquo; 버튼으로 시작하세요.
              </p>
            ) : (
              <div className="divide-y divide-slate-200">
                {client.assessments.map((a) => (
                  <Link
                    key={a.id}
                    href={`/clients/${client.id}/assessment/${a.id}`}
                    className="block py-3 hover:bg-slate-50 -mx-4 px-4 rounded"
                  >
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <div className="font-semibold text-slate-900">
                          {new Date(a.date).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5">
                          {a.assessor && `측정자: ${a.assessor}`}
                        </div>
                      </div>
                      <div className="flex gap-2 text-xs flex-wrap">
                        {a.bmi && <span className="bg-slate-100 px-2 py-1 rounded">BMI {a.bmi.toFixed(1)}</span>}
                        {a.vo2max && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            VO₂ {a.vo2max.toFixed(1)}
                          </span>
                        )}
                        {a.fms && (
                          <FmsBadge raw={a.fms} />
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FmsBadge({ raw }: { raw: string }) {
  try {
    const fms = JSON.parse(raw) as Record<string, number>;
    const total = Object.entries(fms)
      .filter(([k]) => !k.endsWith('_r') && !k.endsWith('_l'))
      .reduce((s, [, v]) => s + v, 0) +
      ['hs', 'lu', 'sm', 'aslr', 'rs']
        .map((id) => {
          const r = fms[`${id}_r`];
          const l = fms[`${id}_l`];
          return r !== undefined && l !== undefined ? Math.min(r, l) : 0;
        })
        .reduce((s, v) => s + v, 0);
    return <span className="bg-violet-100 text-violet-800 px-2 py-1 rounded">FMS {total}/21</span>;
  } catch {
    return null;
  }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-1">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{children}</dd>
    </div>
  );
}

function expLabel(v: string | null) {
  return (
    {
      none: '없음',
      beginner: '초급',
      intermediate: '중급',
      advanced: '고급',
    }[v || ''] || '-'
  );
}

function goalLabel(v: string | null) {
  return (
    {
      health: '일반 건강',
      weight: '체중 관리',
      strength: '근력/근비대',
      performance: '경기력',
      rehab: '재활',
    }[v || ''] || '-'
  );
}
