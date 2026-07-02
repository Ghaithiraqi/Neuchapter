'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { toArabicNumerals } from '@/lib/utils';
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function TrendBadge({ trend, delta }: { trend: Trend; delta: number | null }) {
  if (trend === 'none' || delta === null) return null;
  if (trend === 'same') return <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 4 }}>—</span>;

  const isUp = trend === 'up';
  const color = isUp ? '#7FA88C' : 'var(--alert-warm)';
  const arrow = isUp ? '↑' : '↓';
  const pct = delta !== 0 ? ` ${Math.abs(delta)}` : '';

  return (
    <span style={{ fontSize: 12, color, marginRight: 4, fontFamily: 'var(--font-body)' }}>
      {arrow}{pct}
    </span>
  );
}

function MetricCard({
  label, value, suffix, color, trend, delta,
}: {
  label: string; value: string | number; suffix?: string;
  color: string; trend: Trend; delta: number | null;
}) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-small)',
        padding: '16px 18px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color, fontWeight: 700, lineHeight: 1 }}>
            {typeof value === 'number' ? toArabicNumerals(value) : value}
          </div>
          {suffix && (
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)' }}>
              {suffix}
            </div>
          )}
        </div>
        <TrendBadge trend={trend} delta={delta} />
      </div>
    </div>
  );
}

function StatCard({ label, value, suffix, icon }: { label: string; value: number; suffix?: string; icon: string }) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-small)',
        padding: '16px 14px',
        textAlign: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--gold-primary)', fontWeight: 700, lineHeight: 1 }}>
        {toArabicNumerals(value)}
        {suffix && <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 400 }}>{suffix}</span>}
      </div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
        {label}
      </div>
    </div>
  );
}

function MoodTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-soft)', borderRadius: 8, padding: '8px 12px', fontFamily: 'var(--font-body)', fontSize: 12 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ color: 'var(--gold-primary)', fontWeight: 600 }}>مزاج: {toArabicNumerals(payload[0].value)}/٧</div>
    </div>
  );
}

function UrgeTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-soft)', borderRadius: 8, padding: '8px 12px', fontFamily: 'var(--font-body)', fontSize: 12 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ color: 'var(--alert-warm)', fontWeight: 600 }}>{toArabicNumerals(payload[0].value)} لحظة</div>
    </div>
  );
}

// ─── Urge Log Helpers ────────────────────────────────────────────────────────

const OUTCOME_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  resisted:    { label: 'قاومت',    color: '#7FA88C', bg: 'rgba(107,168,140,0.1)',  border: 'rgba(107,168,140,0.3)' },
  relapsed:    { label: 'انتكست',   color: 'var(--alert-warm)', bg: 'rgba(216,90,48,0.1)',   border: 'rgba(216,90,48,0.3)' },
  distracted:  { label: 'تشتّتت',   color: 'var(--text-muted)', bg: 'rgba(107,128,128,0.08)', border: 'rgba(107,128,128,0.2)' },
};

const TRIGGER_AR: Record<string, string> = {
  stress:        'ضغط نفسي',
  boredom:       'ملل',
  loneliness:    'وحدة',
  late_night:    'سهر ليلي',
  social_media:  'تواصل اجتماعي',
  other:         'أخرى',
};

const FILTER_TABS: { key: UrgeOutcomeFilter; label: string }[] = [
  { key: 'all',        label: 'الكل' },
  { key: 'resisted',   label: 'قاومت' },
  { key: 'relapsed',   label: 'انتكست' },
  { key: 'distracted', label: 'تشتّتت' },
];

function IntensityDots({ value }: { value: number }) {
  // intensity 1-10 → 5 نقاط، كل نقطة = 2 وحدات
  const filled = Math.round(value / 2);
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: i < filled
              ? filled >= 4 ? 'var(--alert-warm)' : filled >= 3 ? 'var(--gold-primary)' : '#7FA88C'
              : 'var(--border-mid)',
            transition: 'background 0.2s',
          }}
        />
      ))}
    </div>
  );
}

