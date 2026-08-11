'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toEnglishNumerals } from '@/lib/utils';
import { useStreak } from '@/components/home/StreakCircle';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tip {
  content: string;
  source: string;
  category: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'صباح الخير';
  if (h >= 12 && h < 17) return 'مساء النهار';
  return 'مساء الخير';
}

// ─── Large Presence Ring ──────────────────────────────────────────────────────

const RING_SIZE = 266;
const RING_R = 120;
const RING_STROKE = 3.5;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;

function PresenceRing({ days, progress }: { days: number; progress: number }) {
  const offset = RING_CIRCUMFERENCE - progress * RING_CIRCUMFERENCE;

  return (
    <div style={{ position: 'relative', width: RING_SIZE, height: RING_SIZE }}>
      {/* Outer aura */}
      <div
        style={{
          position: 'absolute',
          inset: -24,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(93,205,165,.18) 0%, rgba(55,110,200,.07) 55%, transparent 72%)',
          animation: 'breathe 7s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />

      {/* SVG ring */}
      <svg
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        style={{ transform: 'rotate(-90deg)', display: 'block' }}
      >
        <defs>
          <linearGradient id="presenceRingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5DCDA5" />
            <stop offset="50%" stopColor="#259696" />
            <stop offset="100%" stopColor="#376EC8" />
          </linearGradient>
        </defs>

        {/* Track */}
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_R}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={RING_STROKE}
        />

        {/* Progress arc */}
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_R}
          fill="none"
          stroke="url(#presenceRingGrad)"
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{
            filter: 'drop-shadow(0 0 8px rgba(93,205,165,0.5))',
            transition: 'stroke-dashoffset 1.4s ease-out',
          }}
        />
      </svg>

      {/* Center content */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 96,
            fontWeight: 800,
            color: '#EAF2EE',
            lineHeight: 1,
            letterSpacing: -4,
          }}
        >
          {toEnglishNumerals(days)}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 16,
            color: '#5DCDA5',
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

// ─── رسالة اليوم Card ─────────────────────────────────────────────────────────

function DailyTipCard({ tip }: { tip: Tip | null }) {
  return (
    <div
      style={{
        background: 'rgba(93,205,165,0.06)',
        border: '1px solid rgba(93,205,165,0.2)',
        borderRadius: 16,
        padding: '16px 18px',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'rgba(93,205,165,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: 18,
        }}
      >
        💬
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            color: '#5DCDA5',
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          رسالة اليوم
        </div>
        {tip ? (
          <>
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                color: 'var(--text-primary)',
                lineHeight: 1.8,
              }}
            >
              {tip.content}
            </div>
            {tip.source && (
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  marginTop: 6,
                }}
              >
                — {tip.source}
              </div>
            )}
          </>
        ) : (
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              color: 'var(--text-muted)',
              lineHeight: 1.8,
            }}
          >
            جارٍ التحميل...
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Streak Card (mini-ring) ──────────────────────────────────────────────────

const MINI_R = 28;
const MINI_CIRC = 2 * Math.PI * MINI_R;

function StreakCard({
  days,
  progress,
  nextMilestone,
  remaining,
  streak,
  onInsurance,
  loading,
}: {
  days: number;
  progress: number;
  nextMilestone: number;
  remaining: number;
  streak: { insuranceUsed: boolean } | null;
  onInsurance: () => void;
  loading: boolean;
}) {
  const miniOffset = MINI_CIRC - progress * MINI_CIRC;
  const dots = [0, 1, 2, 3, 4];
  const filled = streak?.insuranceUsed ? 0 : 1;

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-soft)',
        borderRadius: 16,
        padding: '16px 18px',
        display: 'flex',
        gap: 14,
        alignItems: 'center',
      }}
    >
      {/* Mini ring */}
      <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
        <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
          <defs>
            <linearGradient id="miniRingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#5DCDA5" />
              <stop offset="100%" stopColor="#376EC8" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r={MINI_R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
          <circle
            cx="32" cy="32" r={MINI_R}
            fill="none"
            stroke="url(#miniRingGrad)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={MINI_CIRC}
            strokeDashoffset={miniOffset}
            style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
          />
        </svg>
        <div
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 800,
              color: 'var(--text-primary)',
              lineHeight: 1,
            }}
          >
            {toEnglishNumerals(days)}
          </span>
        </div>
      </div>

      {/* Info */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 3,
          }}
        >
          {toEnglishNumerals(days)} يوم حضور متتالٍ
        </div>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            color: 'var(--text-secondary)',
            marginBottom: 8,
          }}
        >
          {toEnglishNumerals(remaining)} يوم حتى محطة {toEnglishNumerals(nextMilestone)}
        </div>

        {/* Protection dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-muted)' }}>حماية</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {dots.map((i) => (
              <div
                key={i}
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: i < filled ? '#5DCDA5' : 'rgba(255,255,255,0.12)',
                  border: `1px solid ${i < filled ? '#5DCDA5' : 'rgba(255,255,255,0.18)'}`,
                }}
              />
            ))}
          </div>
          {streak && !streak.insuranceUsed && (
            <button
              onClick={onInsurance}
              disabled={loading}
              style={{
                marginRight: 'auto',
                fontFamily: 'var(--font-body)',
                fontSize: 11,
                color: '#8B7EE8',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              تفعيل
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── مهمة اليوم Card (UI-only — no backend API yet) ──────────────────────────

function DailyTaskCard() {
  const [done, setDone] = useState(false);

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${done ? 'rgba(93,205,165,0.3)' : 'var(--border-soft)'}`,
        borderRadius: 16,
        padding: '16px 18px',
        display: 'flex',
        gap: 14,
        alignItems: 'center',
        transition: 'border-color 0.3s',
      }}
    >
      <button
        onClick={() => setDone((d) => !d)}
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: `2px solid ${done ? '#5DCDA5' : 'rgba(255,255,255,0.2)'}`,
          background: done ? 'rgba(93,205,165,0.15)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'all 0.3s',
          color: '#5DCDA5',
          fontSize: 14,
        }}
      >
        {done && '✓'}
      </button>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            color: 'var(--text-muted)',
            marginBottom: 3,
          }}
        >
          مهمة اليوم · دقيقة واحدة
        </div>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: done ? 'var(--text-secondary)' : 'var(--text-primary)',
            textDecoration: done ? 'line-through' : 'none',
            transition: 'all 0.3s',
          }}
        >
          خذ نفساً عميقاً واشكر لحظة واحدة
        </div>
        {/* NOTE: No API backend for daily tasks yet */}
      </div>
    </div>
  );
}

