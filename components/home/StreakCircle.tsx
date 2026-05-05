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

  // حساب التقدم نحو أقرب محطة
  const milestones = [7, 14, 21, 30, 60, 90, 180, 365];
  const nextMilestone = milestones.find((m) => m > days) ?? 365;
  const prevMilestone = milestones.filter((m) => m <= days).pop() ?? 0;
  const progress = (days - prevMilestone) / (nextMilestone - prevMilestone);

  const circumference = 2 * Math.PI * 54; // r=54
  const offset = circumference - progress * circumference;
  const remaining = nextMilestone - days;
  const pct = Math.round(progress * 100);

  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border-mid)',
        borderRadius: 24,
        padding: '28px 20px',
        marginBottom: 18,
        display: 'flex',
        alignItems: 'center',
        gap: 22,
      }}
    >
      {/* الدائرة */}
      <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
        <svg width="130" height="130" viewBox="0 0 130 130" style={{ transform: 'rotate(-90deg)' }}>
          <defs>
            <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8FB3DE" />
              <stop offset="100%" stopColor="#4A6E9E" />
            </linearGradient>
          </defs>
          <circle cx="65" cy="65" r="54" fill="none" stroke="var(--card-bg-soft)" strokeWidth="8" />
          <circle
            cx="65"
            cy="65"
            r="54"
            fill="none"
            stroke="url(#blueGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              filter: 'drop-shadow(0 0 8px var(--therapy-blue-glow))',
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
              fontFamily: "'Amiri', serif",
              fontSize: 44,
              fontWeight: 700,
              color: 'var(--ink-primary)',
              lineHeight: 1,
            }}
          >
            {toArabicNumerals(days)}
          </div>
          <div
            style={{
              fontFamily: "'Noto Naskh Arabic', serif",
              fontSize: 12,
              color: 'var(--therapy-blue-bright)',
              marginTop: 4,
              fontWeight: 500,
            }}
          >
            يوم نقاء
          </div>
        </div>
      </div>

      {/* المعلومات */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: 'var(--ink-muted)',
            letterSpacing: 1.5,
            marginBottom: 8,
          }}
        >
          نحو المحطة القادمة
        </div>
        <div
          style={{
            fontFamily: "'Noto Naskh Arabic', serif",
            fontSize: 16,
            color: 'var(--ink-primary)',
            fontWeight: 500,
            marginBottom: 12,
            lineHeight: 1.4,
          }}
        >
          {toArabicNumerals(pct)}٪ نحو محطة {toArabicNumerals(nextMilestone)} يوم
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: "'Amiri', serif",
                fontSize: 20,
                color: 'var(--therapy-blue-bright)',
                fontWeight: 700,
                lineHeight: 1,
                marginBottom: 4,
              }}
            >
              {toArabicNumerals(remaining)}
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                color: 'var(--ink-muted)',
                letterSpacing: 0.5,
              }}
            >
              يوم متبقي
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: "'Amiri', serif",
                fontSize: 20,
                color: 'var(--therapy-blue-bright)',
                fontWeight: 700,
                lineHeight: 1,
                marginBottom: 4,
              }}
            >
              {toArabicNumerals(nextMilestone)}
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                color: 'var(--ink-muted)',
                letterSpacing: 0.5,
              }}
            >
              الهدف القادم
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
