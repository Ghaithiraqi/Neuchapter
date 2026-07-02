import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { db } from '@/lib/db';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 دقيقة

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // Vercel تُرسل قائمة IPs — الأول هو IP العميل الحقيقي
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  return 'unknown';
}

function minutesUntilReset(windowStart: Date): number {
  const resetAt = new Date(windowStart.getTime() + WINDOW_MS);
  return Math.ceil((resetAt.getTime() - Date.now()) / 60000);
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  try {
    const { passcode } = await req.json();

    if (!passcode || typeof passcode !== 'string') {
      return NextResponse.json({ error: 'مدخل غير صالح' }, { status: 400 });
    }

    // ─── فحص الـ rate limit ──────────────────────────────────────────────────
    const now = new Date();
    let record = await db.loginAttempt.findUnique({ where: { ip } });

    if (record) {
      const windowExpired = now.getTime() - record.windowStart.getTime() > WINDOW_MS;
      if (windowExpired) {
        // النافذة انتهت — أعد التصفير
        record = await db.loginAttempt.update({
          where: { ip },
          data: { attempts: 0, windowStart: now },
        });
      } else if (record.attempts >= MAX_ATTEMPTS) {
        const mins = minutesUntilReset(record.windowStart);
        return NextResponse.json(
          {
            error: `تجاوزت الحد المسموح. حاول مجددًا خلال ${mins} ${mins === 1 ? 'دقيقة' : 'دقائق'}.`,
            retryAfterMinutes: mins,
          },
          { status: 429 },
        );
      }
    }

    // ─── التحقق من الرقم السري ───────────────────────────────────────────────
    const valid = await bcrypt.compare(passcode, process.env.PASSCODE_HASH!);

    if (!valid) {
      // زيادة العداد
      await db.loginAttempt.upsert({
        where: { ip },
        create: { ip, attempts: 1, windowStart: now },
        update: { attempts: { increment: 1 } },
      });

      // كم محاولة تبقّت؟
      const updated = await db.loginAttempt.findUnique({ where: { ip } });
      const remaining = Math.max(0, MAX_ATTEMPTS - (updated?.attempts ?? 1));

      return NextResponse.json(
        {
          error: 'رمز غير صحيح',
          attemptsRemaining: remaining,
        },
        { status: 401 },
      );
    }

    // ─── نجاح: تصفير العداد وإصدار الجلسة ───────────────────────────────────
    await db.loginAttempt.upsert({
      where: { ip },
      create: { ip, attempts: 0, windowStart: now },
      update: { attempts: 0, windowStart: now },
    });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const token = await new SignJWT({ sub: 'ghaith' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret);

    const response = NextResponse.json({ success: true });
    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
