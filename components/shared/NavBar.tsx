'use client';

import { useRouter } from 'next/navigation';
import { LTR } from './LTR';

export function NavBar() {
  const router = useRouter();

  const handleLock = async () => {
    await fetch('/api/auth/lock', { method: 'POST' });
    router.push('/unlock');
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '22px 24px 14px',
        position: 'relative',
        zIndex: 2,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 28,
            height: 28,
            border: '1.5px solid var(--therapy-blue)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--card-bg)',
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              background: 'var(--therapy-blue)',
              borderRadius: '50%',
            }}
          />
        </div>
        <div>
          <div
            style={{
              fontFamily: "'Noto Naskh Arabic', serif",
              fontWeight: 700,
              fontSize: 18,
              color: 'var(--ink-primary)',
            }}
          >
            جددني
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: 'var(--ink-muted)',
              letterSpacing: 1,
            }}
          >
            <LTR>SESSION · ACTIVE</LTR>
          </div>
        </div>
      </div>

      <button
        onClick={handleLock}
        aria-label="قفل التطبيق"
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: 'var(--card-bg)',
          border: '1px solid var(--border-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s',
        }}
      >
        <svg
          width="16"
          height="16"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="var(--ink-secondary)"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
          />
        </svg>
      </button>
    </div>
  );
}
