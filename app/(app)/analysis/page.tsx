'use client';

import { useEffect, useState } from 'react';
import { toEnglishNumerals } from '@/lib/utils';
import { getCurrentMilestone, getNextMilestone, getDaysToNextMilestone } from '@/lib/milestones';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Metrics {
  attendance: number;
  resilience: number;
  urgesTotal: number;
  sessions: number;
  moodAvg: number | null;
  journalCount: number;
}

type Trend = 'up' | 'down' | 'same' | 'none';

interface MoodDay {
  date: string;
  dayName: string;
  mood: number | null;
  count: number;
}

interface HourlySlot {
  hour: number;
  count: number;
  successCount: number;
}

interface Pattern {
  id: number;
  type: string;
  tag: string;
  confidence: number;
  title: string;
  explanation: string;
  recommendation?: string;
}

interface AnalysisData {
  metrics: Metrics;
  previousMetrics: Metrics;
  deltas: { attendance: number; resilience: number; sessions: number; mood: number | null };
  trends: { attendance: Trend; resilience: Trend; sessions: Trend; mood: Trend };
  moodTimeline: MoodDay[];
  hourlyDistribution: HourlySlot[];
  peakHour: HourlySlot;
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  patterns: Pattern[];
  aiInsights: string | null;
  hasAnalysis: boolean;
}

interface StreakStats {
  longestStreak: number;
  avgStreak: number;
  totalCleanDays: number;
  days: number;
}

interface UrgeLog {
  id: number;
  timestamp: string;
  intensity: number;
  trigger: string | null;
  outcome: string;
  context: string | null;
  duration: number | null;
}

type UrgeOutcomeFilter = 'all' | 'resisted' | 'relapsed' | 'distracted';

// ─── Design tokens (local) ────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,.03)',
  border: '1px solid rgba(255,255,255,.07)',
  borderRadius: 22,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function moodDotStyle(mood: number | null): { background: string; boxShadow: string } {
  if (mood === null) return { background: 'rgba(255,255,255,.10)', boxShadow: 'none' };
  if (mood >= 7) return { background: '#5DCDA5', boxShadow: '0 0 10px rgba(93,205,165,.6)' };
  if (mood >= 6) return { background: '#2EBE80', boxShadow: '0 0 10px rgba(46,190,128,.5)' };
  if (mood >= 5) return { background: '#376EC8', boxShadow: '0 0 10px rgba(55,110,200,.5)' };
  if (mood >= 4) return { background: '#259696', boxShadow: '0 0 10px rgba(37,150,150,.5)' };
  if (mood >= 3) return { background: '#4A3CB4', boxShadow: '0 0 10px rgba(74,60,180,.5)' };
  return { background: '#D85A30', boxShadow: '0 0 10px rgba(216,90,48,.4)' };
}

function barGradient(mood: number | null): string {
  if (mood === null) return 'rgba(255,255,255,.08)';
  if (mood >= 6) return 'linear-gradient(180deg,#2EBE80,#5DCDA5)';
  if (mood >= 4) return 'linear-gradient(180deg,#376EC8,#259696)';
  return 'linear-gradient(180deg,#4A3CB4,#376EC8)';
}

// For the period bar chart (hourly distribution → 4 periods)
const PERIOD_GRADIENTS = [
  'linear-gradient(180deg,#4A3CB4,#376EC8)', // ليل  — purple
  'linear-gradient(180deg,#376EC8,#259696)', // صباح — blue
  'linear-gradient(180deg,#259696,#2EBE80)', // ظهر  — teal
  'linear-gradient(180deg,#2EBE80,#5DCDA5)', // مساء — mint
];

const attendanceColor = (n: number) =>
  n >= 5 ? '#2EBE80' : n >= 3 ? '#5DCDA5' : '#D85A30';

const moodColor = (n: number | null) => {
  if (n == null) return 'var(--text-muted)';
  return n >= 5 ? '#2EBE80' : n >= 3 ? '#5DCDA5' : '#D85A30';
};

// ─── Insight card accents ─────────────────────────────────────────────────────

