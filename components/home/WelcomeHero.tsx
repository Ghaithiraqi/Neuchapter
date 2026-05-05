'use client';

import { useEffect, useState } from 'react';
import { getGreeting, formatArabicDate, toArabicNumerals } from '@/lib/utils';

interface Tip {
  content: string;
  source: string;
}

const DEFAULT_TIP: Tip = {
  content: 'الدماغ في الصباح أصفى ٣ مرات. اجعل أصعب قرار اليوم في أول ساعتين بعد الاستيقاظ.',
  source: 'مبدأ CBT · علم الأعصاب السلوكي',
};

export function WelcomeHero() {
  const [tip, setTip] = useState<Tip>(DEFAULT_TIP);
  const [dayNum, setDayNum] = useState(0);
  const [greeting, setGreeting] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const now = new Date();
    setGreeting(getGreeting(now.getHours()));
    setDateStr(formatArabicDate(now));

    fetch('/api/tip')
      .then((r) => r.json())
      .then((d) => { if (d.tip) setTip(d.tip); })
      .catch(() => {});

    fetch('/api/streak')
      .then((r) => r.json())
      .then((d) => { if (typeof d.days === 'number') setDayNum(d.days); })
      .catch(() => {});
  }, []);

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-card)',
        padding: '22px 20px',
        marginTop: 20,
        marginBottom: 18,
        position: 'relative',
        overflow: 'hidden',
        animation: 'fadeIn 0.6s ease',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      }}
    >
      {/* وهج ذهبي خفيف في الزاوية */}
      <div
        style={{
          position: 'absolute',
          top: '-40%',
          right: '-20%',
          width: 260,
          height: 260,
          background: 'radial-gradient(circle, rgba(232, 184, 114, 0.06) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />

      {/* الصف العلوي: التحية + أيقونة البروفايل */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 16,
          position: 'relative',
        }}
      >
        <div>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: 'var(--text-secondary)',
              marginBottom: 4,
              fontWeight: 400,
            }}
          >
            {greeting}
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 28,
              color: 'var(--text-primary)',
              fontWeight: 700,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            غيث
          </h2>
        </div>

        {/* أيقونة البروفايل */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'var(--gold-faint)',
            border: '1px solid var(--border-mid)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="var(--gold-primary)">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </div>
      </div>

      {/* شريط التاريخ + عداد الأيام */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          position: 'relative',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            color: 'var(--text-muted)',
          }}
        >
          {dateStr}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 12,
            color: 'var(--gold-primary)',
            padding: '3px 12px',
            border: '1px solid var(--border-mid)',
            borderRadius: 'var(--radius-button)',
            background: 'var(--gold-faint)',
          }}
        >
          اليوم {toArabicNumerals(dayNum)}
        </span>
      </div>

      {/* فاصل */}
      <div
        style={{
          height: 1,
          background: 'linear-gradient(90deg, transparent, var(--border-mid), transparent)',
          marginBottom: 16,
          position: 'relative',
        }}
      />

      {/* بطاقة نصيحة اليوم */}
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-soft)',
          borderRadius: 'var(--radius-small)',
          padding: '14px 16px',
          position: 'relative',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            color: 'var(--gold-primary)',
            fontWeight: 600,
            letterSpacing: 0.5,
            marginBottom: 8,
          }}
        >
          نصيحة اليوم
        </p>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 15,
            color: 'var(--text-primary)',
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          {tip.content}
        </p>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            color: 'var(--text-muted)',
            marginTop: 10,
            marginBottom: 0,
          }}
        >
          — {tip.source}
        </p>
      </div>
    </div>
  );
}
