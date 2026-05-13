import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import AssessmentForm from '@/components/assessment/AssessmentForm';

export const dynamic = 'force-dynamic';

export default async function NewAssessmentPage({
  params,
}: {
  params: { id: string };
}) {
  const client = await prisma.client.findUnique({
    where: { id: params.id },
  });
  if (!client) notFound();

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
        pageTitle={`새 체력평가 · ${client.name}`}
        pageSubtitle="ACSM · NSCA · NASM · FMS 가이드라인 기반 종합 평가"
        backHref={`/clients/${client.id}`}
        backLabel={`${client.name} 상세`}
      />
    </div>
  );
}
