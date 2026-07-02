export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (!authResult.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const outcome = searchParams.get('outcome');

    const VALID_OUTCOMES = ['resisted', 'relapsed', 'distracted'];

    const where: Record<string, unknown> = {};

    if (from || to) {
      where.timestamp = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    if (outcome && VALID_OUTCOMES.includes(outcome)) {
      where.outcome = outcome;
    }

    const [logs, total] = await Promise.all([
      db.urgeLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.urgeLog.count({ where }),
    ]);

    return NextResponse.json({ logs, total, limit, offset });
  } catch (err) {
    console.error('Urge GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

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
