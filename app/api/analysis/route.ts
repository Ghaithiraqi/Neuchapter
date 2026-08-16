import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { ANALYSIS_SYSTEM_PROMPT } from '@/lib/prompts/analysis';
import { calculateCost, toEnglishNumerals } from '@/lib/utils';

interface RawPattern {
  id?: number; type?: string; tag?: string; confidence?: number;
  title?: string; explanation?: string; recommendation?: string;
}

/** يضمن أن كل نص يأتي من كلود يستخدم أرقاماً إنجليزية، بصرف النظر عمّا يولّده النموذج. */
function normalizePattern(p: RawPattern) {
  return {
    ...p,
    tag: typeof p.tag === 'string' ? toEnglishNumerals(p.tag) : p.tag,
    title: typeof p.title === 'string' ? toEnglishNumerals(p.title) : p.title,
    explanation: typeof p.explanation === 'string' ? toEnglishNumerals(p.explanation) : p.explanation,
    recommendation: typeof p.recommendation === 'string' ? toEnglishNumerals(p.recommendation) : p.recommendation,
  };
}

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

interface IntensityDay {
  date: string;
  dayName: string;
  intensity: number | null; // 1-10 average, unlike moodTimeline's 1-7 scale
  count: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the Monday of the current ISO week at UTC midnight.
 * Produces the SAME Date value for every day within the same week —
 * safe to use as a Prisma upsert key for @@unique([weekStart]).
 */
function getStableWeekStart(): Date {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon, …, 6=Sat
  const daysSinceMonday = (dayOfWeek + 6) % 7; // Mon→0, Tue→1, …, Sun→6
  const monday = new Date(now);
  monday.setUTCHours(0, 0, 0, 0);
  monday.setUTCDate(now.getUTCDate() - daysSinceMonday);
  return monday;
}

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

async function computeIntensityTimeline(now: Date): Promise<IntensityDay[]> {
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const allUrges = await db.urgeLog.findMany({
    where: { timestamp: { gte: sevenDaysAgo } },
    select: { timestamp: true, intensity: true },
  });

  return Array.from({ length: 7 }, (_, i) => {
    const dayStart = new Date(now.getTime() - (6 - i) * 86400000);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 86400000);

    const dayUrges = allUrges.filter((u) => u.timestamp >= dayStart && u.timestamp < dayEnd);
    const intensity =
      dayUrges.length > 0
        ? Math.round((dayUrges.reduce((s, u) => s + u.intensity, 0) / dayUrges.length) * 10) / 10
        : null;

    return {
      date: dayStart.toISOString().split('T')[0],
      dayName: dayStart.toLocaleDateString('ar', { weekday: 'short' }),
      intensity,
      count: dayUrges.length,
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

    const currentWeekStart = getStableWeekStart();

    const [metrics, previousMetrics, moodTimeline, intensityTimeline, hourlyResult, latestAnalysis] =
      await Promise.all([
        computeMetricsForRange(weekAgo),
        computeMetricsForRange(twoWeeksAgo, weekAgo),
        computeMoodTimeline(now),
        computeIntensityTimeline(now),
        computeHourlyDistribution(weekAgo),
        db.weeklyAnalysis.findUnique({ where: { weekStart: currentWeekStart } }),
      ]);

    const { deltas, trends } = computeDeltas(metrics, previousMetrics);

    return NextResponse.json({
      metrics,
      previousMetrics,
      deltas,
      trends,
      moodTimeline,
      intensityTimeline,
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

    const stableWeekStart = getStableWeekStart();

    const [metrics, previousMetrics, moodTimeline, intensityTimeline, hourlyResult] = await Promise.all([
      computeMetricsForRange(weekAgo),
      computeMetricsForRange(twoWeeksAgo, weekAgo),
      computeMoodTimeline(now),
      computeIntensityTimeline(now),
      computeHourlyDistribution(weekAgo),
    ]);

    const { deltas, trends } = computeDeltas(metrics, previousMetrics);
    const livePayload = {
      metrics,
      previousMetrics,
      deltas,
      trends,
      moodTimeline,
      intensityTimeline,
      hourlyDistribution: hourlyResult.hourlyDistribution,
      peakHour: hourlyResult.peakHour,
      weekStart: weekAgo.toISOString(),
      weekEnd: now.toISOString(),
      weekNumber,
    };

    // ── 24h cache check: look up this week's row specifically ──
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentAnalysis = await db.weeklyAnalysis.findUnique({
      where: { weekStart: stableWeekStart },
    });

    if (recentAnalysis && recentAnalysis.createdAt >= twentyFourHoursAgo) {
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
          tag: 'بداية · 01',
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
      patterns = ((parsed.patterns ?? []) as RawPattern[]).map(normalizePattern);
      summary = toEnglishNumerals(parsed.summary ?? '');

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
      where: { weekStart: stableWeekStart },
      create: {
        weekStart: stableWeekStart,
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
    const message = err instanceof Error ? err.message : 'خطأ غير متوقع في الخادم';
    return NextResponse.json({ error: 'فشل توليد التقرير', detail: message }, { status: 500 });
  }
}
