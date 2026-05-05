import { NextResponse } from 'next/server';
export async function GET() {
  const hash = process.env.PASSCODE_HASH ?? 'UNDEFINED';
  return NextResponse.json({
    hash_first10: hash.substring(0, 10),
    hash_length: hash.length,
    starts_with_2b: hash.startsWith('$2b'),
  });
}
