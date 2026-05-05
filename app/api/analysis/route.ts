import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { ANALYSIS_SYSTEM_PROMPT } from '@/lib/prompts/analysis';
import { calculateCost } from '@/lib/utils';

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// ─── Types ────────────────────────────────────────────────────────────────────

interface Metrics {
  attendance: number;
  resilience: number;
  urgesTotal: number;
  sessions: number;
  moodAvg: number | null;
  journalCount: number;
}

type Trend = 'up' | 'down' | 'same';
type MoodTrend = Trend | 'none';

interface HourlySlot {
  hour: number;
  count: number;
  successCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekRange() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  weekAgo.setHours(0, 0, 0, 0);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);
  twoWeeksAgo.setHours(0, 0, 0, 0);
  const weekNumber = Math.ceil(
    (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 86400000)
  );
  return { now, weekAgo, twoWeeksAgo, weekNumber };
}

async function computeMetricsForRange(from: Date, to?: Date): Promise<Metrics> {
  const jWhere = to ? { createdAt: { gte: from, lt: to } } : { createdAt: { gte: from } };
  const uWhere = to ? { timestamp: { gte: from, lt: to } } : { timestamp: { gte: from } };

  const [urgesResisted, urgesTotal, sessions, journalEntries] = await Promise.all([
    db.urgeLog.count({ where: { ...uWhere, outcome: 'resisted' } }),
    db.urgeLog.count({ where: uWhere }),
    db.chatSession.count({ where: jWhere }),
    db.journalEntry.findMany({ where: jWhere, select: { createdAt: true, mood: true } }),
  ]);

  const moodEntries = journalEntries.filter((e) => e.mood != null);
  const moodAvg =
    moodEntries.length > 0
      ? Math.round(
          (moodEntries.reduce((s, e) => s + (e.mood ?? 0), 0) / moodEntries.length) * 10
        ) / 10
      : null;

  const activeDays = new Set(journalEntries.map((e) => e.createdAt.toISOString().split('T')[0]));
  const attendance = Math.min(activeDays.size, 7);

  return { attendance, resilience: urgesResisted, urgesTotal, sessions, moodAvg, journalCount: journalEntries.length };
}

function computeDeltas(current: Metrics, prev: Metrics) {
  const t = (d: number): Trend => (d > 0 ? 'up' : d < 0 ? 'down' : 'same');
  const moodDelta =
    current.moodAvg != null && prev.moodAvg != null
      ? Math.round((current.moodAvg - prev.moodAvg) * 10) / 10
      : null;

  return {
    deltas: {
      attendance: current.attendance - prev.attendance,
      resilience: current.resilience - prev.resilience,
      sessions: current.sessions - prev.sessions,
      mood: moodDelta,
    },
    trends: {
      attendance: t(current.attendance - prev.attendance),
      resilience: t(current.resilience - prev.resilience),
      sessions: t(current.sessions - prev.sessions),
      mood: (moodDelta != null ? t(moodDelta) : 'none') as MoodTrend,
    },
  };
}

async function computeMoodTimeline(now: Date) {
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const allEntries = await db.journalEntry.findMany({
    where: { createdAt: { gte: sevenDaysAgo }, mood: { not: null } },
    select: { createdAt: true, mood: true },
  });

  return Array.from({ length: 7 }, (_, i) => {
    const dayStart = new Date(now.getTime() - (6 - i) * 86400000);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 86400000);

    const dayEntries = allEntries.filter((e) => e.createdAt >= dayStart && e.createdAt < dayEnd);
    const mood =
      dayEntries.length > 0
        ? Math.round(
            (dayEntries.reduce((s, e) => s + (e.mood ?? 0), 0) / dayEntries.length) * 10
          ) / 10
        : null;

    return {
      date: dayStart.toISOString().split('T')[0],
      dayName: dayStart.toLocaleDateString('ar', { weekday: 'short' }),
      mood,
      count: dayEntries.length,
    };
  });
}

