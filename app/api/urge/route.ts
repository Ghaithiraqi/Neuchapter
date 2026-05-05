import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (!authResult.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { intensity, trigger, context, outcome, duration } = await req.json();

    const log = await db.urgeLog.create({
      data: {
        intensity: intensity ?? 5,
        trigger: trigger ?? null,
        context: context ?? null,
        outcome: outcome ?? 'resisted',
        duration: duration ?? null,
      },
    });

    return NextResponse.json({ id: log.id, success: true });
  } catch (err) {
    console.error('Urge error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
