import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function serialize(data: Record<string, unknown>) {
  const jsonFields = ['parq', 'postureFlags', 'fms', 'ohsaFlags', 'rom', 'breathQ', 'posturePhotos'];
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const created = await prisma.assessment.create({ data: serialize(body) as never });
    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[POST /api/assessments]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientId = url.searchParams.get('clientId') ?? undefined;
  const assessments = await prisma.assessment.findMany({
    where: clientId ? { clientId } : undefined,
    orderBy: { date: 'desc' },
    include: { client: true },
  });
  return NextResponse.json(assessments);
}
