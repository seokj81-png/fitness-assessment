import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/inbody?clientId=... — 해당 회원의 인바디 기록 (날짜 오름차순)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientId = url.searchParams.get('clientId') ?? undefined;
  const entries = await prisma.inbodyEntry.findMany({
    where: clientId ? { clientId } : undefined,
    orderBy: { date: 'asc' },
  });
  return NextResponse.json(entries);
}

// POST /api/inbody — 인바디 기록 추가
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clientId, date, weight, bodyFat, smm } = body;
    if (!clientId) {
      return NextResponse.json({ error: 'clientId required' }, { status: 400 });
    }
    const created = await prisma.inbodyEntry.create({
      data: {
        clientId,
        date: date ? new Date(date) : new Date(),
        weight: weight ?? null,
        bodyFat: bodyFat ?? null,
        smm: smm ?? null,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[POST /api/inbody]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
