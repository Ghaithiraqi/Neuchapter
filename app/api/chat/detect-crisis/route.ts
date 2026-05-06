export const dynamic = 'force-dynamic';

import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (!authResult.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { text } = await req.json() as { text?: string };
    if (!text) return NextResponse.json({ level: 'low', reason: '' });

    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 80,
      messages: [
        {
          role: 'user',
          content: `هل هذه الرسالة تحتوي على إشارات لخطر فوري؟ (أفكار إيذاء النفس، أزمة نفسية حادة، يأس شديد)
رسالة المستخدم: "${text.slice(0, 500)}"
أرجع JSON فقط: {"level":"low"|"medium"|"high","reason":"سبب قصير"}`,
        },
      ],
    });

    const content = res.content[0].type === 'text' ? res.content[0].text : '';
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ level: 'low', reason: '' });

    const parsed = JSON.parse(match[0]) as { level: string; reason: string };
    return NextResponse.json({
      level: ['low', 'medium', 'high'].includes(parsed.level) ? parsed.level : 'low',
      reason: parsed.reason ?? '',
    });
  } catch (err) {
    console.error('Crisis detect error:', err);
    return NextResponse.json({ level: 'low', reason: '' });
  }
}
