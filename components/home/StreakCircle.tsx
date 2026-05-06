'use client';

import { useCallback, useEffect, useState } from 'react';
import { toArabicNumerals } from '@/lib/utils';
import {
  getCurrentMilestone,
  getNextMilestone,
  getDaysToNextMilestone,
  shouldShowPreMessage,
} from '@/lib/milestones';
import { StreakCalendar } from './StreakCalendar';

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

// ─── Modal تأكيد الإعادة ─────────────────────────────────────────────────────

function ResetModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10,26,26,0.85)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-mid)',
          borderRadius: 'var(--radius-card)',
          padding: '28px 24px',
          maxWidth: 340,
          width: '100%',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 12 }}>🔄</div>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            color: 'var(--text-primary)',
            marginBottom: 10,
            lineHeight: 1.5,
          }}
        >
          هل تريد تصفير العداد؟
        </h3>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            color: 'var(--text-secondary)',
            lineHeight: 1.8,
            marginBottom: 24,
          }}
        >
          سيُحفظ الـ streak الحالي كسجل في التاريخ ويبدأ عداد جديد من اليوم.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '12px',
              background: 'var(--gold-faint)',
              border: '1px solid var(--border-mid)',
              borderRadius: 'var(--radius-button)',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '12px',
              background: 'rgba(216,90,48,0.15)',
              border: '1px solid rgba(216,90,48,0.4)',
              borderRadius: 'var(--radius-button)',
              color: 'var(--alert-warm)',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            نعم، أبدأ من جديد
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal تحديث تاريخ البداية ───────────────────────────────────────────────

function DatePickerModal({
  current,
  onConfirm,
  onCancel,
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
        position: 'fixed',
        inset: 0,
        background: 'rgba(10,26,26,0.85)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-mid)',
          borderRadius: 'var(--radius-card)',
          padding: '28px 24px',
          maxWidth: 340,
          width: '100%',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 17,
            color: 'var(--text-primary)',
            marginBottom: 8,
          }}
        >
          متى بدأت رحلتك؟
        </h3>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            color: 'var(--text-secondary)',
            marginBottom: 20,
            lineHeight: 1.7,
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
            width: '100%',
            padding: '12px 16px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-mid)',
            borderRadius: 'var(--radius-input)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)',
            fontSize: 15,
            marginBottom: 20,
            textAlign: 'center',
            direction: 'ltr',
          }}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '12px',
              background: 'var(--gold-faint)',
              border: '1px solid var(--border-mid)',
              borderRadius: 'var(--radius-button)',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            إلغاء
          </button>
          <button
            onClick={() => value && onConfirm(value)}
            style={{
              flex: 1,
              padding: '12px',
              background: 'var(--gold-primary)',
              border: 'none',
              borderRadius: 'var(--radius-button)',
              color: '#1A3D3D',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
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
  milestone,
  onClose,
}: {
  milestone: ReturnType<typeof getCurrentMilestone>;
  onClose: () => void;
}) {
  if (!milestone) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10,26,26,0.9)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: `1px solid ${milestone.color}40`,
          borderRadius: 'var(--radius-card)',
          padding: '32px 24px',
          maxWidth: 360,
          width: '100%',
          textAlign: 'center',
          boxShadow: `0 0 40px ${milestone.color}20`,
        }}
      >
        <div
          style={{
            fontSize: 56,
            marginBottom: 12,
            animation: 'breathe 3s ease-in-out infinite',
          }}
        >
          {milestone.badge}
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            color: milestone.color,
            marginBottom: 6,
            fontWeight: 700,
          }}
        >
          {milestone.name}
        </h2>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--text-secondary)',
            lineHeight: 1.8,
            marginBottom: 16,
          }}
        >
          {milestone.science}
        </p>
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border-soft)',
            borderRadius: 12,
            padding: '14px 16px',
            marginBottom: 20,
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: 'var(--gold-primary)',
              lineHeight: 1.7,
              margin: 0,
              fontStyle: 'italic',
            }}
          >
            &ldquo;{milestone.quote}&rdquo;
          </p>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 10,
              color: 'var(--text-muted)',
              marginTop: 6,
              margin: '6px 0 0',
            }}
          >
            — {milestone.source}
          </p>
        </div>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
            marginBottom: 20,
          }}
        >
          {milestone.motivation}
        </p>
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '14px',
            background: milestone.color,
            border: 'none',
            borderRadius: 'var(--radius-button)',
            color: '#1A3D3D',
            fontFamily: 'var(--font-body)',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          شكراً — استمر 💪
        </button>
      </div>
    </div>
  );
}

// ─── الـ Component الرئيسي ────────────────────────────────────────────────────