function UrgeLogSection({
  logs,
  total,
  filter,
  loading,
  onFilterChange,
}: {
  logs: UrgeLog[];
  total: number;
  filter: UrgeOutcomeFilter;
  loading: boolean;
  onFilterChange: (f: UrgeOutcomeFilter) => void;
}) {
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const date = d.toLocaleDateString('ar-IQ', { month: 'short', day: 'numeric' });
    const time = d.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit', hour12: true });
    return { date, time };
  };

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-card)',
        padding: '18px 18px 8px',
        marginBottom: 18,
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      }}
    >
      {/* عنوان + عداد */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>
          سجل اللحظات
        </div>
        {total > 0 && (
          <div
            style={{
              fontFamily: 'var(--font-body)', fontSize: 11,
              color: 'var(--text-muted)',
              background: 'var(--gold-faint)',
              border: '1px solid var(--border-soft)',
              borderRadius: 'var(--radius-button)',
              padding: '3px 10px',
            }}
          >
            {toArabicNumerals(total)} إجمالاً
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
                padding: '5px 14px',
                borderRadius: 'var(--radius-button)',
                border: isActive
                  ? `1px solid ${meta?.border ?? 'var(--border-strong)'}`
                  : '1px solid var(--border-soft)',
                background: isActive
                  ? (meta?.bg ?? 'var(--gold-faint)')
                  : 'transparent',
                color: isActive
                  ? (meta?.color ?? 'var(--gold-primary)')
                  : 'var(--text-muted)',
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                fontWeight: isActive ? 700 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* المحتوى */}
      {loading ? (
        <div style={{ padding: '24px 0', textAlign: 'center' }}>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
            {[0, 0.15, 0.3].map((d, i) => (
              <div
                key={i}
                style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--gold-primary)',
                  animation: `blink 1.2s ease-in-out ${d}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      ) : logs.length === 0 ? (
        <div
          style={{
            padding: '28px 0', textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>🌿</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text-primary)', marginBottom: 6 }}>
            {filter === 'all' ? 'لا توجد لحظات مسجّلة بعد' : `لا توجد سجلات "${OUTCOME_META[filter]?.label ?? filter}"`}
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
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
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '13px 0',
                  borderBottom: isLast ? 'none' : '1px solid var(--border-soft)',
                }}
              >
                {/* الوقت */}
                <div style={{ flexShrink: 0, minWidth: 52, textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    {date}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', direction: 'ltr' }}>
                    {time}
                  </div>
                </div>

                {/* فاصل رأسي */}
                <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--border-soft)', flexShrink: 0 }} />

                {/* المحتوى الرئيسي */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                    {/* شدة الإغراء */}
                    <IntensityDots value={log.intensity} />
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-muted)' }}>
                      {toArabicNumerals(log.intensity)}/١٠
                    </span>
                  </div>

                  {/* المحفّز */}
                  {triggerLabel && (
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                      {triggerLabel}
                    </div>
                  )}
                </div>

                {/* النتيجة badge */}
                <div
                  style={{
                    flexShrink: 0,
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-button)',
                    background: meta.bg,
                    border: `1px solid ${meta.border}`,
                    color: meta.color,
                    fontFamily: 'var(--font-body)',
                    fontSize: 11,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
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
  const [mounted, setMounted] = useState(false);

  // ─── Urge log state ───────────────────────────────────────────────────────
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
    setMounted(true);
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

  const attendanceColor = (n: number) =>
    n >= 5 ? '#7FA88C' : n >= 3 ? 'var(--gold-soft)' : 'var(--alert-warm)';
  const moodColor = (n: number | null) => {
    if (n == null) return 'var(--text-muted)';
    return n >= 5 ? '#7FA88C' : n >= 3 ? 'var(--gold-soft)' : 'var(--alert-warm)';
  };

  const periodData = data?.hourlyDistribution
    ? [
        { name: 'ليل', label: '٠٠—٠٦', count: data.hourlyDistribution.slice(0, 6).reduce((s, h) => s + h.count, 0) },
        { name: 'صباح', label: '٠٦—١٢', count: data.hourlyDistribution.slice(6, 12).reduce((s, h) => s + h.count, 0) },
        { name: 'ظهر', label: '١٢—١٨', count: data.hourlyDistribution.slice(12, 18).reduce((s, h) => s + h.count, 0) },
        { name: 'مساء', label: '١٨—٢٤', count: data.hourlyDistribution.slice(18, 24).reduce((s, h) => s + h.count, 0) },
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

  return (
    <div style={{ padding: '0 20px' }}>
      {/* الهيدر */}
      <div
        style={{
          margin: '20px 0 18px',
          padding: '22px 22px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-soft)',
          borderRadius: 'var(--radius-card)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-muted)' }}>
            {data?.weekStart
              ? `${new Date(data.weekStart).toLocaleDateString('ar-IQ')} — ${new Date(data.weekEnd).toLocaleDateString('ar-IQ')}`
              : 'آخر ٧ أيام'}
          </div>
          {data && (
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 12,
                color: 'var(--gold-primary)',
                padding: '4px 12px',
                border: '1px solid var(--border-mid)',
                borderRadius: 'var(--radius-button)',
                background: 'var(--gold-faint)',
              }}
            >
              أسبوع {toArabicNumerals(data.weekNumber)}
            </div>
          )}
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-primary)', fontWeight: 700, marginBottom: 6 }}>
          تقرير الأسبوع
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>
          تحليل سلوكي مبني على بياناتك
        </p>
      </div>

      {/* ─── إحصائياتك ──────────────────────────────────────────────────────── */}
      {streakStats && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 12 }}>
            إحصائياتك
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            <StatCard label="أطول streak" value={streakStats.longestStreak} suffix=" يوم" icon="🏆" />
            <StatCard label="متوسط streaks" value={streakStats.avgStreak} suffix=" يوم" icon="📊" />
            <StatCard label="إجمالي الأيام النظيفة" value={streakStats.totalCleanDays} suffix=" يوم" icon="✨" />
          </div>
        </div>
      )}

      {/* ─── المحطات ─────────────────────────────────────────────────────────── */}
      {currentDays > 0 && (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-card)',
            padding: '18px 20px',
            marginBottom: 18,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 14 }}>
            محطتك العلمية
          </div>

          {/* المحطة الحالية */}
          {currentMilestone ? (
            <div
              style={{
                background: `${currentMilestone.color}10`,
                border: `1px solid ${currentMilestone.color}30`,
                borderRadius: 12,
                padding: '14px 16px',
                marginBottom: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>{currentMilestone.badge}</span>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: currentMilestone.color, fontWeight: 700 }}>
                    {currentMilestone.name}
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-muted)' }}>
                    {currentMilestone.source}
                  </div>
                </div>
              </div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8, margin: 0 }}>
                {currentMilestone.science}
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                  color: 'var(--gold-primary)',
                  lineHeight: 1.7,
                  marginTop: 10,
                  fontStyle: 'italic',
                }}
              >
                &ldquo;{currentMilestone.quote}&rdquo;
              </p>
            </div>
          ) : (
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
              استمر — أول محطة بعد {toArabicNumerals(3 - currentDays)} أيام 🎯
            </div>
          )}

          {/* المحطة القادمة */}
          {nextMilestoneData && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-muted)' }}>
                  المحطة القادمة
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)' }}>
                  بعد {toArabicNumerals(daysToNext)} {daysToNext === 1 ? 'يوم' : 'أيام'}
                </div>
              </div>
              <div
                style={{
                  background: 'var(--gold-faint)',
                  border: '1px solid var(--border-soft)',
                  borderRadius: 10,
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>{nextMilestoneData.badge}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>
                    {nextMilestoneData.name} — {toArabicNumerals(nextMilestoneData.days)} يوم
                  </span>
                </div>
                {/* شريط التقدم نحو المحطة */}
                <div style={{ height: 5, background: 'var(--border-soft)', borderRadius: 3, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(nextProgress, 100)}%`,
                      background: `linear-gradient(90deg, ${nextMilestoneData.color}80, ${nextMilestoneData.color})`,
                      borderRadius: 3,
                      transition: 'width 1s ease-out',
                    }}
                  />
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  {toArabicNumerals(Math.min(nextProgress, 100))}٪ نحو المحطة
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* المقاييس + deltas */}
      {data?.metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
          <MetricCard
            label="الحضور" value={data.metrics.attendance} suffix="/٧"
            color={attendanceColor(data.metrics.attendance)}
            trend={data.trends.attendance} delta={data.deltas.attendance}
          />
          <MetricCard
            label="الصمود" value={data.metrics.resilience}
            suffix={data.metrics.urgesTotal > 0 ? `/${toArabicNumerals(data.metrics.urgesTotal)}` : undefined}
            color={data.metrics.resilience > 0 ? '#7FA88C' : 'var(--text-primary)'}
            trend={data.trends.resilience} delta={data.deltas.resilience}
          />
          <MetricCard
            label="الجلسات" value={data.metrics.sessions}
            color="var(--gold-soft)"
            trend={data.trends.sessions} delta={data.deltas.sessions}
          />
          <MetricCard
            label="متوسط المزاج" value={data.metrics.moodAvg ?? '—'}
            suffix={data.metrics.moodAvg != null ? '/٧' : undefined}
            color={moodColor(data.metrics.moodAvg)}
            trend={data.trends.mood} delta={data.deltas.mood}
          />
        </div>
      )}

      {/* رسم بياني: تطور المزاج */}
      {mounted && data?.moodTimeline && data.moodTimeline.some((d) => d.mood != null) && (
        <div
          style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-card)', padding: '18px 18px 12px',
            marginBottom: 18, boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 14 }}>
            تطور المزاج
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={data.moodTimeline} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="dayName" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'Tajawal' }} axisLine={false} tickLine={false} />
              <YAxis domain={[1, 7]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<MoodTooltip />} />
              <Line type="monotone" dataKey="mood" stroke="var(--gold-primary)" strokeWidth={2}
                dot={{ fill: 'var(--gold-primary)', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: 'var(--gold-deep)' }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* رسم بياني: أوقات الذروة */}
      {mounted && totalUrges > 0 && periodData.length > 0 && (
        <div
          style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-card)', padding: '18px 18px 12px',
            marginBottom: 18, boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 14 }}>
            أوقات اللحظات الصعبة
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={periodData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'Tajawal' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<UrgeTooltip />} />
              <Bar dataKey="count" fill="rgba(216,90,48,0.5)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {peakPeriod && peakPeriod.count > 0 && (
            <div
              style={{
                marginTop: 12, padding: '10px 14px',
                background: 'rgba(216,90,48,0.06)', border: '1px solid rgba(216,90,48,0.2)',
                borderRadius: 'var(--radius-small)', fontFamily: 'var(--font-body)', fontSize: 12,
                color: 'var(--text-secondary)', lineHeight: 1.6,
              }}
            >
              <span style={{ color: 'var(--alert-warm)', fontWeight: 600 }}>ذروة:</span>{' '}
              أكثر اللحظات الصعبة في فترة الـ{peakPeriod.name} ({peakPeriod.label}) — جرّب نشاطاً بديلاً في هذا الوقت.
            </div>
          )}
        </div>
      )}

      {/* ─── سجل اللحظات ──────────────────────────────────────────────────────── */}
      <UrgeLogSection
        logs={urgeLogs}
        total={urgeTotal}
        filter={urgeFilter}
        loading={urgeLoading}
        onFilterChange={handleUrgeFilterChange}
      />

      {/* الأنماط */}
      <div style={{ marginBottom: 18 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 13 }}>
            جاري التحميل...
          </div>
        ) : !data?.hasAnalysis || !data.patterns?.length ? (
          <div
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-soft)',
              borderRadius: 'var(--radius-small)', padding: '28px 20px',
              textAlign: 'center', marginBottom: 10,
            }}
          >
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--text-primary)', marginBottom: 8 }}>
              لا يوجد تقرير بعد
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7 }}>
              اضغط &quot;توليد تقرير&quot; لتحليل أسبوعك وعرض الأنماط
            </div>
          </div>
        ) : (
          <>
            {data.patterns.map((pattern) => (
              <div
                key={pattern.id}
                style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${pattern.type === 'success' ? 'rgba(107,168,140,0.3)' : 'var(--border-soft)'}`,
                  borderRadius: 'var(--radius-small)', padding: 20,
                  marginBottom: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      fontFamily: 'var(--font-body)', fontSize: 11,
                      color: pattern.type === 'success' ? '#7FA88C' : 'var(--gold-primary)',
                      background: pattern.type === 'success' ? 'rgba(107,168,140,0.08)' : 'var(--gold-faint)',
                      padding: '4px 12px', borderRadius: 'var(--radius-button)',
                      border: pattern.type === 'success' ? '1px solid rgba(107,168,140,0.2)' : '1px solid var(--border-mid)',
                    }}
                  >
                    {pattern.type === 'success' ? '✦' : '◈'} {pattern.tag}
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-muted)' }}>
                    دقة {toArabicNumerals(pattern.confidence)}٪
                  </div>
                </div>
                <div style={{ height: 2, background: 'var(--border-soft)', borderRadius: 1, marginBottom: 12, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%', width: `${pattern.confidence}%`,
                      background: pattern.type === 'success'
                        ? 'linear-gradient(90deg, #7FA88C, #A8CDB8)'
                        : 'linear-gradient(90deg, var(--gold-deep), var(--gold-soft))',
                      borderRadius: 1,
                    }}
                  />
                </div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--text-primary)', marginBottom: 10, fontWeight: 600, lineHeight: 1.5 }}>
                  {pattern.title}
                </h3>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                  {pattern.explanation}
                </p>
                {pattern.recommendation && (
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-soft)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--gold-primary)', fontWeight: 600, flexShrink: 0 }}>
                      التوصية ←
                    </span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {pattern.recommendation}
                    </span>
                  </div>
                )}
              </div>
            ))}

            {data.aiInsights && (
              <div
                style={{
                  background: 'var(--gold-faint)', border: '1px solid var(--border-mid)',
                  borderRadius: 'var(--radius-small)', padding: '16px 18px', marginBottom: 10,
                }}
              >
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--gold-primary)', marginBottom: 8, fontWeight: 600 }}>
                  ملخص الأسبوع
                </div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, margin: 0 }}>
                  {data.aiInsights}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* زر توليد تقرير */}
      <button
        onClick={generateAnalysis}
        disabled={generating}
        style={{
          width: '100%', padding: '14px',
          background: generating ? 'var(--gold-faint)' : 'var(--gold-primary)',
          border: generating ? '1px solid var(--border-mid)' : 'none',
          borderRadius: 'var(--radius-button)',
          color: generating ? 'var(--text-muted)' : '#1A3D3D',
          fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700,
          cursor: generating ? 'not-allowed' : 'pointer',
          marginBottom: 20, transition: 'all 0.3s ease',
        }}
      >
        {generating ? 'جاري التحليل...' : 'توليد تقرير جديد'}
      </button>

      {generateError && (
        <div
          style={{
            background: 'rgba(216,90,48,0.1)',
            border: '1px solid rgba(216,90,48,0.35)',
            borderRadius: 'var(--radius-card)',
            padding: '12px 16px',
            marginBottom: 20,
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            color: 'var(--alert-warm)',
            direction: 'rtl',
          }}
        >
          {generateError}
        </div>
      )}
    </div>
  );
}
