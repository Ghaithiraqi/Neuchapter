'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { toEnglishNumerals } from '@/lib/utils';
import {
  getCurrentMilestone,
  getNextMilestone,
  getDaysToNextMilestone,
  shouldShowPreMessage,
} from '@/lib/milestones';
import { StreakCalendar } from './StreakCalendar';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StreakData {
  id: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  relapseDate: string | null;
  insuranceUsed: boolean;
}

interface StreakResponse {
  days: number;
  streak: StreakData | null;
  allStreaks: StreakData[];
  stats: { longestStreak: number; avgStreak: number; totalCleanDays: number };
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface StreakCtxValue {
  data: StreakResponse | null;
  days: number;
  streak: StreakData | null;
  nextMilestone: number;
  progress: number;
  circumference: number;
  offset: number;
  remaining: number;
  pct: number;
  currentMilestone: ReturnType<typeof getCurrentMilestone>;
  nextMilestoneData: ReturnType<typeof getNextMilestone>;
  daysToNext: number;
  showPre: boolean;
  loading: boolean;
  setShowResetModal: (v: boolean) => void;
  setShowDateModal: (v: boolean) => void;
  handleInsurance: () => Promise<void>;
}

const StreakCtx = createContext<StreakCtxValue | null>(null);

export function useStreak(): StreakCtxValue {
  const ctx = useContext(StreakCtx);
  if (!ctx) throw new Error('useStreak must be used inside StreakProvider');
  return ctx;
}

// ─── Modal: تأكيد الإعادة ─────────────────────────────────────────────────────

function ResetModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(10,26,26,0.85)',
        zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-mid)',
          borderRadius: 'var(--radius-card)',
          padding: '28px 24px',
          maxWidth: 340, width: '100%',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 12 }}>🔄</div>
        <h3
          style={{
            fontFamily: 'var(--font-display)', fontSize: 18,
            color: 'var(--text-primary)', marginBottom: 10, lineHeight: 1.5,
          }}
        >
          هل تريد تصفير العداد؟
        </h3>
        <p
          style={{
            fontFamily: 'var(--font-body)', fontSize: 13,
            color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 24,
          }}
        >
          سيُحفظ الـ streak الحالي كسجل في التاريخ ويبدأ عداد جديد من اليوم.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '12px',
              background: 'var(--gold-faint)', border: '1px solid var(--border-mid)',
              borderRadius: 'var(--radius-button)', color: 'var(--text-secondary)',
              fontFamily: 'var(--font-body)', fontSize: 14, cursor: 'pointer',
            }}
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '12px',
              background: 'rgba(216,90,48,0.15)', border: '1px solid rgba(216,90,48,0.4)',
              borderRadius: 'var(--radius-button)', color: 'var(--alert-warm)',
              fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            نعم، أبدأ من جديد
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: تحديث تاريخ البداية ───────────────────────────────────────────────