async function computeHourlyDistribution(weekAgo: Date): Promise<{ hourlyDistribution: HourlySlot[]; peakHour: HourlySlot }> {
  const urges = await db.urgeLog.findMany({
    where: { timestamp: { gte: weekAgo } },
    select: { timestamp: true, outcome: true },
  });

  const hourly: HourlySlot[] = Array.from({ length: 24 }, (_, hour) => {
    const hourUrges = urges.filter((u) => new Date(u.timestamp).getHours() === hour);
    return {
      hour,
      count: hourUrges.length,
      successCount: hourUrges.filter((u) => u.outcome === 'resisted').length,
    };
  });

  const peakHour = hourly.reduce((max, curr) => (curr.count > max.count ? curr : max));
  return { hourlyDistribution: hourly, peakHour };
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (!authResult.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { now, weekAgo, twoWeeksAgo, weekNumber } = getWeekRange();

    const [metrics, previousMetrics, moodTimeline, hourlyResult, latestAnalysis] =
      await Promise.all([
        computeMetricsForRange(weekAgo),
        computeMetricsForRange(twoWeeksAgo, weekAgo),
        computeMoodTimeline(now),
        computeHourlyDistribution(weekAgo),
        db.weeklyAnalysis.findFirst({ orderBy: { createdAt: 'desc' } }),
      ]);

    const { deltas, trends } = computeDeltas(metrics, previousMetrics);

    return NextResponse.json({
      metrics,
      previousMetrics,
      deltas,
      trends,
      moodTimeline,
      hourlyDistribution: hourlyResult.hourlyDistribution,
      peakHour: hourlyResult.peakHour,
      weekStart: weekAgo.toISOString(),
      weekEnd: now.toISOString(),
      weekNumber,
      patterns: latestAnalysis ? JSON.parse(latestAnalysis.patterns) : [],
      aiInsights: latestAnalysis?.aiInsights ?? null,
      hasAnalysis: !!latestAnalysis,
    });
  } catch (err) {
    console.error('Analysis GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (!authResult.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { now, weekAgo, twoWeeksAgo, weekNumber } = getWeekRange();

    const [metrics, previousMetrics, moodTimeline, hourlyResult] = await Promise.all([
      computeMetricsForRange(weekAgo),
      computeMetricsForRange(twoWeeksAgo, weekAgo),
      computeMoodTimeline(now),
      computeHourlyDistribution(weekAgo),
    ]);

    const { deltas, trends } = computeDeltas(metrics, previousMetrics);
    const livePayload = {
      metrics,
      previousMetrics,
      deltas,
      trends,
      moodTimeline,
      hourlyDistribution: hourlyResult.hourlyDistribution,
      peakHour: hourlyResult.peakHour,
      weekStart: weekAgo.toISOString(),
      weekEnd: now.toISOString(),
      weekNumber,
    };

    // ── 24h cache check ──
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentAnalysis = await db.weeklyAnalysis.findFirst({
      where: { createdAt: { gte: twentyFourHoursAgo } },
      orderBy: { createdAt: 'desc' },
    });

    if (recentAnalysis) {
      return NextResponse.json({
        ...livePayload,
        patterns: JSON.parse(recentAnalysis.patterns),
        aiInsights: recentAnalysis.aiInsights,
        hasAnalysis: true,
        cached: true,
      });
    }

    // ── Insufficient data → minimal encouraging pattern ──
    const hasSufficientData = metrics.journalCount >= 5 || metrics.urgesTotal >= 3;

    let patterns: object[];
    let summary: string;

    if (!hasSufficientData) {
      patterns = [
        {
          id: 1,
          type: 'success',
          tag: 'بداية · ٠١',
          confidence: 100,
          title: 'أنت بدأت الرحلة',
          explanation:
            'التسجيل الأول هو الأصعب. الاستمرار لأسبوع كامل يبني مساراً عصبياً جديداً.',
        },
      ];
      summary = 'البيانات لا تزال محدودة. استمر في التسجيل لرؤية أنماط أعمق.';
    } else {
      // ── Journals & urges for Claude context ──
      const [journals, urges] = await Promise.all([
        db.journalEntry.findMany({
          where: { createdAt: { gte: weekAgo } },
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true, content: true },
        }),
        db.urgeLog.findMany({
          where: { timestamp: { gte: weekAgo } },
          orderBy: { timestamp: 'asc' },
          select: { timestamp: true, intensity: true, trigger: true, outcome: true },
        }),
      ]);

      const moodTimelineStr = moodTimeline
        .map((d) => `${d.dayName}: ${d.mood ?? 'لا بيانات'}`)
        .join('، ');

      const journalLines = journals.length
        ? journals
            .map((j) => `- ${new Date(j.createdAt).toLocaleDateString('ar')}: ${j.content.substring(0, 200)}`)
            .join('\n')
        : 'لا توجد مذكرات';

      const urgeLines = urges.length
        ? urges
            .map(
              (u) =>
                `- ${new Date(u.timestamp).toLocaleString('ar')}: شدة ${u.intensity}/10، المحفز: ${u.trigger ?? 'غير محدد'}، النتيجة: ${u.outcome}`
            )
            .join('\n')
        : 'لا توجد لحظات صعبة';

      const dataContext = `المقاييس المحسوبة (آخر ٧ أيام):
- الحضور: ${metrics.attendance}/7 (الأسبوع السابق: ${previousMetrics.attendance}/7)
- لحظات صعبة تجاوزتها: ${metrics.resilience}/${metrics.urgesTotal}
- جلسات المحادثة: ${metrics.sessions}
- متوسط المزاج: ${metrics.moodAvg != null ? `${metrics.moodAvg}/7` : 'لا بيانات'}
- عدد المذكرات: ${metrics.journalCount}
- ساعة ذروة اللحظات الصعبة: ${hourlyResult.peakHour.count > 0 ? `${hourlyResult.peakHour.hour}:00` : 'لا يوجد نمط واضح'}
- تطور المزاج: ${moodTimelineStr}

المذكرات (${journals.length} إدخال):
${journalLines}

اللحظات الصعبة (${urges.length} تسجيل):
${urgeLines}`;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: ANALYSIS_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: dataContext }],
      });

      const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}';
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      patterns = parsed.patterns ?? [];
      summary = parsed.summary ?? '';

      await db.usageLog.create({
        data: {
          model: 'claude-sonnet-4-6',
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          estimatedCost: calculateCost('claude-sonnet-4-6', response.usage),
        },
      });
    }

    // ── Save to DB ──
    await db.weeklyAnalysis.upsert({
      where: { weekStart: weekAgo },
      create: {
        weekStart: weekAgo,
        weekEnd: now,
        weekNumber,
        metrics: JSON.stringify(metrics),
        patterns: JSON.stringify(patterns),
        findings: JSON.stringify(patterns),
        aiInsights: summary,
      },
      update: {
        weekEnd: now,
        metrics: JSON.stringify(metrics),
        patterns: JSON.stringify(patterns),
        findings: JSON.stringify(patterns),
        aiInsights: summary,
      },
    });

    return NextResponse.json({
      ...livePayload,
      patterns,
      aiInsights: summary,
      hasAnalysis: true,
      cached: false,
    });
  } catch (err) {
    console.error('Analysis POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
