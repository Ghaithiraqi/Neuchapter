'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toEnglishNumerals } from '@/lib/utils';
import { StreakCalendar } from '@/components/home/StreakCalendar';

const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

const TRIGGER_LABELS: Record<string, string> = {
  stress: 'توتر',
  boredom: 'ملل',
  loneliness: 'وحدة',
  late_night: 'سهر متأخر',
  social_media: 'تصفح مواقع التواصل',
  other: 'أخرى',
};

const OUTCOME_LABELS: Record<string, { label: string; style: React.CSSProperties }> = {
  resisted: { label: 'قاومت', style: { background: 'rgba(46,190,128,.12)', color: '#5DCDA5' } },
  relapsed: { label: 'انتكاسة', style: { background: 'rgba(176,137,104,.16)', color: '#D8B99C' } },
  distracted: { label: 'شغلت نفسي', style: { background: 'rgba(55,110,200,.12)', color: '#8FB2EE' } },
};

interface StreakRecord {
  id: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  relapseDate: string | null;
}

interface StreakResponse {
  days: number;
  allStreaks: StreakRecord[];
  stats: { longestStreak: number; avgStreak: number; totalCleanDays: number };
}

interface UrgeLog {
  id: number;
  timestamp: string;
  intensity: number;
  trigger: string | null;
  context: string | null;
  outcome: string;
}

interface JournalEntry {
  id: number;
  content: string;
  type: string;
  audioUrl: string | null;
  createdAt: string;
}

interface SelectedDay {
  date: Date;
  category: 'clean' | 'relapse';
  isToday: boolean;
}

function utcDateKey(d: Date | string): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return `${dt.getUTCFullYear()}-${dt.getUTCMonth()}-${dt.getUTCDate()}`;
}

function formatMomentWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = utcDateKey(d) === utcDateKey(now);
  const time = toEnglishNumerals(
    d.toLocaleTimeString('ar-SA', { hour: 'numeric', minute: '2-digit' })
  );
  if (isToday) return `اليوم · ${time}`;
  const date = toEnglishNumerals(
    d.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })
  );
  return `${date} · ${time}`;
}

// ─── Header streak ring (52px, نفس تدرّج شاشة الرئيسية) ────────────────────────

function StreakRing({ days, progress }: { days: number; progress: number }) {
  const R = 22;
  const CIRC = 2 * Math.PI * R;
  const offset = CIRC - progress * CIRC;

  return (
    <div style={{ position: 'relative', width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="52" height="52" viewBox="0 0 52 52" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="ncJournalRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5DCDA5" />
            <stop offset="45%" stopColor="#259696" />
            <stop offset="100%" stopColor="#376EC8" />
          </linearGradient>
        </defs>
        <circle cx="26" cy="26" r={R} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="3" />
        <circle
          cx="26" cy="26" r={R} fill="none" stroke="url(#ncJournalRing)" strokeWidth="3"
          strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
        />
      </svg>
      <span style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 18, color: '#EAF2EE', direction: 'ltr' }}>
        {toEnglishNumerals(days)}
      </span>
    </div>
  );
}

function IntensityDots({ intensity }: { intensity: number }) {
  const filled = Math.max(1, Math.min(5, Math.round(intensity / 2)));
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }} aria-label="شدّة اللحظة">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          style={{
            width: 7, height: 7, borderRadius: '50%',
            background: i <= filled ? 'linear-gradient(180deg,#5DCDA5,#259696)' : 'rgba(255,255,255,.1)',
          }}
        />
      ))}
    </div>
  );
}

