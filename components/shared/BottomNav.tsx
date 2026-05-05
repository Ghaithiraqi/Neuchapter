'use client';

import { usePathname, useRouter } from 'next/navigation';
import { LTR } from './LTR';

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const items = [
    {
      label: 'HOME',
      path: '/',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" width="20" height="20">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
    },
    {
      label: 'REPORT',
      path: '/analysis',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" width="20" height="20">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
    },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 420,
        background: 'rgba(5, 8, 17, 0.92)',
        backdropFilter: 'blur(24px)',
        borderTop: '1px solid var(--border-mid)',
        padding: '10px 24px 22px',
        display: 'flex',
        justifyContent: 'space-around',
        zIndex: 10,
      }}
    >
      {items.map((item) => {
        const isActive = pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            aria-label={item.label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 5,
              cursor: 'pointer',
              padding: '8px 14px',
              background: 'none',
              border: 'none',
              position: 'relative',
              color: isActive ? 'var(--therapy-blue)' : 'var(--ink-muted)',
              transition: 'all 0.2s',
            }}
          >
            {isActive && (
              <div
                style={{
                  position: 'absolute',
                  top: -8,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 24,
                  height: 2,
                  background: 'var(--therapy-blue)',
                  borderRadius: 2,
                }}
              />
            )}
            {item.icon}
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                letterSpacing: 0.5,
              }}
            >
              <LTR>{item.label}</LTR>
            </span>
          </button>
        );
      })}
    </div>
  );
}
