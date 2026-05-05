import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { ANALYSIS_SYSTEM_PROMPT } from '@/lib/prompts/analysis';
import { calculateCost } from '@/lib/utils';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (!authResult.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const latest = await db.weeklyAnalysis.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!latest) {
      return NextResponse.json({ analysis: null });
    }

    return NextResponse.json({
      analysis: {
        ...latest,
        metrics: JSON.parse(latest.metrics),
        patterns: JSON.parse(latest.patterns),
        findings: JSON.parse(latest.findings),
      },
    });
  } catch (err) {
    console.error('Analysis GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (!authResult.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    const [journals, urges] = await Promise.all([
      db.journalEntry.findMany({
        where: { createdAt: { gte: weekStart } },
        orderBy: { createdAt: 'asc' },
      }),
      db.urgeLog.findMany({
        where: { createdAt: { gte: weekStart } },
        orderBy: { timestamp: 'asc' },
      }),
    ]);

    const dataContext = `
بيانات الأسبوع (${weekStart.toLocaleDateString('ar')} - ${now.toLocaleDateString('ar')}):

المذكرات (${journals.length} إدخال):
${journals.map((j: { createdAt: Date; content: string }) => `- ${new Date(j.createdAt).toLocaleDateString('ar')}: ${j.content.substring(0, 200)}...`).join('\n')}

اللحظات الصعبة (${urges.length} تسجيل):
${urges.map((u: { timestamp: Date; intensity: number; trigger: string | null; outcome: string }) => `- ${new Date(u.timestamp).toLocaleString('ar')}: شدة ${u.intensity}/10، المحفز: ${u.trigger ?? 'غير محدد'}، النتيجة: ${u.outcome}`).join('\n')}
    `;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: ANALYSIS_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: dataContext }],
    });

    const rawText =
      response.content[0].type === 'text' ? response.content[0].text : '{}';

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    const weekNumber = Math.ceil(
      (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)
    );

    const analysis = await db.weeklyAnalysis.upsert({
      where: { weekStart },
      create: {
        weekStart,
        weekEnd: now,
        weekNumber,
        metrics: JSON.stringify(parsed.metrics ?? {}),
        patterns: JSON.stringify(parsed.patterns ?? []),
        findings: JSON.stringify(parsed.patterns ?? []),
        aiInsights: parsed.summary ?? '',
      },
      update: {
        metrics: JSON.stringify(parsed.metrics ?? {}),
        patterns: JSON.stringify(parsed.patterns ?? []),
        findings: JSON.stringify(parsed.patterns ?? []),
        aiInsights: parsed.summary ?? '',
      },
    });

    await db.usageLog.create({
      data: {
        model: 'claude-sonnet-4-6',
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        estimatedCost: calculateCost('claude-sonnet-4-6', response.usage),
      },
    });

    return NextResponse.json({ analysis, parsed });
  } catch (err) {
    console.error('Analysis POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
