export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

/** UTC midnight timestamp for a Date */
function utcMidnight(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Calculate days from startDate to today (inclusive), UTC-based */
function calcDays(startDate: Date): number {
  const startMs = utcMidnight(startDate);
  const nowMs = utcMidnight(new Date());
  return Math.floor((nowMs - startMs) / 86_400_000) + 1;
}

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (!authResult.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const allStreaks = await db.streak.findMany({
      orderBy: { startDate: 'asc' },
    });

    let active = allStreaks.find((s) => s.isActive) ?? null;

    // أنشئ streak تلقائياً فقط إذا لم يكن هناك أي streak أبداً
    if (allStreaks.length === 0) {
      active = await db.streak.create({
        data: { startDate: new Date(), isActive: true },
      });
      allStreaks.push(active);
    }

    const days = active ? calcDays(active.startDate) : 0;

    // إحصائيات مجمّعة
    const completed = allStreaks.filter((s) => !s.isActive && s.duration != null);
    const longestStreak = Math.max(0, days, ...completed.map((s) => s.duration ?? 0));
    const avgStreak =
      completed.length > 0
        ? Math.round(
            completed.reduce((sum, s) => sum + (s.duration ?? 0), 0) / completed.length
          )
        : days;
    const totalCleanDays =
      completed.reduce((sum, s) => sum + (s.duration ?? 0), 0) + days;

    return NextResponse.json({
      days,
      streak: active,
      allStreaks,
      stats: { longestStreak, avgStreak, totalCleanDays },
    });
  } catch (err) {
    console.error('Streak GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (!authResult.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action } = body as { action: string; startDate?: string };

    // ─── إعادة الضبط (relapse) ────────────────────────────────────────────────
    if (action === 'reset') {
      const now = new Date();

      const active = await db.streak.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      if (active) {
        const duration = calcDays(active.startDate);
        await db.streak.update({
          where: { id: active.id },
          data: {
            isActive: false,
            endDate: now,
            relapseDate: now,
            duration,
          },
        });
      }

      const streak = await db.streak.create({
        data: { startDate: now, isActive: true },
      });

      return NextResponse.json({ streak, success: true });
    }

    // ─── بدء جديد (بدون حفظ كـ relapse) ────────────────────────────────────
    if (action === 'start') {
      const now = new Date();

      const active = await db.streak.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      if (active) {
        const duration = calcDays(active.startDate);
        await db.streak.update({
          where: { id: active.id },
          data: { isActive: false, endDate: now, duration },
        });
      }

      const streak = await db.streak.create({
        data: { startDate: now, isActive: true },
      });

      return NextResponse.json({ streak, success: true });
    }

    // ─── تحديث تاريخ البداية ─────────────────────────────────────────────────
    if (action === 'updateStartDate') {
      const { startDate } = body as { startDate?: string; action: string };
      if (!startDate) {
        return NextResponse.json({ error: 'startDate required' }, { status: 400 });
      }

      const active = await db.streak.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      if (!active) {
        return NextResponse.json({ error: 'No active streak' }, { status: 404 });
      }

      const updated = await db.streak.update({
        where: { id: active.id },
        data: { startDate: new Date(startDate) },
      });

      return NextResponse.json({ streak: updated, success: true });
    }

    // ─── استخدام التأمين ──────────────────────────────────────────────────────
    if (action === 'useInsurance') {
      const active = await db.streak.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      if (!active) {
        return NextResponse.json({ error: 'No active streak' }, { status: 404 });
      }
      if (active.insuranceUsed) {
        return NextResponse.json({ error: 'Insurance already used' }, { status: 400 });
      }

      const updated = await db.streak.update({
        where: { id: active.id },
        data: { insuranceUsed: true },
      });

      return NextResponse.json({ streak: updated, success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('Streak POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
