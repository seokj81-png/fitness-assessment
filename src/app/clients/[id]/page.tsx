import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import DeleteClientButton from './DeleteClientButton';
import TrendCharts from '@/components/client/TrendCharts';
import InbodyLog, { type InbodyRow } from '@/components/client/InbodyLog';

export const dynamic = 'force-dynamic';

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      assessments: { orderBy: { date: 'desc' } },
      inbodyEntries: { orderBy: { date: 'asc' } },
    },
  });
  if (!client) notFound();

  const inbodyRows: InbodyRow[] = client.inbodyEntries.map((e) => ({
    id: e.id,
    date: e.date.toISOString(),
    weight: e.weight,
    bodyFat: e.bodyFat,
    smm: e.smm,
  }));

  const age = client.dob ? new Date().getFullYear() - new Date(client.dob).getFullYear() : null;

  // Serialize for client components
  const assessmentRows = client.assessments.map((a) => ({
    id: a.id,
    date: a.date.toISOString(),
    bmi: a.bmi,
    vo2max: a.vo2max,
    fms: a.fms,
    biaBf: a.biaBf,
    bodyFatSf: a.bodyFatSf,
    rhr: a.rhr,
    sbp: a.sbp,
    dbp: a.dbp,
    gripR: a.gripR,
    gripL: a.gripL,
    bp1rm: a.bp1rm,
    sq1rm: a.sq1rm,
    pushupReps: a.pushupReps,
    plankFront: a.plankFront,
  }));

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <Link href="/" className="text-xs text-slate-600 hover:text-slate-900 hover:underline">
            ← 회원님 목록
          </Link>
          <h2 className="text-2xl font-bold text-slate-100 mt-1">{client.name}</h2>
          <div className="text-sm text-slate-400 mt-1">
            {client.sex === 'M' ? '남성' : '여성'}
            {age && ` · ${age}세`}
            {client.height && ` · ${client.height} cm`}
            {client.weight && ` · ${client.weight} kg`}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {client.assessments.length > 0 && (
            <Link href={`/clients/${client.id}/report`} className="btn-secondary">
              📋 리포트 만들기
            </Link>
          )}
          <Link href={`/clients/${client.id}/edit`} className="btn-secondary">
            정보 수정
          </Link>
          <Link href={`/clients/${client.id}/assessment/new`} className="btn-primary">
            {client.assessments.length > 0 ? '+ 재평가' : '+ 첫 체력평가'}
          </Link>
          <DeleteClientButton id={client.id} />
        </div>
      </div>

      {/* Info + Assessment list */}
      <div className="grid md:grid-cols-3 gap-5">
        {/* Basic Info */}
        <div className="card md:col-span-1">
          <h3 className="font-bold text-slate-100 mb-3">기본 정보</h3>
          <dl className="text-sm space-y-2">
            <Row label="지점">{client.branch || '미지정'}</Row>
            <Row label="담당 트레이너">{client.trainer || '미지정'}</Row>
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
              <p className="text-slate-300 whitespace-pre-wrap text-xs bg-slate-800 p-2 rounded border border-slate-700">
                {client.medical}
              </p>
            </div>
          )}
        </div>

        {/* Assessment history list */}
        <div className="md:col-span-2">
          <div className="card">
            <h3 className="font-bold text-slate-100 mb-3">
              평가 이력 ({client.assessments.length}회)
            </h3>
            {client.assessments.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">
                아직 체력평가 기록이 없습니다. 상단의 &lsquo;+ 새 체력평가&rsquo; 버튼으로 시작하세요.
              </p>
            ) : (
              <div className="divide-y divide-slate-700">
                {client.assessments.map((a) => (
                  <Link
                    key={a.id}
                    href={`/clients/${client.id}/assessment/${a.id}`}
                    className="block py-3 hover:bg-slate-700/30 -mx-4 px-4 rounded transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <div className="font-semibold text-slate-100">
                          {new Date(a.date).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        {a.assessor && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            측정자: {a.assessor}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 text-xs flex-wrap">
                        {a.bmi && (
                          <span className="bg-slate-700 text-slate-300 px-2 py-1 rounded">
                            BMI {a.bmi.toFixed(1)}
                          </span>
                        )}
                        {a.vo2max && (
                          <span className="bg-slate-700 text-slate-300 px-2 py-1 rounded">
                            VO₂ {a.vo2max.toFixed(1)}
                          </span>
                        )}
                        {a.fms && <FmsBadge raw={a.fms} />}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 인바디 수시 기록 — 평가와 독립적으로 자주 측정·누적 */}
      <div className="mt-5">
        <InbodyLog clientId={client.id} initial={inbodyRows} />
      </div>

      {/* Trend Charts – shown when there are ≥ 1 assessments with data */}
      {client.assessments.length >= 1 && (
        <TrendCharts
          assessments={assessmentRows}
          sex={client.sex === 'F' ? 'F' : 'M'}
          age={age ?? 30}
          weight={client.weight}
        />
      )}
    </div>
  );
}

function FmsBadge({ raw }: { raw: string }) {
  try {
    const fms = JSON.parse(raw) as Record<string, number>;
    const bilateral = ['hs', 'lu', 'sm', 'aslr', 'rs'];
    const total =
      (fms['dsq'] ?? 0) +
      (fms['tsp'] ?? 0) +
      bilateral.reduce((s, id) => {
        const r = fms[`${id}_r`];
        const l = fms[`${id}_l`];
        return s + (r != null && l != null ? Math.min(r, l) : 0);
      }, 0);
    return (
      <span className="bg-slate-700 text-slate-300 px-2 py-1 rounded">
        FMS {total}/21
      </span>
    );
  } catch {
    return null;
  }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-slate-700 py-1">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-300">{children}</dd>
    </div>
  );
}

function expLabel(v: string | null) {
  return (
    { none: '없음', beginner: '초급', intermediate: '중급', advanced: '고급' }[v || ''] || '-'
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
