'use client';

import { useRouter } from 'next/navigation';

export function ReportCard() {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push('/analysis')}
      role="button"
      tabIndex={0}
      aria-label="تقرير الأسبوع"
      onKeyDown={(e) => { if (e.key === 'Enter') router.push('/analysis'); }}
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border-mid)',
        borderRadius: 16,
        padding: '18px 20px',
        marginBottom: 18,
        cursor: 'pointer',
        transition: 'all 0.3s',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: 'rgba(107, 149, 201, 0.08)',
          border: '1px solid var(--therapy-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="var(--therapy)">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: "'Noto Naskh Arabic', serif",
            fontSize: 15,
            color: 'var(--ink-primary)',
            marginBottom: 3,
            fontWeight: 500,
          }}
        >
          تقرير الأسبوع
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--ink-muted)',
            lineHeight: 1.5,
          }}
        >
          تحليل سلوكي · أنماط وتوصيات
        </div>
      </div>
      <div style={{ color: 'var(--ink-faint)', fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}>
        →
      </div>
    </div>
  );
}
