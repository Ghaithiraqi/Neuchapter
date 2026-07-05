'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

      {/* الجانب الأيسر: المكتبة + الإعدادات + القفل */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

      {/* زر المكتبة */}
      <Link
        href="/library"
        aria-label="المكتبة"
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'var(--gold-faint)',
          border: '1px solid var(--border-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          textDecoration: 'none',
          transition: 'all 0.3s ease',
        }}
      >
        <svg
          width="15"
          height="15"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="var(--text-muted)"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
          />
        </svg>
      </Link>

      {/* زر الإعدادات */}
      <Link
        href="/settings"
        aria-label="الإعدادات"
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'var(--gold-faint)',
          border: '1px solid var(--border-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          textDecoration: 'none',
          transition: 'all 0.3s ease',
        }}
      >
        <svg
          width="15"
          height="15"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="var(--text-muted)"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </Link>

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

      </div>{/* end right cluster */}
    </div>
  );
}
