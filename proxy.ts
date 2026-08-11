import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function proxy(req: NextRequest) {
  const token = req.cookies.get('session')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/unlock', req.url));
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/unlock', req.url));
  }
}

export const config = {
  // يستثني: ملفات _next الثابتة، الصور، favicon، manifest، sw، swe-worker
  // (سكربت next-pwa الإضافي، اسمه يحمل hash يتغيّر كل build)، الأيقونات،
  // صفحة الدخول، مسارات المصادقة، وapi/health.
  // manifest.json وsw*.js مهمّان بالذات: يُطلبان قبل أي كوكي جلسة (تسجيل
  // service worker يحدث بصرف النظر عن حالة الدخول)، فإن بقيا محميين
  // يُعاد توجيههما لـ/unlock ويفشل تحليل ناتج HTML كـJS/JSON.
  matcher: [
    '/((?!_next/static|_next/image|favicon|manifest\\.json|sw\\.js|swe-worker-.*\\.js|icons/|unlock|api/auth|api/health).*)',
  ],
};
