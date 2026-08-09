export const dynamic = 'force-dynamic';

import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// تُستدعى بعد إرسال الاستجابة — الفشل لا يؤثر على المذكرة المحفوظة
async function generateAndSaveSummary(entryId: number, content: string): Promise<void> {
  try {
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `اقرأ هذه المذكرة وأرجع JSON فقط بالصيغة التالية:
{"summary":"ملخص سطر واحد بالعربية (١٠-٢٠ كلمة)","themes":["كلمة١","كلمة٢","كلمة٣"]}

القواعد:
- الملخص: جملة واحدة تلتقط الجوهر العاطفي أو الفكري الرئيسي
- الـ themes: 2-4 كلمات مفتاحية (مشاعر/مواضيع مثل: "قلق"، "تقدم"، "علاقات")
- أرجع JSON صالح فقط، بلا نص خارجه

المذكرة:
${content.slice(0, 1500)}`,
        },
      ],
    });

    const text = res.content[0].type === 'text' ? res.content[0].text : '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return;

    const parsed = JSON.parse(match[0]) as { summary?: string; themes?: string[] };
    const aiSummary = typeof parsed.summary === 'string' ? parsed.summary.trim() : null;
    const aiThemes =
      Array.isArray(parsed.themes) && parsed.themes.length > 0
        ? JSON.stringify(parsed.themes.slice(0, 4))
        : null;

    if (aiSummary || aiThemes) {
      await db.journalEntry.update({
        where: { id: entryId },
        data: { aiSummary, aiThemes },
      });
    }
  } catch (err) {
    // الفشل صامت — المذكرة محفوظة بالفعل
    console.error(`Journal summary error (entry ${entryId}):`, err);
  }
}

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (!authResult.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { content, type, mood, energy } = await req.json();

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
    }

    const entry = await db.journalEntry.create({
      data: {
        content,
        type: type ?? 'text',
        mood: mood ?? null,
        energy: energy ?? null,
        wordCount: content.split(/\s+/).filter(Boolean).length,
      },
    });

    // توليد الملخص بعد إرسال الاستجابة — لا يُبطئها
    // after() مضمون في Next.js 16: يُكمل حتى لو أُغلق الاتصال
    if (content.trim().length >= 20) {
      after(() => generateAndSaveSummary(entry.id, content));
    }

    return NextResponse.json({ id: entry.id, success: true });
  } catch (err) {
    console.error('Journal error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (!authResult.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') ?? '20');
    const offset = parseInt(searchParams.get('offset') ?? '0');

    const [entries, total] = await Promise.all([
      db.journalEntry.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.journalEntry.count(),
    ]);

    return NextResponse.json({ entries, total });
  } catch (err) {
    console.error('Journal GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
