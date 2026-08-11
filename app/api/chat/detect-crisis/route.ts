export const dynamic = 'force-dynamic';

import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { toEnglishNumerals } from '@/lib/utils';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

interface CrisisResult {
  level: 'low' | 'medium' | 'high';
  reason: string;
}

/**
 * محاولة تصنيف واحدة — ترمي عند أي فشل (طلب فاشل، رد بلا JSON، مستوى غير صالح)
 * بدل ابتلاع الخطأ، لتتيح لطبقة الاستدعاء إعادة المحاولة.
 */
async function classifyOnce(text: string): Promise<CrisisResult> {
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
  if (!match) throw new Error('crisis classification: no JSON in model response');

  const parsed = JSON.parse(match[0]) as { level: string; reason: string };
  if (!['low', 'medium', 'high'].includes(parsed.level)) {
    throw new Error(`crisis classification: invalid level "${parsed.level}"`);
  }

  return {
    level: parsed.level as CrisisResult['level'],
    reason: toEnglishNumerals(parsed.reason ?? ''),
  };
}

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (!authResult.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let text: string | undefined;
  try {
    ({ text } = await req.json() as { text?: string });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  if (!text) return NextResponse.json({ level: 'low', reason: '' });

  try {
    return NextResponse.json(await classifyOnce(text));
  } catch (err) {
    console.error('Crisis detect error (attempt 1 of 2):', err);
    try {
      return NextResponse.json(await classifyOnce(text));
    } catch (err2) {
      // كلا المحاولتين فشلتا — لا نعرف مستوى الخطر الفعلي، فلا يصح أن نفترض
      // "منخفض" بصمت كما كان سابقًا. 'unknown' تجعل الواجهة تعرض صف الدعم
      // البشري الهادئ بدل إخفاء أي إشارة أمان بسبب عطل بنيوي.
      console.error('Crisis detect error (attempt 2 of 2, giving up):', err2);
      return NextResponse.json({ level: 'unknown', reason: '' });
    }
  }
}
