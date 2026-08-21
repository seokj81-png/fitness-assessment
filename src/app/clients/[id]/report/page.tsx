import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { fullAge } from '@/lib/calculations';
import ReportBuilder, { type ReportAssessment } from './ReportBuilder';

export const dynamic = 'force-dynamic';

// P0-3 진척 리포트 — 회원 전달용 1페이지 (비교 회차 선택 + 코멘트/4주 목표 → 인쇄·이미지 저장)
export default async function ReportPage({ params }: { params: { id: string } }) {
  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: { assessments: { orderBy: { date: 'asc' } } },
  });
  if (!client) notFound();

  if (client.assessments.length === 0) {
    return (
      <div className="card text-center py-10">
        <p className="text-sm text-slate-400 mb-4">
          평가 기록이 없어 리포트를 만들 수 없습니다. 먼저 체력평가를 진행해 주세요.
        </p>
        <Link href={`/clients/${client.id}`} className="btn-secondary">
          ← {client.name} 상세로
        </Link>
      </div>
    );
  }

  const rows: ReportAssessment[] = client.assessments.map((a) => ({
    id: a.id,
    date: a.date.toISOString(),
    assessor: a.assessor,
    weight: a.weight,
    height: a.height,
    bmi: a.bmi,
    biaBf: a.biaBf,
    biaSmm: a.biaSmm,
    rockportTime: a.rockportTime,
    rockportHr: a.rockportHr,
    run15Time: a.run15Time,
    run5minDist: a.run5minDist,
    cooperDist: a.cooperDist,
    vo2max: a.vo2max,
    gripR: a.gripR,
    gripL: a.gripL,
    bp1rm: a.bp1rm,
    sq1rm: a.sq1rm,
    dl1rm: a.dl1rm,
    ohp1rm: a.ohp1rm,
    pc1rm: a.pc1rm,
    lp1rm: a.lp1rm,
    pushupReps: a.pushupReps,
    pullupReps: a.pullupReps,
    curlupReps: a.curlupReps,
    squatReps: a.squatReps,
    plankFront: a.plankFront,
    sorensen: a.sorensen,
    balanceR: a.balanceR,
    balanceL: a.balanceL,
    fms: a.fms,
    clearSh: a.clearSh,
    clearExt: a.clearExt,
    clearFlex: a.clearFlex,
  }));

  const age = fullAge(client.dob);

  return (
    <ReportBuilder
      client={{
        id: client.id,
        name: client.name,
        sex: client.sex === 'F' ? 'F' : 'M',
        age,
        trainer: client.trainer,
        branch: client.branch,
        weight: client.weight,
      }}
      assessments={rows}
    />
  );
}
