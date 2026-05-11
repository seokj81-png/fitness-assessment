import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import AssessmentForm from '@/components/assessment/AssessmentForm';
import { parseAssessment } from '@/lib/parse-assessment';

export const dynamic = 'force-dynamic';

export default async function EditAssessmentPage({
  params,
}: {
  params: { id: string; aid: string };
}) {
  const [client, assessment] = await Promise.all([
    prisma.client.findUnique({ where: { id: params.id } }),
    prisma.assessment.findUnique({ where: { id: params.aid } }),
  ]);
  if (!client || !assessment || assessment.clientId !== client.id) notFound();

  const existing = parseAssessment(assessment);

  return (
    <div>
      <div className="mb-5">
        <Link
          href={`/clients/${client.id}/assessment/${assessment.id}`}
          className="text-xs text-blue-600 hover:underline"
        >
          ← 평가 상세
        </Link>
        <h2 className="text-2xl font-bold text-slate-900 mt-1">
          체력평가 수정 · {client.name}
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          평가일:{' '}
          {new Date(assessment.date).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      <AssessmentForm
        client={{
          id: client.id,
          name: client.name,
          sex: client.sex,
          dob: client.dob ? client.dob.toISOString() : null,
          height: client.height,
          weight: client.weight,
          goal: client.goal,
        }}
        existing={existing}
      />
    </div>
  );
}