function DatePickerModal({
  current, onConfirm, onCancel,
}: {
  current: string;
  onConfirm: (date: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(current.split('T')[0]);
  const today = new Date().toISOString().split('T')[0];

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(10,26,26,0.85)',
        zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-mid)',
          borderRadius: 'var(--radius-card)',
          padding: '28px 24px',
          maxWidth: 340, width: '100%',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
        <h3
          style={{
            fontFamily: 'var(--font-display)', fontSize: 17,
            color: 'var(--text-primary)', marginBottom: 8,
          }}
        >
          متى بدأت رحلتك؟
        </h3>
        <p
          style={{
            fontFamily: 'var(--font-body)', fontSize: 13,
            color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.7,
          }}
        >
          يمكنك اختيار تاريخ في الماضي وسيُحدَّث العداد تلقائياً
        </p>
        <input
          type="date"
          value={value}
          max={today}
          onChange={(e) => setValue(e.target.value)}
          style={{
            width: '100%', padding: '12px 16px',
            background: 'var(--bg-input)', border: '1px solid var(--border-mid)',
            borderRadius: 'var(--radius-input)', color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)', fontSize: 15,
            marginBottom: 20, textAlign: 'center', direction: 'ltr',
          }}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '12px',
              background: 'var(--gold-faint)', border: '1px solid var(--border-mid)',
              borderRadius: 'var(--radius-button)', color: 'var(--text-secondary)',
              fontFamily: 'var(--font-body)', fontSize: 14, cursor: 'pointer',
            }}
          >
            إلغاء
          </button>
          <button
            onClick={() => value && onConfirm(value)}
            style={{
              flex: 1, padding: '12px',
              background: 'var(--gold-primary)', border: 'none',
              borderRadius: 'var(--radius-button)', color: 'var(--bg-deep)',
              fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Milestone Popup ──────────────────────────────────────────────────────────

function MilestonePopup({
  milestone, onClose,
}: {
  milestone: ReturnType<typeof getCurrentMilestone>;
  onClose: () => void;
}) {
  if (!milestone) return null;
  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(10,26,26,0.9)',
        zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: `1px solid ${milestone.color}40`,
          borderRadius: 'var(--radius-card)',
          padding: '32px 24px',
          maxWidth: 360, width: '100%',
          textAlign: 'center',
          boxShadow: `0 0 40px ${milestone.color}20`,
        }}
      >
        <div style={{ fontSize: 56, marginBottom: 12, animation: 'breathe 3s ease-in-out infinite' }}>
          {milestone.badge}
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: milestone.color, marginBottom: 6, fontWeight: 700 }}>
          {milestone.name}
        </h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 16 }}>
          {milestone.science}
        </p>
        <div
          style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-soft)',
            borderRadius: 12, padding: '14px 16px', marginBottom: 20,
          }}
        >
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--gold-primary)', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
            &ldquo;{milestone.quote}&rdquo;
          </p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-muted)', margin: '6px 0 0' }}>
            — {milestone.source}
          </p>
        </div>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20 }}>
          {milestone.motivation}
        </p>
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '14px',
            background: milestone.color, border: 'none',
            borderRadius: 'var(--radius-button)', color: 'var(--bg-deep)',
            fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}
        >
          شكراً — استمر 💪
        </button>
      </div>
    </div>
  );
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function StreakProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<StreakResponse | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showMilestonePopup, setShowMilestonePopup] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(() => {
    fetch('/api/streak', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: StreakResponse) => {
        setData(d);
        if (typeof d.days === 'number' && d.days > 0) {
          const key = `milestone_shown_${d.days}`;
          const milestone = getCurrentMilestone(d.days);
          if (milestone && milestone.days === d.days && !sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, '1');
            setShowMilestonePopup(true);
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const days = data?.days ?? 0;
  const streak = data?.streak ?? null;

  const milestones = [7, 14, 21, 30, 60, 90, 180, 365];
  const nextMilestone = milestones.find((m) => m > days) ?? 365;
  const progress = Math.min(days / nextMilestone, 1);
  const r = 62;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - progress * circumference;
  const remaining = Math.max(nextMilestone - days, 0);
  const pct = Math.round(progress * 100);

  const currentMilestone = getCurrentMilestone(days);
  const nextMilestoneData = getNextMilestone(days);
  const daysToNext = getDaysToNextMilestone(days);
  const showPre = shouldShowPreMessage(days);

  const handleReset = async () => {
    setLoading(true);
    setShowResetModal(false);
    try {
      await fetch('/api/streak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      fetchData();
    } catch {/**/} finally { setLoading(false); }
  };

  const handleUpdateDate = async (dateStr: string) => {
    setLoading(true);
    setShowDateModal(false);
    try {
      await fetch('/api/streak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateStartDate', startDate: dateStr }),
      });
      fetchData();
    } catch {/**/} finally { setLoading(false); }
  };

  const handleInsurance = async () => {
    if (!streak || streak.insuranceUsed) return;
    setLoading(true);
    try {
      await fetch('/api/streak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'useInsurance' }),
      });
      fetchData();
    } catch {/**/} finally { setLoading(false); }
  };

  return (
    <StreakCtx.Provider
      value={{
        data, days, streak,
        nextMilestone, progress, circumference, offset, remaining, pct,
        currentMilestone, nextMilestoneData, daysToNext, showPre,
        loading, setShowResetModal, setShowDateModal, handleInsurance,
      }}
    >
      {children}

      {showResetModal && (
        <ResetModal onConfirm={handleReset} onCancel={() => setShowResetModal(false)} />
      )}
      {showDateModal && streak && (
        <DatePickerModal
          current={streak.startDate}
          onConfirm={handleUpdateDate}
          onCancel={() => setShowDateModal(false)}
        />
      )}
      {showMilestonePopup && currentMilestone && (
        <MilestonePopup milestone={currentMilestone} onClose={() => setShowMilestonePopup(false)} />
      )}
    </StreakCtx.Provider>
  );
}

// ─── StreakHero: large centred ring + day counter ─────────────────────────────

export function StreakHero() {
  const { days, circumference, offset } = useStreak();

  return (
    <div style={{ position: 'relative', width: 160, height: 160 }}>
      {/* Breathing aura */}
      <div
        style={{
          position: 'absolute',
          inset: -16,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(46,190,128,.22) 0%, rgba(37,150,150,.08) 55%, transparent 72%)',
          animation: 'breathe 7s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />

      {/* Ring */}
      <svg
        width="160"
        height="160"
        viewBox="0 0 160 160"
        style={{ transform: 'rotate(-90deg)', display: 'block' }}
      >
        <defs>
          <linearGradient id="heroRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--gold-soft)" />
            <stop offset="100%" stopColor="var(--gold-deep)" />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle
          cx="80" cy="80" r="62"
          fill="var(--gold-faint)"
          stroke="var(--border-soft)"
          strokeWidth="8"
        />
        {/* Progress arc */}
        <circle
          cx="80" cy="80" r="62"
          fill="none"
          stroke="url(#heroRingGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            filter: 'drop-shadow(0 0 8px rgba(46,190,128,0.45))',
            transition: 'stroke-dashoffset 1.2s ease-out',
          }}
        />
      </svg>

      {/* Day counter */}
      <div
        style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 58,
            fontWeight: 800,
            color: 'var(--text-primary)',
            lineHeight: 1,
            letterSpacing: -1,
          }}
        >
          {toEnglishNumerals(days)}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 15,
            color: 'var(--gold-primary)',
            marginTop: 4,
            fontWeight: 600,
            letterSpacing: 0.5,
          }}
        >
          يوم
        </div>
      </div>
    </div>
  );
}