export default function JournalPage() {
  const router = useRouter();
  const [streak, setStreak] = useState<StreakResponse | null>(null);
  const [moments, setMoments] = useState<UrgeLog[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedDay, setSelectedDay] = useState<SelectedDay | null>(null);

  useEffect(() => {
    fetch('/api/streak').then((r) => r.json()).then((d) => { if (d.allStreaks) setStreak(d); }).catch(() => {});
    fetch('/api/urge?limit=5').then((r) => r.json()).then((d) => { if (d.logs) setMoments(d.logs); }).catch(() => {});
    fetch('/api/journal?limit=200').then((r) => r.json()).then((d) => { if (d.entries) setEntries(d.entries); }).catch(() => {});
  }, []);

  const progress = streak && streak.stats.longestStreak > 0
    ? Math.min(streak.days / streak.stats.longestStreak, 1)
    : 1;

  const entriesForSelectedDay = selectedDay
    ? entries.filter((e) => utcDateKey(e.createdAt) === utcDateKey(selectedDay.date))
    : [];

  const selStatus = selectedDay
    ? selectedDay.isToday && selectedDay.category === 'relapse'
      ? { label: 'اليوم · انتكاسة', style: { background: 'rgba(176,137,104,.18)', color: '#D8B99C' }, note: 'سجّلت انتكاسة اليوم. لا بأس — هذا جزء من الرحلة، وحضورك لم يضِع.' }
      : selectedDay.isToday
        ? { label: 'اليوم', style: { background: 'rgba(93,205,165,.16)', color: '#5DCDA5' }, note: 'أنت هنا الآن. يومك لم يُكتب بعد — اجعله لطيفًا على نفسك.' }
        : selectedDay.category === 'relapse'
          ? { label: 'انتكاسة', style: { background: 'rgba(176,137,104,.18)', color: '#D8B99C' }, note: 'يوم أصعب. الانتكاسة جزء من الطريق لا نهايته — عُد بلطفٍ إلى نفسك.' }
          : { label: 'نظيف', style: { background: 'rgba(46,190,128,.16)', color: '#5DCDA5' }, note: 'يوم حاضر. اخترت أن تبقى، وهذا يُحتسب.' }
    : null;

  return (
    <div style={{ padding: '20px 20px 8px', direction: 'rtl' }}>
      {/* الهيدر */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 20, color: '#EAF2EE' }}>
          سجلّي
        </h1>
        {streak && <StreakRing days={streak.days} progress={progress} />}
      </div>

      {/* التقويم */}
      {streak && (
        <StreakCalendar
          streaks={streak.allStreaks}
          variant="mint"
          onDaySelect={(date, category, isToday) => setSelectedDay({ date, category, isToday })}
        />
      )}

      {/* تفاصيل اليوم المحدد */}
      {selectedDay && selStatus && (
        <div style={{ marginTop: 4, marginBottom: 26, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, padding: '18px 18px 20px', animation: 'ncFadeUp .5s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 16, color: '#EAF2EE' }}>
              {toEnglishNumerals(selectedDay.date.getUTCDate())} {MONTHS_AR[selectedDay.date.getUTCMonth()]}
            </span>
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 12, padding: '4px 12px', borderRadius: 20, ...selStatus.style }}>
              {selStatus.label}
            </span>
          </div>
          <p style={{ margin: '0 0 14px', fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: 14, lineHeight: 1.9, color: '#B6BFCF' }}>
            {selStatus.note}
          </p>
          {entriesForSelectedDay.map((entry) => (
            <button
              key={entry.id}
              onClick={() => router.push(`/journal/${entry.id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 14px',
                background: 'rgba(93,205,165,.08)', border: '1px solid rgba(93,205,165,.22)', borderRadius: 14,
                cursor: 'pointer', textAlign: 'right', marginTop: 8,
              }}
            >
              <span style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(93,205,165,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5DCDA5', flexShrink: 0 }}>
                {entry.type === 'voice' ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                ) : (
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor">
                    <path d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: 13.5, color: '#C6D0DE', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.type === 'voice' ? 'مذكرة صوتية لهذا اليوم' : entry.content}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* لحظاتك الأخيرة */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 16, color: '#EAF2EE' }}>لحظاتك الأخيرة</span>
        <button
          onClick={() => router.push('/analysis')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: '#8B7EE8', fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 12.5 }}
        >
          أنماطي
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" style={{ transform: 'scaleX(-1)' }}>
            <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
        {moments.map((m) => {
          const outcome = OUTCOME_LABELS[m.outcome];
          const triggerLabel = m.trigger ? TRIGGER_LABELS[m.trigger] : null;
          return (
            <div key={m.id} style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 18, padding: '15px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 11 }}>
                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 13, color: '#B6BFCF' }}>
                  {formatMomentWhen(m.timestamp)}
                </span>
                <IntensityDots intensity={m.intensity} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {outcome && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 11px', borderRadius: 11, fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 12.5, ...outcome.style }}>
                    {outcome.label}
                  </span>
                )}
                {triggerLabel && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 11, background: 'rgba(55,110,200,.1)', color: '#8FB2EE', fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 12.5 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5s1.5 2 3.5 2 3.5-2 3.5-2M9 9.5h.01M15 9.5h.01" strokeLinecap="round" /></svg>
                    {triggerLabel}
                  </span>
                )}
              </div>
              {m.context && (
                <p style={{ margin: '11px 0 0', fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: 13.5, lineHeight: 1.8, color: '#B6BFCF' }}>
                  {m.context}
                </p>
              )}
            </div>
          );
        })}

        {moments.length === 0 && (
          <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 18, padding: '24px 18px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 13.5, color: '#8791A6' }}>
              لا لحظات مسجّلة بعد
            </p>
          </div>
        )}
      </div>

      {/* عرض كل المذكرات — بحث وتحميل تدريجي */}
      <button
        onClick={() => router.push('/journal/all')}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          minHeight: 46, padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 50, color: '#5DCDA5', fontFamily: 'var(--font-body)', fontSize: 13.5, cursor: 'pointer',
        }}
      >
        عرض كل المذكرات والبحث
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" style={{ transform: 'scaleX(-1)' }}>
          <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
