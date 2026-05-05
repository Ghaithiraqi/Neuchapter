import { jwtVerify } from 'jose';
import { NextRequest } from 'next/server';

export async function verifyAuth(req: NextRequest): Promise<{ valid: boolean }> {
  const token = req.cookies.get('session')?.value;

  if (!token) return { valid: false };

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    await jwtVerify(token, secret);
    return { valid: true };
  } catch {
    return { valid: false };
  }
}