const INSIGHT_ACCENTS = [
  { bg: 'rgba(46,190,128,.06)',  border: 'rgba(46,190,128,.18)',  iconBg: 'rgba(46,190,128,.15)',  iconColor: '#2EBE80' },
  { bg: 'rgba(55,110,200,.06)',  border: 'rgba(55,110,200,.18)',  iconBg: 'rgba(55,110,200,.15)',  iconColor: '#6E9BE8' },
  { bg: 'rgba(93,205,165,.06)',  border: 'rgba(93,205,165,.18)',  iconBg: 'rgba(93,205,165,.15)',  iconColor: '#5DCDA5' },
] as const;

function InsightIcon({ index }: { index: number }) {
  if (index % 3 === 0) return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M6 6l1.5 1.5M16.5 16.5L18 18M18 6l-1.5 1.5M7.5 16.5L6 18" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="3.5"/>
    </svg>
  );
  if (index % 3 === 1) return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 4l2.2 4.8 5.3.5-4 3.5 1.2 5.2L12 15.8 7.3 18.5 8.5 13.3l-4-3.5 5.3-.5z" strokeLinejoin="round"/>
    </svg>
  );
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 12l5 5L20 6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── Trend badge ──────────────────────────────────────────────────────────────

function TrendBadge({ trend, delta }: { trend: Trend; delta: number | null }) {
  if (trend === 'none' || delta === null) return null;
  if (trend === 'same') return <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 4 }}>—</span>;
  const isUp = trend === 'up';
  const color = isUp ? '#2EBE80' : '#D85A30';
  return (
    <span style={{ fontSize: 11, color, marginRight: 4 }}>
      {isUp ? '↑' : '↓'} {Math.abs(delta)}
    </span>
  );
}

// ─── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({ label, value, suffix, color, trend, delta }: {
  label: string; value: string | number; suffix?: string;
  color: string; trend: Trend; delta: number | null;
}) {
  return (
    <div style={{ ...CARD, padding: '16px 18px' }}>
      <div style={{ fontSize: 11, color: '#6B7A8C', marginBottom: 10 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color, fontWeight: 700, lineHeight: 1 }}>
            {typeof value === 'number' ? toEnglishNumerals(value) : value}
          </div>
          {suffix && <div style={{ fontSize: 14, color: '#6B7A8C' }}>{suffix}</div>}
        </div>
        <TrendBadge trend={trend} delta={delta} />
      </div>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, suffix, icon }: { label: string; value: number; suffix?: string; icon: string }) {
  return (
    <div style={{ ...CARD, padding: '16px 14px', textAlign: 'center' }}>
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: '#2EBE80', fontWeight: 700, lineHeight: 1 }}>
        {toEnglishNumerals(value)}
        {suffix && <span style={{ fontSize: 14, color: '#6B7A8C', fontWeight: 400 }}>{suffix}</span>}
      </div>
      <div style={{ fontSize: 11, color: '#6B7A8C', marginTop: 6 }}>{label}</div>
    </div>
  );
}

// ─── Intensity dots ───────────────────────────────────────────────────────────

function IntensityDots({ value }: { value: number }) {
  const filled = Math.round(value / 2);
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          style={{
            width: 7, height: 7, borderRadius: '50%',
            background: i < filled
              ? filled >= 4 ? '#D85A30' : filled >= 3 ? '#2EBE80' : '#5DCDA5'
              : 'rgba(255,255,255,.12)',
          }}
        />
      ))}
    </div>
  );
}

// ─── Outcome meta ─────────────────────────────────────────────────────────────

const OUTCOME_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  resisted:   { label: 'قاومت',  color: '#2EBE80', bg: 'rgba(46,190,128,.10)',  border: 'rgba(46,190,128,.3)' },
  relapsed:   { label: 'انتكست', color: '#D85A30', bg: 'rgba(216,90,48,.10)',   border: 'rgba(216,90,48,.3)' },
  distracted: { label: 'تشتّتت', color: '#6B7A8C', bg: 'rgba(107,128,128,.08)', border: 'rgba(107,128,128,.2)' },
};

