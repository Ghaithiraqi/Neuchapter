'use client';

import { useEffect, useState } from 'react';
import { toArabicNumerals } from '@/lib/utils';

export function StreakCircle() {
  const [days, setDays] = useState(0);

  useEffect(() => {
    fetch('/api/streak')
      .then((r) => r.json())
      .then((d) => { if (typeof d.days === 'number') setDays(d.days); })
      .catch(() => {});
  }, []);

  const milestones = [7, 14, 21, 30, 60, 90, 180, 365];
  const nextMilestone = milestones.find((m) => m > days) ?? 365;
  const prevMilestone = milestones.filter((m) => m <= days).pop() ?? 0;
  const progress = (days - prevMilestone) / (nextMilestone - prevMilestone);

  const r = 34;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - progress * circumference;
  const remaining = nextMilestone - days;
  const pct = Math.round(progress * 100);

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-card)',
        padding: '20px 22px',
        marginBottom: 18,
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      }}
    >
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
            cx="40"
            cy="40"
            r={r}
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
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 26,
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1,
            }}
          >
            {toArabicNumerals(days)}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 10,
              color: 'var(--gold-primary)',
              marginTop: 2,
            }}
          >
            يوم
          </div>
        </div>
      </div>

      {/* النص الجانبي */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 15,
            color: 'var(--text-primary)',
            fontWeight: 600,
            marginBottom: 6,
            lineHeight: 1.4,
          }}
        >
          نحو محطة {toArabicNumerals(nextMilestone)} يوم
        </div>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            color: 'var(--text-secondary)',
            marginBottom: 12,
          }}
        >
          باقي {toArabicNumerals(remaining)} {remaining === 1 ? 'يوم' : 'أيام'} · أنت في {toArabicNumerals(pct)}٪
        </div>

        {/* شريط التقدم */}
        <div
          style={{
            height: 4,
            background: 'var(--gold-faint)',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
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
      </div>
    </div>
  );
}
