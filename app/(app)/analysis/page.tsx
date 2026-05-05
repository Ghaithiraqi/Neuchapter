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
  label,
  value,
  suffix,
  color,
  trend,
  delta,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  color: string;
  trend: Trend;
  delta: number | null;
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalysisPage() {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch('/api/analysis')
      .then((r) => r.json())
      .then((d) => { if (d.metrics) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const generateAnalysis = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/analysis', { method: 'POST' });
      const d = await res.json();
      if (d.metrics) setData(d);
    } catch {
      // صامت
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

  // Aggregate hourly into 4 periods for bar chart
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

      {/* المقاييس + deltas */}
      {data?.metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
          <MetricCard
            label="الحضور"
            value={data.metrics.attendance}
            suffix="/٧"
            color={attendanceColor(data.metrics.attendance)}
            trend={data.trends.attendance}
            delta={data.deltas.attendance}
          />
          <MetricCard
            label="الصمود"
            value={data.metrics.resilience}
            suffix={data.metrics.urgesTotal > 0 ? `/${toArabicNumerals(data.metrics.urgesTotal)}` : undefined}
            color={data.metrics.resilience > 0 ? '#7FA88C' : 'var(--text-primary)'}
            trend={data.trends.resilience}
            delta={data.deltas.resilience}
          />
          <MetricCard
            label="الجلسات"
            value={data.metrics.sessions}
            color="var(--gold-soft)"
            trend={data.trends.sessions}
            delta={data.deltas.sessions}
          />
          <MetricCard
            label="متوسط المزاج"
            value={data.metrics.moodAvg ?? '—'}
            suffix={data.metrics.moodAvg != null ? '/٧' : undefined}
            color={moodColor(data.metrics.moodAvg)}
            trend={data.trends.mood}
            delta={data.deltas.mood}
          />
        </div>
      )}

      {/* رسم بياني: تطور المزاج */}
      {mounted && data?.moodTimeline && data.moodTimeline.some((d) => d.mood != null) && (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-card)',
            padding: '18px 18px 12px',
            marginBottom: 18,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 14 }}>
            تطور المزاج
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={data.moodTimeline} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="dayName"
                tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'Tajawal' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[1, 7]}
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<MoodTooltip />} />
              <Line
                type="monotone"
                dataKey="mood"
                stroke="var(--gold-primary)"
                strokeWidth={2}
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
            background: 'var(--bg-card)',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-card)',
            padding: '18px 18px 12px',
            marginBottom: 18,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 14 }}>
            أوقات اللحظات الصعبة
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={periodData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'Tajawal' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<UrgeTooltip />} />
              <Bar dataKey="count" fill="rgba(216,90,48,0.5)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          {peakPeriod && peakPeriod.count > 0 && (
            <div
              style={{
                marginTop: 12,
                padding: '10px 14px',
                background: 'rgba(216,90,48,0.06)',
                border: '1px solid rgba(216,90,48,0.2)',
                borderRadius: 'var(--radius-small)',
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
              }}
            >
              <span style={{ color: 'var(--alert-warm)', fontWeight: 600 }}>ذروة:</span>{' '}
              أكثر اللحظات الصعبة في فترة الـ{peakPeriod.name} ({peakPeriod.label}) — جرّب نشاطاً بديلاً في هذا الوقت.
            </div>
          )}
        </div>
      )}

      {/* الأنماط */}
      <div style={{ marginBottom: 18 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 13 }}>
            جاري التحميل...
          </div>
        ) : !data?.hasAnalysis || !data.patterns?.length ? (
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-soft)',
              borderRadius: 'var(--radius-small)',
              padding: '28px 20px',
              textAlign: 'center',
              marginBottom: 10,
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
                  borderRadius: 'var(--radius-small)',
                  padding: 20,
                  marginBottom: 10,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontFamily: 'var(--font-body)',
                      fontSize: 11,
                      color: pattern.type === 'success' ? '#7FA88C' : 'var(--gold-primary)',
                      background: pattern.type === 'success' ? 'rgba(107,168,140,0.08)' : 'var(--gold-faint)',
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-button)',
                      border: pattern.type === 'success' ? '1px solid rgba(107,168,140,0.2)' : '1px solid var(--border-mid)',
                    }}
                  >
                    {pattern.type === 'success' ? '✦' : '◈'} {pattern.tag}
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-muted)' }}>
                    دقة {toArabicNumerals(pattern.confidence)}٪
                  </div>
                </div>

                {/* confidence bar */}
                <div style={{ height: 2, background: 'var(--border-soft)', borderRadius: 1, marginBottom: 12, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${pattern.confidence}%`,
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
                  background: 'var(--gold-faint)',
                  border: '1px solid var(--border-mid)',
                  borderRadius: 'var(--radius-small)',
                  padding: '16px 18px',
                  marginBottom: 10,
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
          width: '100%',
          padding: '14px',
          background: generating ? 'var(--gold-faint)' : 'var(--gold-primary)',
          border: generating ? '1px solid var(--border-mid)' : 'none',
          borderRadius: 'var(--radius-button)',
          color: generating ? 'var(--text-muted)' : '#1A3D3D',
          fontFamily: 'var(--font-body)',
          fontSize: 15,
          fontWeight: 700,
          cursor: generating ? 'not-allowed' : 'pointer',
          marginBottom: 20,
          transition: 'all 0.3s ease',
        }}
      >
        {generating ? 'جاري التحليل...' : 'توليد تقرير جديد'}
      </button>
    </div>
  );
}
