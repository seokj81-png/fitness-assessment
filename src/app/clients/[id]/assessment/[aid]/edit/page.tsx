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
  const dateStr = new Date(assessment.date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div>
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
        pageTitle={`체력평가 수정 · ${client.name}`}
        pageSubtitle={`평가일: ${dateStr}`}
        backHref={`/clients/${client.id}/assessment/${assessment.id}`}
        backLabel="평가 상세"
      />
    </div>
  );
}
