import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

export async function POST(req: NextRequest) {
  try {
    const { passcode } = await req.json();

    if (!passcode || typeof passcode !== 'string') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const valid = await bcrypt.compare(passcode, process.env.PASSCODE_HASH!);

    if (!valid) {
      return NextResponse.json({ error: 'Invalid' }, { status: 401 });
    }

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
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
