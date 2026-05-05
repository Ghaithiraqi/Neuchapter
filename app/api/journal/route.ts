import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (!authResult.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { content, type, mood, energy } = await req.json();

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
    }

    const entry = await db.journalEntry.create({
      data: {
        content,
        type: type ?? 'text',
        mood: mood ?? null,
        energy: energy ?? null,
        wordCount: content.split(/\s+/).filter(Boolean).length,
      },
    });

    return NextResponse.json({ id: entry.id, success: true });
  } catch (err) {
    console.error('Journal error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (!authResult.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') ?? '20');
    const offset = parseInt(searchParams.get('offset') ?? '0');

    const entries = await db.journalEntry.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return NextResponse.json({ entries });
  } catch (err) {
    console.error('Journal GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
