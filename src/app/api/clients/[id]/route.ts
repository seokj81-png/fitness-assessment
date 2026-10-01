import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      assessments: {
        orderBy: { date: 'desc' },
      },
    },
  });
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(client);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { dob, ...rest } = body;
  const updated = await prisma.client.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(dob !== undefined ? { dob: dob ? new Date(dob) : null } : {}),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    // 인바디·평가 기록을 먼저 지우고 회원을 지운다 — 한 트랜잭션.
    // 스키마의 onDelete: Cascade가 운영 DB에서도 동작함을 확인했지만(2026-10-01 실험),
    // DB 외래키 설정에 의존하지 않도록 명시 삭제 (OS 통합 등 다른 DB로 옮겨도 같은 동작).
    // 실패 시 사유(Prisma 코드·메시지)를 응답에 담아 화면에서 바로 볼 수 있게 한다.
    await prisma.$transaction([
      prisma.inbodyEntry.deleteMany({ where: { clientId: params.id } }),
      prisma.assessment.deleteMany({ where: { clientId: params.id } }),
      prisma.client.delete({ where: { id: params.id } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const code = (e as { code?: string } | null)?.code;
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[DELETE /api/clients]', code, msg);
    if (code === 'P2025') {
      return NextResponse.json({ error: '이미 삭제된 회원입니다.', code }, { status: 404 });
    }
    return NextResponse.json({ error: msg, code }, { status: 500 });
  }
}