// ─── Day Note Card ────────────────────────────────────────────────────────────

function DayNoteCard({ days }: { days: number }) {
  return (
    <div
      style={{
        background: 'rgba(55,110,200,0.05)',
        border: '1px solid rgba(55,110,200,0.15)',
        borderRadius: 16,
        padding: '14px 18px',
        textAlign: 'center',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          color: 'var(--text-secondary)',
          lineHeight: 1.8,
        }}
      >
        أنت في يومك الـ{' '}
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 15,
            fontWeight: 700,
            color: '#5DCDA5',
          }}
        >
          {toEnglishNumerals(days)}
        </span>
        {' '}· كل يوم يُضاف إلى قصتك
      </span>
    </div>
  );
}

// ─── Main HomeClient Component ────────────────────────────────────────────────

export function HomeClient() {
  const {
    days, progress, nextMilestone, remaining, streak, loading, handleInsurance,
    setShowResetModal,
  } = useStreak();

  const [tip, setTip] = useState<Tip | null>(null);
  // Computed client-side only (post-mount) — this page is statically prerendered,
  // so a server-baked time-of-day greeting can disagree with the client's real
  // clock and trip a React hydration mismatch (error #418).
  const [greeting, setGreeting] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/tip')
      .then((r) => r.json())
      .then((d) => setTip(d?.tip ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  return (
    <>
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '20px 20px 0',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: 'var(--text-muted)',
              marginBottom: 4,
            }}
          >
            {greeting}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1.4,
            }}
          >
            أنت هنا، وهذا يكفي.
          </div>
        </div>

        {/* Mic button — links to voice log */}
        <button
          onClick={() => router.push('/entry?mode=voice')}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'rgba(93,205,165,0.1)',
            border: '1px solid rgba(93,205,165,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: 20,
            flexShrink: 0,
          }}
          aria-label="تسجيل صوتي"
        >
          🎙️
        </button>
      </div>

      {/* ── Presence ring ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 28,
          paddingBottom: 8,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            color: 'var(--text-muted)',
            marginBottom: 16,
            letterSpacing: 0.5,
          }}
        >
          أنت حاضرٌ منذ
        </div>

        <PresenceRing days={days} progress={progress} />

        {/* Under-ring text */}
        <div
          style={{
            marginTop: 20,
            textAlign: 'center',
            padding: '0 32px',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: 'var(--text-secondary)',
              lineHeight: 2,
            }}
          >
            كل يومٍ حضور، لا إنجاز.
            <br />
            يكفي أنك اخترت أن تبقى.
          </div>
          <button
            onClick={() => setShowResetModal(true)}
            style={{
              marginTop: 10,
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              color: 'var(--text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
              padding: 0,
            }}
          >
            بدأتُ من جديد؟
          </button>
        </div>
      </div>

      {/* ── Cards ── */}
      <div
        className="home-stagger"
        style={{
          padding: '16px 20px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {/* 1. رسالة اليوم */}
        <DailyTipCard tip={tip} />

        {/* 2. Streak card */}
        <StreakCard
          days={days}
          progress={progress}
          nextMilestone={nextMilestone}
          remaining={remaining}
          streak={streak}
          onInsurance={handleInsurance}
          loading={loading}
        />

        {/* 3. مهمة اليوم (UI-only — no /api/tasks yet) */}
        <DailyTaskCard />

        {/* 4. Day note */}
        <DayNoteCard days={days} />

        {/* 5. سجّل لحظة */}
        <Link href="/entry" style={{ textDecoration: 'none' }}>
          <div
            style={{
              border: '1.5px solid rgba(93,205,165,0.35)',
              borderRadius: 16,
              padding: '15px 20px',
              textAlign: 'center',
              background: 'rgba(93,205,165,0.04)',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 15,
                fontWeight: 600,
                color: '#5DCDA5',
              }}
            >
              + سجّل لحظة
            </span>
          </div>
        </Link>

        {/* 6. أنماطي */}
        <Link href="/analysis" style={{ textDecoration: 'none' }}>
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-soft)',
              borderRadius: 16,
              padding: '15px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: 2,
                }}
              >
                أنماطي
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                }}
              >
                ما يكشفه سجلّك
              </div>
            </div>
            <div
              style={{
                fontSize: 18,
                color: 'var(--text-muted)',
                transform: 'scaleX(-1)',
              }}
            >
              ›
            </div>
          </div>
        </Link>

        {/* 7. سجّلت انتكاسة */}
        <button
          onClick={() => setShowResetModal(true)}
          style={{
            width: '100%',
            padding: '14px 20px',
            background: 'rgba(216,90,48,0.05)',
            border: '1px solid rgba(216,90,48,0.15)',
            borderRadius: 16,
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--text-muted)',
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          سجّلت انتكاسة
        </button>
      </div>
    </>
  );
}
