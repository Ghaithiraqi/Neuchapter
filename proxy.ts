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
  // يستثني: ملفات _next الثابتة، الصور، favicon، صفحة الدخول، مسارات المصادقة، وapi/health
  matcher: ['/((?!_next/static|_next/image|favicon|unlock|api/auth|api/health).*)'],
};
