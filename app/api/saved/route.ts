export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (!authResult.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const messages = await db.savedMessage.findMany({
      orderBy: { savedAt: 'desc' },
    });
    return NextResponse.json({ messages });
  } catch (err) {
    console.error('Saved GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (!authResult.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { content, mode, sessionId } = await req.json() as {
      content: string;
      mode?: string;
      sessionId?: number;
    };
    if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 });

    const saved = await db.savedMessage.create({
      data: { content, mode, sessionId },
    });
    return NextResponse.json({ saved, success: true });
  } catch (err) {
    console.error('Saved POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (!authResult.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get('id') ?? '');
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    await db.savedMessage.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Saved DELETE error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
