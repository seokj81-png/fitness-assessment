import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function serialize(data: Record<string, unknown>) {
  const jsonFields = ['parq', 'postureFlags', 'fms', 'ohsaFlags', 'rom'];
  const out: Record<string, unknown> = { ...data };
  for (const k of jsonFields) {
    if (out[k] !== undefined && out[k] !== null && typeof out[k] !== 'string') {
      out[k] = JSON.stringify(out[k]);
    }
  }
  if (out.date && typeof out.date === 'string') {
    out.date = new Date(out.date);
  }
  return out;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const assessment = await prisma.assessment.findUnique({
    where: { id: params.id },
    include: { client: true },
  });
  if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(assessment);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const updated = await prisma.assessment.update({
      where: { id: params.id },
      data: serialize(body) as never,
    });
    return NextResponse.json(updated);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[PATCH /api/assessments]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.assessment.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
