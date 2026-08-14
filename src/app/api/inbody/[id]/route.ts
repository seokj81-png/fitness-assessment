import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// DELETE /api/inbody/:id — 인바디 기록 삭제
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.inbodyEntry.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