const TRIGGER_AR: Record<string, string> = {
  stress:       'ضغط نفسي',
  boredom:      'ملل',
  loneliness:   'وحدة',
  late_night:   'سهر ليلي',
  social_media: 'تواصل اجتماعي',
  other:        'أخرى',
};

const FILTER_TABS: { key: UrgeOutcomeFilter; label: string }[] = [
  { key: 'all',        label: 'الكل' },
  { key: 'resisted',   label: 'قاومت' },
  { key: 'relapsed',   label: 'انتكست' },
  { key: 'distracted', label: 'تشتّتت' },
];

// ─── Urge log section ─────────────────────────────────────────────────────────

function UrgeLogSection({ logs, total, filter, loading, onFilterChange }: {
  logs: UrgeLog[]; total: number; filter: UrgeOutcomeFilter;
  loading: boolean; onFilterChange: (f: UrgeOutcomeFilter) => void;
}) {
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return {
      date: toEnglishNumerals(d.toLocaleDateString('ar-IQ', { month: 'short', day: 'numeric' })),
      time: toEnglishNumerals(d.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit', hour12: true })),
    };
  };

  return (
    <div style={{ ...CARD, padding: '18px 18px 8px', marginBottom: 14 }}>
      {/* عنوان + عداد */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: '#EAF2EE' }}>سجل اللحظات</div>
        {total > 0 && (
          <div
            style={{
              fontSize: 11, color: '#6B7A8C',
              background: 'rgba(255,255,255,.04)',
              border: '1px solid rgba(255,255,255,.09)',
              borderRadius: 20, padding: '3px 10px',
            }}
          >
            {toEnglishNumerals(total)} إجمالاً
          </div>
        )}
      </div>

      {/* أزرار الفلترة */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {FILTER_TABS.map((tab) => {
          const isActive = filter === tab.key;
          const meta = tab.key !== 'all' ? OUTCOME_META[tab.key] : null;
          return (
            <button
              key={tab.key}
              onClick={() => onFilterChange(tab.key)}
              style={{
                padding: '5px 14px', borderRadius: 20,
                border: isActive
                  ? `1px solid ${meta?.border ?? 'rgba(93,205,165,.35)'}`
                  : '1px solid rgba(255,255,255,.09)',
                background: isActive
                  ? (meta?.bg ?? 'rgba(93,205,165,.10)')
                  : 'transparent',
                color: isActive
                  ? (meta?.color ?? '#5DCDA5')
                  : '#6B7A8C',
                fontSize: 12,
                fontWeight: isActive ? 700 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'var(--font-body)',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* المحتوى */}
      {loading ? (
        <div style={{ padding: '24px 0', display: 'flex', gap: 4, justifyContent: 'center' }}>
          {[0, 0.15, 0.3].map((d, i) => (
            <div
              key={i}
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#5DCDA5',
                animation: `blink 1.2s ease-in-out ${d}s infinite`,
              }}
            />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div style={{ padding: '28px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🌿</div>
          <div style={{ fontSize: 14, color: '#EAF2EE', marginBottom: 6 }}>
            {filter === 'all' ? 'لا توجد لحظات مسجّلة بعد' : `لا توجد سجلات "${OUTCOME_META[filter]?.label ?? filter}"`}
          </div>
          <div style={{ fontSize: 12, color: '#6B7A8C', lineHeight: 1.7 }}>
            سجّل اللحظات الصعبة من شاشة الـ SOS
          </div>
        </div>
      ) : (
        <div>
          {logs.map((log, idx) => {
            const { date, time } = formatTime(log.timestamp);
            const meta = OUTCOME_META[log.outcome] ?? OUTCOME_META.distracted;
            const triggerLabel = log.trigger ? (TRIGGER_AR[log.trigger] ?? log.trigger) : null;
            const isLast = idx === logs.length - 1;
            return (
              <div
                key={log.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '13px 0',
                  borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,.06)',
                }}
              >
                <div style={{ flexShrink: 0, minWidth: 52, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#6B7A8C', lineHeight: 1.4 }}>{date}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#A8B8C4', direction: 'ltr' }}>{time}</div>
                </div>
                <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,.07)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                    <IntensityDots value={log.intensity} />
                    <span style={{ fontSize: 10, color: '#6B7A8C' }}>{toEnglishNumerals(log.intensity)}/10</span>
                  </div>
                  {triggerLabel && (
                    <div style={{ fontSize: 12, color: '#A8B8C4', marginBottom: 4 }}>{triggerLabel}</div>
                  )}
                </div>
                <div
                  style={{
                    flexShrink: 0, padding: '4px 10px', borderRadius: 20,
                    background: meta.bg, border: `1px solid ${meta.border}`,
                    color: meta.color, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                  }}
                >
                  {meta.label}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalysisPage() {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [streakStats, setStreakStats] = useState<StreakStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [urgeLogs, setUrgeLogs] = useState<UrgeLog[]>([]);
  const [urgeTotal, setUrgeTotal] = useState(0);
  const [urgeFilter, setUrgeFilter] = useState<UrgeOutcomeFilter>('all');
  const [urgeLoading, setUrgeLoading] = useState(true);

  const fetchUrges = (outcome: UrgeOutcomeFilter) => {
    setUrgeLoading(true);
    const params = new URLSearchParams({ limit: '20' });
    if (outcome !== 'all') params.set('outcome', outcome);
    fetch(`/api/urge?${params}`)
      .then((r) => r.json())
      .then((d: { logs?: UrgeLog[]; total?: number }) => {
        setUrgeLogs(d.logs ?? []);
        setUrgeTotal(d.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setUrgeLoading(false));
  };

  const handleUrgeFilterChange = (f: UrgeOutcomeFilter) => {
    setUrgeFilter(f);
    fetchUrges(f);
  };

  useEffect(() => {
    Promise.all([
      fetch('/api/analysis').then((r) => r.json()),
      fetch('/api/streak', { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([analysis, streak]) => {
        if (analysis.metrics) setData(analysis);
        if (streak.stats) setStreakStats({ ...streak.stats, days: streak.days ?? 0 });
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetchUrges('all');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateAnalysis = async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch('/api/analysis', { method: 'POST' });
      const d = await res.json();
      if (!res.ok) {
        setGenerateError(d.error ?? 'فشل توليد التقرير — حاول مجدداً');
        return;
      }
      if (d.metrics) setData(d);
    } catch {
      setGenerateError('تعذّر الاتصال بالخادم — تحقق من الشبكة وحاول مجدداً');
    } finally {
      setGenerating(false);
    }
  };

  // Period data for urge bar chart (4 periods from hourly distribution)
  const periodData = data?.hourlyDistribution
    ? [
        { name: 'ليل',  count: data.hourlyDistribution.slice(0, 6).reduce((s, h) => s + h.count, 0) },
        { name: 'صباح', count: data.hourlyDistribution.slice(6, 12).reduce((s, h) => s + h.count, 0) },
        { name: 'ظهر',  count: data.hourlyDistribution.slice(12, 18).reduce((s, h) => s + h.count, 0) },
        { name: 'مساء', count: data.hourlyDistribution.slice(18, 24).reduce((s, h) => s + h.count, 0) },
      ]
    : [];

  const totalUrges = data?.metrics.urgesTotal ?? 0;
  const peakPeriodCount = periodData.length ? Math.max(...periodData.map((p) => p.count)) : 0;
  const peakPeriod = periodData.find((p) => p.count === peakPeriodCount && p.count > 0);

  const currentDays = streakStats?.days ?? 0;
  const currentMilestone = getCurrentMilestone(currentDays);
  const nextMilestoneData = getNextMilestone(currentDays);
  const daysToNext = getDaysToNextMilestone(currentDays);
  const nextProgress = nextMilestoneData
    ? Math.round(((currentDays - (currentMilestone?.days ?? 0)) / (nextMilestoneData.days - (currentMilestone?.days ?? 0))) * 100)
    : 100;

  const moodTimeline = data?.moodTimeline ?? [];

  // Mood delta % for badge
  const moodDeltaPct = (() => {
    if (!data) return null;
    const cur = data.metrics.moodAvg;
    const prev = data.previousMetrics?.moodAvg;
    if (cur == null || prev == null || prev === 0) return null;
    return Math.round(((cur - prev) / prev) * 100);
  })();

  return (
    <div dir="rtl" style={{ padding: '20px 20px 0', fontFamily: 'var(--font-body)' }}>

      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: '0 0 3px', fontWeight: 700, fontSize: 21, color: '#EAF2EE' }}>
          تحليلك الأسبوعي
        </h1>
        <p style={{ margin: 0, fontWeight: 300, fontSize: 13.5, color: '#9CA6BD' }}>
          {data?.weekStart
            ? `${toEnglishNumerals(new Date(data.weekStart).toLocaleDateString('ar-IQ'))} — ${toEnglishNumerals(new Date(data.weekEnd).toLocaleDateString('ar-IQ'))}`
            : '7 أيام · من لحظاتك ومذكراتك المسجّلة'}
        </p>
      </div>

      {/* ─── Skeleton ───────────────────────────────────────────────────────── */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {([
            { h: 172, r: 22, d: 0 },
            { h: 96,  r: 22, d: 0.2 },
            { h: 70,  r: 18, d: 0.35 },
            { h: 70,  r: 18, d: 0.5 },
          ] as const).map((s, i) => (
            <div
              key={i}
              style={{
                height: s.h, borderRadius: s.r,
                background: 'rgba(255,255,255,.04)',
                animation: `ncSkel 1.9s ease-in-out ${s.d}s infinite`,
              }}
            />
          ))}
        </div>
      )}

      {!loading && (
        <>
          {/* ─── شدّة الرغبات عبر الأسبوع ─────────────────────────────────── */}
          {moodTimeline.length > 0 && (
            <div style={{ ...CARD, padding: '20px 20px 16px', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <span style={{ fontWeight: 500, fontSize: 15, color: '#EAF2EE' }}>شدّة الرغبات عبر الأسبوع</span>
                {moodDeltaPct !== null && (
                  <span
                    style={{
                      fontSize: 12,
                      color: moodDeltaPct >= 0 ? '#2EBE80' : '#D85A30',
                      background: moodDeltaPct >= 0 ? 'rgba(46,190,128,.10)' : 'rgba(216,90,48,.10)',
                      borderRadius: 20, padding: '4px 11px',
                    }}
                  >
                    {moodDeltaPct >= 0 ? '+' : ''}{toEnglishNumerals(moodDeltaPct)}%
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 100, gap: 6 }}>
                {moodTimeline.map((day, i) => {
                  const heightPct = day.mood !== null
                    ? Math.max(8, Math.round((day.mood / 7) * 100))
                    : 8;
                  return (
                    <div
                      key={i}
                      style={{
                        flex: 1, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 8, height: '100%', justifyContent: 'flex-end',
                      }}
                    >
                      <div
                        style={{
                          width: '100%', maxWidth: 32,
                          height: `${heightPct}%`,
                          borderRadius: '7px 7px 3px 3px',
                          background: barGradient(day.mood),
                          opacity: day.mood === null ? 0.4 : 1,
                          transformOrigin: 'bottom',
                          animation: `ncRise ${0.8 + i * 0.08}s ease-out`,
                        }}
                      />
                      <span style={{ fontSize: 10, color: '#939DB4' }}>{day.dayName}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── Mood dots — مزاجك خلال الأسبوع ─────────────────────────────── */}
          {moodTimeline.length > 0 && (
            <div style={{ ...CARD, padding: 20, marginBottom: 14 }}>
              <span style={{ fontWeight: 500, fontSize: 15, color: '#EAF2EE', display: 'block', marginBottom: 18 }}>
                مزاجك خلال الأسبوع
              </span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {moodTimeline.map((day, i) => {
                  const dot = moodDotStyle(day.mood);
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <span style={{ display: 'block', width: 16, height: 16, borderRadius: '50%', ...dot }} />
                      <span style={{ fontSize: 10.5, color: '#939DB4' }}>{day.dayName}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── Metric cards ────────────────────────────────────────────────── */}
          {data?.metrics && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <MetricCard
                label="الحضور" value={data.metrics.attendance} suffix="/7"
                color={attendanceColor(data.metrics.attendance)}
                trend={data.trends.attendance} delta={data.deltas.attendance}
              />
              <MetricCard
                label="الصمود" value={data.metrics.resilience}
                suffix={data.metrics.urgesTotal > 0 ? `/${toEnglishNumerals(data.metrics.urgesTotal)}` : undefined}
                color={data.metrics.resilience > 0 ? '#2EBE80' : '#EAF2EE'}
                trend={data.trends.resilience} delta={data.deltas.resilience}
              />
              <MetricCard
                label="الجلسات" value={data.metrics.sessions}
                color="#5DCDA5"
                trend={data.trends.sessions} delta={data.deltas.sessions}
              />
              <MetricCard
                label="متوسط المزاج" value={data.metrics.moodAvg ?? '—'}
                suffix={data.metrics.moodAvg != null ? '/7' : undefined}
                color={moodColor(data.metrics.moodAvg)}
                trend={data.trends.mood} delta={data.deltas.mood}
              />
            </div>
          )}

          {/* ─── Streak stats ────────────────────────────────────────────────── */}
          {streakStats && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13.5, fontWeight: 500, color: '#A3ADC2', marginBottom: 11 }}>
                إحصائياتك
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <StatCard label="أطول فترة حضور"          value={streakStats.longestStreak} suffix=" يوم" icon="🏆" />
                <StatCard label="متوسط فترات الحضور"      value={streakStats.avgStreak}     suffix=" يوم" icon="📊" />
                <StatCard label="إجمالي الأيام النظيفة"   value={streakStats.totalCleanDays} suffix=" يوم" icon="✨" />
              </div>
            </div>
          )}

          {/* ─── Milestones ──────────────────────────────────────────────────── */}
          {currentDays > 0 && (
            <div style={{ ...CARD, padding: '18px 20px', marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#EAF2EE', marginBottom: 14 }}>
                محطتك العلمية
              </div>

              {currentMilestone ? (
                <div
                  style={{
                    background: `${currentMilestone.color}10`,
                    border: `1px solid ${currentMilestone.color}30`,
                    borderRadius: 14, padding: '14px 16px', marginBottom: 14,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 24 }}>{currentMilestone.badge}</span>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: currentMilestone.color, fontWeight: 700 }}>
                        {currentMilestone.name}
                      </div>
                      <div style={{ fontSize: 10, color: '#6B7A8C' }}>{currentMilestone.source}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: '#A8B8C4', lineHeight: 1.8, margin: 0 }}>
                    {currentMilestone.science}
                  </p>
                  <p style={{ fontSize: 12, color: '#2EBE80', lineHeight: 1.7, marginTop: 10, fontStyle: 'italic' }}>
                    &ldquo;{currentMilestone.quote}&rdquo;
                  </p>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: '#6B7A8C', marginBottom: 14 }}>
                  استمر — أول محطة بعد {toEnglishNumerals(3 - currentDays)} أيام 🎯
                </div>
              )}

              {nextMilestoneData && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: '#6B7A8C' }}>المحطة القادمة</div>
                    <div style={{ fontSize: 12, color: '#A8B8C4' }}>
                      بعد {toEnglishNumerals(daysToNext)} {daysToNext === 1 ? 'يوم' : 'أيام'}
                    </div>
                  </div>
                  <div
                    style={{
                      background: 'rgba(255,255,255,.03)',
                      border: '1px solid rgba(255,255,255,.07)',
                      borderRadius: 12, padding: '12px 14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 20 }}>{nextMilestoneData.badge}</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: '#EAF2EE', fontWeight: 600 }}>
                        {nextMilestoneData.name} — {toEnglishNumerals(nextMilestoneData.days)} يوم
                      </span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(255,255,255,.07)', borderRadius: 3, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(nextProgress, 100)}%`,
                          background: 'linear-gradient(90deg, #2EBE80, #259696)',
                          borderRadius: 3,
                          transition: 'width 1s ease-out',
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 11, color: '#6B7A8C', marginTop: 6 }}>
                      {toEnglishNumerals(Math.min(nextProgress, 100))}% نحو المحطة
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── Period bar chart — أوقات اللحظات الصعبة ────────────────────── */}
          {totalUrges > 0 && periodData.length > 0 && (
            <div style={{ ...CARD, padding: '20px 20px 16px', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <span style={{ fontWeight: 500, fontSize: 15, color: '#EAF2EE' }}>أوقات اللحظات الصعبة</span>
                {peakPeriod && (
                  <span
                    style={{
                      fontSize: 12, color: '#D85A30',
                      background: 'rgba(216,90,48,.10)',
                      borderRadius: 20, padding: '4px 11px',
                    }}
                  >
                    ذروة: {peakPeriod.name}
                  </span>
                )}
              </div>
              {/* Custom CSS bars */}
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 100, gap: 10 }}>
                {periodData.map((p, i) => {
                  const heightPct = peakPeriodCount > 0 ? Math.max(8, Math.round((p.count / peakPeriodCount) * 100)) : 8;
                  return (
                    <div
                      key={i}
                      style={{
                        flex: 1, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 8, height: '100%', justifyContent: 'flex-end',
                      }}
                    >
                      <div
                        style={{
                          width: '100%', maxWidth: 36,
                          height: `${heightPct}%`,
                          borderRadius: '8px 8px 3px 3px',
                          background: PERIOD_GRADIENTS[i],
                          transformOrigin: 'bottom',
                          animation: `ncRise ${1 + i * 0.15}s ease-out`,
                        }}
                      />
                      <span style={{ fontSize: 11, color: '#939DB4' }}>{p.name}</span>
                    </div>
                  );
                })}
              </div>
              {peakPeriod && peakPeriod.count > 0 && (
                <div
                  style={{
                    marginTop: 14, padding: '10px 14px',
                    background: 'rgba(216,90,48,.06)',
                    border: '1px solid rgba(216,90,48,.18)',
                    borderRadius: 14,
                    fontSize: 12, color: '#A8B8C4', lineHeight: 1.6,
                  }}
                >
                  <span style={{ color: '#D85A30', fontWeight: 600 }}>ذروة:</span>{' '}
                  أكثر اللحظات الصعبة في فترة الـ{peakPeriod.name} — جرّب نشاطاً بديلاً في هذا الوقت.
                </div>
              )}
            </div>
          )}

          {/* ─── Urge log ────────────────────────────────────────────────────── */}
          <UrgeLogSection
            logs={urgeLogs}
            total={urgeTotal}
            filter={urgeFilter}
            loading={urgeLoading}
            onFilterChange={handleUrgeFilterChange}
          />

          {/* ─── Patterns + AI insights ──────────────────────────────────────── */}
          <div style={{ marginBottom: 14 }}>
            {!data?.hasAnalysis || !data.patterns?.length ? (
              /* Not enough data state */
              <div
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  textAlign: 'center', padding: '44px 26px',
                  background: 'rgba(255,255,255,.02)',
                  border: '1px solid rgba(255,255,255,.05)',
                  borderRadius: 22, marginBottom: 10,
                }}
              >
                <span
                  style={{
                    width: 60, height: 60, borderRadius: 18,
                    background: 'rgba(55,110,200,.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#6E9BE8', marginBottom: 18,
                  }}
                >
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" strokeLinecap="round"/>
                  </svg>
                </span>
                <p style={{ margin: '0 0 8px', fontWeight: 500, fontSize: 16, color: '#EAF2EE' }}>
                  ما زلنا نتعرّف على أنماطك
                </p>
                <p style={{ margin: 0, fontWeight: 300, fontSize: 14, lineHeight: 1.85, color: '#B6BFCF', maxWidth: 250 }}>
                  اضغط &quot;توليد تقرير&quot; لتحليل أسبوعك وعرض الأنماط
                </p>
              </div>
            ) : (
              <>
                {/* Insight cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 11 }}>
                  {data.patterns.map((pattern, i) => {
                    const accent = INSIGHT_ACCENTS[i % INSIGHT_ACCENTS.length];
                    return (
                      <div
                        key={pattern.id}
                        style={{
                          display: 'flex', gap: 14, alignItems: 'flex-start',
                          background: accent.bg, border: `1px solid ${accent.border}`,
                          borderRadius: 18, padding: '16px 17px',
                        }}
                      >
                        <span
                          style={{
                            width: 38, height: 38, borderRadius: 11,
                            background: accent.iconBg,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: accent.iconColor, flexShrink: 0,
                          }}
                        >
                          <InsightIcon index={i} />
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#EAF2EE', marginBottom: 3 }}>
                            {pattern.title}
                          </div>
                          <div style={{ fontWeight: 300, fontSize: 13, lineHeight: 1.8, color: '#B6BFCF' }}>
                            {pattern.explanation}
                          </div>
                          {pattern.recommendation && (
                            <div
                              style={{
                                marginTop: 10, paddingTop: 10,
                                borderTop: '1px solid rgba(255,255,255,.07)',
                                display: 'flex', alignItems: 'flex-start', gap: 8,
                              }}
                            >
                              <span style={{ fontSize: 11, color: accent.iconColor, fontWeight: 600, flexShrink: 0 }}>
                                التوصية ←
                              </span>
                              <span style={{ fontSize: 13, color: '#A8B8C4', lineHeight: 1.6 }}>
                                {pattern.recommendation}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* AI insights */}
                {data.aiInsights && (
                  <div
                    style={{
                      display: 'flex', gap: 14, alignItems: 'flex-start',
                      background: 'rgba(93,205,165,.06)',
                      border: '1px solid rgba(93,205,165,.18)',
                      borderRadius: 18, padding: '16px 17px', marginBottom: 10,
                    }}
                  >
                    <span
                      style={{
                        width: 38, height: 38, borderRadius: 11,
                        background: 'rgba(93,205,165,.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#5DCDA5', flexShrink: 0,
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <path d="M12 3c-4.5 0-8 3.1-8 7 0 2.1 1 4 2.7 5.2L6 20l4.2-2.1c.6.1 1.2.1 1.8.1 4.5 0 8-3.1 8-7s-3.5-7-8-7z" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#EAF2EE', marginBottom: 3 }}>
                        ملخّص الأسبوع
                      </div>
                      <div style={{ fontWeight: 300, fontSize: 13, lineHeight: 1.8, color: '#B6BFCF' }}>
                        {data.aiInsights}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ─── Generate button ─────────────────────────────────────────────── */}
          <button
            onClick={generateAnalysis}
            disabled={generating}
            style={{
              width: '100%', padding: '14px',
              background: generating
                ? 'rgba(255,255,255,.04)'
                : 'linear-gradient(135deg,#2EBE80,#259696)',
              border: generating ? '1px solid rgba(255,255,255,.09)' : 'none',
              borderRadius: 28,
              color: generating ? '#6B7A8C' : '#EAF2EE',
              fontSize: 15, fontWeight: 700,
              cursor: generating ? 'not-allowed' : 'pointer',
              marginBottom: 20, transition: 'all 0.3s ease',
              fontFamily: 'var(--font-body)',
              boxShadow: generating ? 'none' : '0 6px 18px rgba(46,190,128,.25)',
            }}
          >
            {generating ? 'جاري التحليل...' : 'توليد تقرير جديد'}
          </button>

          {generateError && (
            <div
              style={{
                background: 'rgba(216,90,48,.08)',
                border: '1px solid rgba(216,90,48,.3)',
                borderRadius: 18, padding: '12px 16px', marginBottom: 20,
                fontSize: 13, color: '#D85A30', direction: 'rtl',
              }}
            >
              {generateError}
            </div>
          )}
        </>
      )}
    </div>
  );
}