export function StreakCircle() {
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
        // تحقق من الوصول لمحطة جديدة
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
  const r = 34;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - progress * circumference;
  const remaining = Math.max(nextMilestone - days, 0);
  const pct = Math.round(progress * 100);

  const currentMilestone = getCurrentMilestone(days);
  const nextMilestoneData = getNextMilestone(days);
  const daysToNext = getDaysToNextMilestone(days);
  const showPre = shouldShowPreMessage(days);

  // ─── Reset ────────────────────────────────────────────────────────────────
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

  // ─── Update Start Date ────────────────────────────────────────────────────
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

  // ─── Insurance ────────────────────────────────────────────────────────────
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
    <>
      {/* ─── الدائرة الرئيسية ─────────────────────────────────────────────── */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-soft)',
          borderRadius: 'var(--radius-card)',
          padding: '20px 22px',
          marginBottom: 18,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* الدائرة */}
          <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
            <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
              <defs>
                <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--gold-soft)" />
                  <stop offset="100%" stopColor="var(--gold-deep)" />
                </linearGradient>
              </defs>
              <circle cx="40" cy="40" r={r} fill="var(--gold-faint)" stroke="var(--border-soft)" strokeWidth="6" />
              <circle
                cx="40" cy="40" r={r}
                fill="none"
                stroke="url(#goldGradient)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{
                  filter: 'drop-shadow(0 0 6px rgba(232, 184, 114, 0.4))',
                  transition: 'stroke-dashoffset 1s ease-out',
                }}
              />
            </svg>
            <div
              style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                {toArabicNumerals(days)}
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--gold-primary)', marginTop: 2 }}>
                يوم
              </div>
            </div>
          </div>

          {/* النص الجانبي */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* اسم المحطة الحالية */}
            {currentMilestone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 16 }}>{currentMilestone.badge}</span>
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 12,
                    color: currentMilestone.color,
                    fontWeight: 600,
                  }}
                >
                  {currentMilestone.name}
                </span>
              </div>
            )}

            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4, lineHeight: 1.4 }}>
              نحو محطة {toArabicNumerals(nextMilestone)} يوم
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
              باقي {toArabicNumerals(remaining)} {remaining === 1 ? 'يوم' : 'أيام'} · أنت في {toArabicNumerals(pct)}٪
            </div>

            {/* شريط التقدم */}
            <div style={{ height: 4, background: 'var(--gold-faint)', borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: 'linear-gradient(90deg, var(--gold-deep), var(--gold-soft))',
                  borderRadius: 2,
                  transition: 'width 1s ease-out',
                }}
              />
            </div>

            {/* التأمين */}
            {streak && (
              <button
                onClick={!streak.insuranceUsed ? handleInsurance : undefined}
                disabled={streak.insuranceUsed || loading}
                style={{
                  background: streak.insuranceUsed ? 'rgba(107,128,128,0.1)' : 'rgba(167,139,250,0.1)',
                  border: `1px solid ${streak.insuranceUsed ? 'var(--border-soft)' : 'rgba(167,139,250,0.3)'}`,
                  borderRadius: 8,
                  color: streak.insuranceUsed ? 'var(--text-muted)' : '#A78BFA',
                  fontFamily: 'var(--font-body)',
                  fontSize: 11,
                  padding: '4px 10px',
                  cursor: streak.insuranceUsed ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                🛡️ {streak.insuranceUsed ? 'التأمين مستخدم' : 'تأمين متاح'}
              </button>
            )}
          </div>
        </div>

        {/* رسالة ما قبل المحطة */}
        {showPre && nextMilestoneData && (
          <div
            style={{
              marginTop: 14,
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
              {nextMilestoneData.badge} بعد {toArabicNumerals(daysToNext)} {daysToNext === 1 ? 'يوم' : 'أيام'}:
            </span>{' '}
            {nextMilestoneData.preMessage}
          </div>
        )}

        {/* أزرار الإجراءات */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button
            onClick={() => setShowDateModal(true)}
            style={{
              flex: 1,
              padding: '8px',
              background: 'var(--gold-faint)',
              border: '1px solid var(--border-soft)',
              borderRadius: 10,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            📅 غيّر التاريخ
          </button>
          <button
            onClick={() => setShowResetModal(true)}
            style={{
              flex: 1,
              padding: '8px',
              background: 'rgba(216,90,48,0.06)',
              border: '1px solid rgba(216,90,48,0.2)',
              borderRadius: 10,
              color: 'var(--alert-warm)',
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            🔄 بدأت من جديد
          </button>
        </div>
      </div>

      {/* ─── التقويم ──────────────────────────────────────────────────────── */}
      {data?.allStreaks && data.allStreaks.length > 0 && (
        <StreakCalendar streaks={data.allStreaks as Parameters<typeof StreakCalendar>[0]['streaks']} />
      )}

      {/* ─── Modals ────────────────────────────────────────────────────────── */}
      {showResetModal && (
        <ResetModal
          onConfirm={handleReset}
          onCancel={() => setShowResetModal(false)}
        />
      )}
      {showDateModal && streak && (
        <DatePickerModal
          current={streak.startDate}
          onConfirm={handleUpdateDate}
          onCancel={() => setShowDateModal(false)}
        />
      )}
      {showMilestonePopup && currentMilestone && (
        <MilestonePopup
          milestone={currentMilestone}
          onClose={() => setShowMilestonePopup(false)}
        />
      )}
    </>
  );
}
