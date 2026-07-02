export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

const DEFAULT_PLAN = {
  contacts: [],
  actions: [],
  reminders: [],
  groundingItems: [],
};

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (!authResult.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const plan = await db.emergencyPlan.findFirst({ orderBy: { createdAt: 'asc' } });

    if (!plan) {
      return NextResponse.json({ plan: DEFAULT_PLAN, exists: false });
    }

    return NextResponse.json({
      plan: {
        id: plan.id,
        contacts: JSON.parse(plan.contacts),
        actions: JSON.parse(plan.actions),
        reminders: JSON.parse(plan.reminders),
        groundingItems: plan.groundingItems ? JSON.parse(plan.groundingItems) : [],
        updatedAt: plan.updatedAt,
        createdAt: plan.createdAt,
      },
      exists: true,
    });
  } catch (err) {
    console.error('EmergencyPlan GET error:', err);
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
      contacts?: unknown[];
      actions?: unknown[];
      reminders?: unknown[];
      groundingItems?: unknown[];
    };

    const contacts = JSON.stringify(Array.isArray(body.contacts) ? body.contacts : []);
    const actions = JSON.stringify(Array.isArray(body.actions) ? body.actions : []);
    const reminders = JSON.stringify(Array.isArray(body.reminders) ? body.reminders : []);
    const groundingItems = JSON.stringify(Array.isArray(body.groundingItems) ? body.groundingItems : []);

    const existing = await db.emergencyPlan.findFirst({ orderBy: { createdAt: 'asc' } });

    const plan = existing
      ? await db.emergencyPlan.update({
          where: { id: existing.id },
          data: { contacts, actions, reminders, groundingItems },
        })
      : await db.emergencyPlan.create({
          data: { contacts, actions, reminders, groundingItems },
        });

    return NextResponse.json({
      plan: {
        id: plan.id,
        contacts: JSON.parse(plan.contacts),
        actions: JSON.parse(plan.actions),
        reminders: JSON.parse(plan.reminders),
        groundingItems: plan.groundingItems ? JSON.parse(plan.groundingItems) : [],
        updatedAt: plan.updatedAt,
        createdAt: plan.createdAt,
      },
      success: true,
    });
  } catch (err) {
    console.error('EmergencyPlan PUT error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
