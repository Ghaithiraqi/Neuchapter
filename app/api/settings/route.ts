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
    const settings = await db.userSettings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });
    return NextResponse.json({ settings });
  } catch (err) {
    console.error('Settings GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (!authResult.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json() as {
      name?: string;
      timezone?: string;
      bedtimeHour?: number | null;
      reminderEnabled?: boolean;
      voiceEnabled?: boolean;
      crisisHotline?: string | null;
      profileSummary?: string | null;
    };

    const data: Record<string, unknown> = {};
    if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
    if (typeof body.timezone === 'string' && body.timezone.trim()) data.timezone = body.timezone.trim();
    if ('bedtimeHour' in body) data.bedtimeHour = body.bedtimeHour ?? null;
    if (typeof body.reminderEnabled === 'boolean') data.reminderEnabled = body.reminderEnabled;
    if (typeof body.voiceEnabled === 'boolean') data.voiceEnabled = body.voiceEnabled;
    if ('crisisHotline' in body) data.crisisHotline = typeof body.crisisHotline === 'string' ? body.crisisHotline.trim() || null : null;
    if (body.profileSummary !== undefined) data.profileSummary = body.profileSummary;

    const settings = await db.userSettings.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
    });

    return NextResponse.json({ settings, success: true });
  } catch (err) {
    console.error('Settings PUT error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
