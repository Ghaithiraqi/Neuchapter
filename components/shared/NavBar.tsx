'use client';

import { useRouter } from 'next/navigation';

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
        padding: '16px 20px',
        height: 64,
        background: 'var(--bg-deep)',
        position: 'relative',
        zIndex: 2,
      }}
    >
      {/* شعار + اسم */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 30,
            height: 30,
            border: '1.5px solid var(--gold-primary)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--gold-faint)',
          }}
        >
          <div
            style={{
              width: 9,
              height: 9,
              background: 'var(--gold-primary)',
              borderRadius: '50%',
            }}
          />
        </div>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 20,
            color: 'var(--text-primary)',
            letterSpacing: 0.5,
          }}
        >
          جددني
        </span>
      </div>

      {/* زر القفل الدائري */}
      <button
        onClick={handleLock}
        aria-label="قفل التطبيق"
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'var(--gold-faint)',
          border: '1px solid var(--border-mid)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
        }}
      >
        <svg
          width="15"
          height="15"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="var(--text-secondary)"
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
