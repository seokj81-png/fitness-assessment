import Link from 'next/link';
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
      <div className="mb-5">
        <Link
          href={`/clients/${client.id}`}
          className="text-xs text-blue-600 hover:underline"
        >
          ← {client.name} 상세
        </Link>
        <h2 className="text-2xl font-bold text-slate-900 mt-1">
          새 체력평가 · {client.name}
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          ACSM · NSCA · NASM · FMS 가이드라인 기반 종합 평가
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
      />
    </div>
  );
}
