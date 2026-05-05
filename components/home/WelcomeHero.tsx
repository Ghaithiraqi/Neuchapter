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

    // جلب نصيحة اليوم
    fetch('/api/tip')
      .then((r) => r.json())
      .then((d) => { if (d.tip) setTip(d.tip); })
      .catch(() => {});

    // جلب عداد الأيام
    fetch('/api/streak')
      .then((r) => r.json())
      .then((d) => { if (typeof d.days === 'number') setDayNum(d.days); })
      .catch(() => {});
  }, []);

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--card-bg-elevated) 100%)',
        border: '1px solid var(--border-mid)',
        borderRadius: 24,
        padding: '28px 24px',
        marginTop: 20,
        marginBottom: 18,
        position: 'relative',
        overflow: 'hidden',
        animation: 'fadeIn 0.6s ease',
      }}
    >
      {/* وهج */}
      <div
        style={{
          position: 'absolute',
          top: '-50%',
          right: '-30%',
          width: 300,
          height: 300,
          background: 'radial-gradient(circle, var(--therapy-blue-glow) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 18,
          position: 'relative',
        }}
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: 'var(--ink-muted)',
            letterSpacing: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              background: 'var(--therapy-blue)',
              borderRadius: '50%',
              display: 'inline-block',
            }}
          />
          {dateStr}
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: 'var(--therapy-blue-bright)',
            letterSpacing: 1,
            padding: '4px 10px',
            border: '1px solid var(--therapy-blue-soft)',
            borderRadius: 6,
            background: 'rgba(107, 149, 201, 0.05)',
          }}
        >
          اليوم {toArabicNumerals(dayNum)}
        </div>
      </div>

      <div
        style={{
          fontFamily: "'Noto Naskh Arabic', serif",
          fontSize: 26,
          color: 'var(--ink-primary)',
          fontWeight: 700,
          lineHeight: 1.4,
          marginBottom: 4,
          position: 'relative',
        }}
      >
        {greeting}، <span style={{ color: 'var(--therapy-blue-bright)' }}>غيث</span>
      </div>

      <div
        style={{
          height: 1,
          background: 'linear-gradient(90deg, transparent, var(--border-mid), transparent)',
          margin: '20px 0 18px',
          position: 'relative',
        }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          color: 'var(--therapy-blue-bright)',
          letterSpacing: 1.5,
          marginBottom: 10,
        }}
      >
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="var(--therapy-blue-bright)">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        نصيحة اليوم
      </div>

      <p
        style={{
          fontFamily: "'Amiri', serif",
          fontSize: 17,
          color: 'var(--ink-primary)',
          lineHeight: 1.7,
          fontStyle: 'italic',
          position: 'relative',
        }}
      >
        {tip.content}
      </p>

      <p
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          color: 'var(--ink-muted)',
          letterSpacing: 1,
          marginTop: 12,
          position: 'relative',
        }}
      >
        — {tip.source}
      </p>
    </div>
  );
}
