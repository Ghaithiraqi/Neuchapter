'use client';

import { useRouter } from 'next/navigation';

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
        background: 'linear-gradient(135deg, rgba(216, 90, 48, 0.08) 0%, rgba(216, 90, 48, 0.04) 100%)',
        border: '0.5px solid rgba(216, 90, 48, 0.3)',
        borderRadius: 'var(--radius-card)',
        padding: '18px 20px',
        marginBottom: 18,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      }}
    >
      <div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            color: 'var(--alert-warm)',
            fontWeight: 600,
            marginBottom: 4,
          }}
        >
          لحظة صعبة الآن
        </div>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            color: 'var(--text-secondary)',
          }}
        >
          تنفّس · تكلّم · امضِ
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
          background: 'rgba(216, 90, 48, 0.08)',
          flexShrink: 0,
        }}
      >
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="var(--alert-warm)">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
    </div>
  );
}
