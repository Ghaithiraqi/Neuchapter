import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (!authResult.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const active = await db.streak.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!active) {
      return NextResponse.json({ days: 0, streak: null });
    }

    const now = new Date();
    const days = Math.floor(
      (now.getTime() - active.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return NextResponse.json({ days, streak: active });
  } catch (err) {
    console.error('Streak GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// بدء streak جديد
export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (!authResult.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { action } = await req.json();

    if (action === 'start') {
      // أنهِ أي streak نشط
      await db.streak.updateMany({
        where: { isActive: true },
        data: { isActive: false, endDate: new Date() },
      });

      const streak = await db.streak.create({
        data: { startDate: new Date(), isActive: true },
      });

      return NextResponse.json({ streak, success: true });
    }

    if (action === 'reset') {
      const now = new Date();
      await db.streak.updateMany({
        where: { isActive: true },
        data: {
          isActive: false,
          endDate: now,
          duration: 0,
        },
      });

      const streak = await db.streak.create({
        data: { startDate: now, isActive: true },
      });

      return NextResponse.json({ streak, success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('Streak POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
