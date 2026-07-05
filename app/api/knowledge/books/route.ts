import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (!authResult.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // كتب فريدة مع عدد الوحدات — بدون embedding
    const [distinct, counts] = await Promise.all([
      db.knowledgeChunk.findMany({
        select: { bookSlug: true, bookTitle: true },
        distinct: ['bookSlug'],
        orderBy: { bookSlug: 'asc' },
      }),
      db.knowledgeChunk.groupBy({
        by: ['bookSlug'],
        _count: { id: true },
      }),
    ]);

    const countMap = Object.fromEntries(
      counts.map((c) => [c.bookSlug, c._count.id])
    );

    const books = distinct.map((c) => ({
      bookSlug: c.bookSlug,
      bookTitle: c.bookTitle,
      unitCount: countMap[c.bookSlug] ?? 0,
    }));

    return NextResponse.json({ books });
  } catch (err) {
    console.error('Books error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
