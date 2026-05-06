export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (!authResult.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const sessions = await db.chatSession.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'asc' },
          where: { role: 'user' },
        },
        _count: { select: { messages: true } },
      },
    });

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        mode: s.mode,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        messageCount: s._count.messages,
        firstMessage: s.messages[0]?.content?.slice(0, 80) ?? '',
      })),
    });
  } catch (err) {
    console.error('History GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
