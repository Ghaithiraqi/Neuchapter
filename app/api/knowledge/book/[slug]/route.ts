import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const authResult = await verifyAuth(req);
  if (!authResult.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug } = await params;

  try {
    // وحدات الكتاب مرتّبة — بدون embedding
    const units = await db.knowledgeChunk.findMany({
      where: { bookSlug: slug },
      select: { unitNumber: true, unitTitle: true, content: true },
      orderBy: { unitNumber: 'asc' },
    });

    if (units.length === 0) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    return NextResponse.json({ units });
  } catch (err) {
    console.error('Book fetch error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