// ─── StreakMilestoneCard: progress + milestone + buttons ──────────────────────

export function StreakMilestoneCard() {
  const {
    days, streak, nextMilestone, remaining, pct,
    currentMilestone, nextMilestoneData, daysToNext, showPre,
    loading, setShowResetModal, setShowDateModal, handleInsurance,
  } = useStreak();

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-card)',
        padding: '18px 20px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      }}
    >
      {/* Milestone badge + name */}
      {currentMilestone && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 18 }}>{currentMilestone.badge}</span>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: currentMilestone.color,
              fontWeight: 700,
            }}
          >
            {currentMilestone.name}
          </span>
        </div>
      )}

      {/* Next milestone target */}
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 14,
          color: 'var(--text-primary)',
          fontWeight: 600,
          marginBottom: 4,
        }}
      >
        نحو محطة {toEnglishNumerals(nextMilestone)} يوم
      </div>
      <div
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 12,
          color: 'var(--text-secondary)',
          marginBottom: 10,
        }}
      >
        باقي {toEnglishNumerals(remaining)} {remaining === 1 ? 'يوم' : 'أيام'} · أنت في {toEnglishNumerals(pct)}%
      </div>

      {/* Progress bar */}
      <div style={{ height: 5, background: 'var(--gold-faint)', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: 'linear-gradient(90deg, var(--gold-deep), var(--gold-soft))',
            borderRadius: 3,
            transition: 'width 1s ease-out',
          }}
        />
      </div>

      {/* Pre-milestone message */}
      {showPre && nextMilestoneData && (
        <div
          style={{
            marginBottom: 12,
            padding: '10px 14px',
            background: `${nextMilestoneData.color}12`,
            border: `1px solid ${nextMilestoneData.color}30`,
            borderRadius: 10,
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
          }}
        >
          <span style={{ color: nextMilestoneData.color, fontWeight: 700 }}>
            {nextMilestoneData.badge} بعد {toEnglishNumerals(daysToNext)} {daysToNext === 1 ? 'يوم' : 'أيام'}:
          </span>{' '}
          {nextMilestoneData.preMessage}
        </div>
      )}

      {/* Insurance */}
      {streak && (
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={!streak.insuranceUsed ? handleInsurance : undefined}
            disabled={streak.insuranceUsed || loading}
            style={{
              background: streak.insuranceUsed ? 'rgba(107,128,128,0.1)' : 'rgba(167,139,250,0.1)',
              border: `1px solid ${streak.insuranceUsed ? 'var(--border-soft)' : 'rgba(167,139,250,0.3)'}`,
              borderRadius: 8,
              color: streak.insuranceUsed ? 'var(--text-muted)' : 'var(--accent-purple)',
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              padding: '6px 12px',
              cursor: streak.insuranceUsed ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            🛡️ {streak.insuranceUsed ? 'التأمين مستخدم' : 'تأمين متاح'}
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => setShowDateModal(true)}
          style={{
            flex: 1, padding: '8px',
            background: 'var(--gold-faint)', border: '1px solid var(--border-soft)',
            borderRadius: 10, color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)', fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          }}
        >
          📅 غيّر التاريخ
        </button>
        <button
          onClick={() => setShowResetModal(true)}
          style={{
            flex: 1, padding: '8px',
            background: 'rgba(216,90,48,0.06)', border: '1px solid rgba(216,90,48,0.2)',
            borderRadius: 10, color: 'var(--alert-warm)',
            fontFamily: 'var(--font-body)', fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          }}
        >
          🔄 بدأت من جديد
        </button>
      </div>
    </div>
  );
}

// ─── StreakCalendarSection: renders calendar when data is available ─────────

export function StreakCalendarSection() {
  const { data } = useStreak();
  if (!data?.allStreaks?.length) return null;
  return (
    <StreakCalendar streaks={data.allStreaks as Parameters<typeof StreakCalendar>[0]['streaks']} />
  );
}

// ─── Legacy export — kept so any remaining direct imports don't break ─────────

/** @deprecated Use StreakProvider + StreakHero + StreakMilestoneCard + StreakCalendarSection */
export function StreakCircle() {
  return (
    <StreakProvider>
      <StreakHero />
      <StreakMilestoneCard />
      <StreakCalendarSection />
    </StreakProvider>
  );
}
