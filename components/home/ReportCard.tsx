'use client';

import { useRouter } from 'next/navigation';

export function ReportCard() {
  const router = useRouter();

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-mid)',
        borderRadius: 'var(--radius-card)',
        padding: '20px 22px',
        marginBottom: 18,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 'var(--radius-small)',
            background: 'var(--gold-faint)',
            border: '1px solid var(--border-mid)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="var(--gold-primary)">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        </div>
        <div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 17,
              color: 'var(--text-primary)',
              fontWeight: 700,
              marginBottom: 3,
            }}
          >
            تقرير الأسبوع
          </div>
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: 'var(--text-secondary)',
            }}
          >
            تحليل سلوكي · أنماط وتوصيات
          </div>
        </div>
      </div>

      <button
        onClick={() => router.push('/analysis')}
        aria-label="اعرض التقرير"
        style={{
          width: '100%',
          padding: '11px',
          background: 'var(--gold-primary)',
          border: 'none',
          borderRadius: 'var(--radius-button)',
          color: '#1A3D3D',
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
        }}
      >
        اعرض التقرير
      </button>
    </div>
  );
}
