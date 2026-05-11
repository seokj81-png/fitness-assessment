import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const clients = await prisma.client.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      assessments: {
        orderBy: { date: 'desc' },
        take: 1,
        select: { id: true, date: true },
      },
      _count: { select: { assessments: true } },
    },
  });
  return NextResponse.json(clients);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { dob, ...rest } = body;
  const created = await prisma.client.create({
    data: {
      ...rest,
      dob: dob ? new Date(dob) : null,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
