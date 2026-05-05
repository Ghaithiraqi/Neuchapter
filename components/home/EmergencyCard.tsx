'use client';

import { useRouter } from 'next/navigation';
import { LTR } from '@/components/shared/LTR';

export function EmergencyCard() {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push('/sos')}
      role="button"
      tabIndex={0}
      aria-label="بروتوكول الطوارئ"
      onKeyDown={(e) => { if (e.key === 'Enter') router.push('/sos'); }}
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--alert-soft)',
        borderRadius: 16,
        padding: '18px 20px',
        marginBottom: 18,
        cursor: 'pointer',
        transition: 'all 0.3s',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* الخط الجانبي */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 3,
          height: '100%',
          background: 'var(--alert-warm)',
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              color: 'var(--alert-warm)',
              letterSpacing: 2,
              marginBottom: 6,
            }}
          >
            <LTR>PROTOCOL · SOS</LTR>
          </div>
          <div
            style={{
              fontFamily: "'Noto Naskh Arabic', serif",
              fontSize: 16,
              color: 'var(--ink-primary)',
              fontWeight: 500,
            }}
          >
            لحظة صعبة الآن
          </div>
        </div>

        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '1.5px solid var(--alert-warm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(201, 152, 120, 0.05)',
          }}
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="var(--alert-warm)">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
