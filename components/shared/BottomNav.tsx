'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

// ─── Nav items (excluding centre) ────────────────────────────────────────────

const LEFT_ITEMS = [
  {
    label: 'الرئيسية',
    path: '/',
    icon: (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" width="22" height="22">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    label: 'السجل',
    path: '/journal',
    icon: (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" width="22" height="22">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
];

const RIGHT_ITEMS = [
  {
    label: 'التحليل',
    path: '/analysis',
    icon: (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" width="22" height="22">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    label: 'رحلتي',
    path: '/settings',
    icon: (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" width="22" height="22">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
];

// ─── NavButton ────────────────────────────────────────────────────────────────

function NavButton({
  label, path, icon, isActive,
}: {
  label: string;
  path: string;
  icon: React.ReactNode;
  isActive: boolean;
}) {
  return (
    <Link
      href={path}
      aria-label={label}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        padding: '8px 10px',
        color: isActive ? '#5DCDA5' : 'var(--text-muted)',
        textDecoration: 'none',
        flex: 1,
        transition: 'color 0.2s',
      }}
    >
      {icon}
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 10,
          fontWeight: isActive ? 700 : 400,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </Link>
  );
}

// ─── BottomNav ────────────────────────────────────────────────────────────────

export function BottomNav() {
  const pathname = usePathname();
  const barRef = useRef<HTMLDivElement>(null);

  // Measure the real height of the entire fixed block and write it to a CSS
  // custom property so layout.tsx can consume it as exact padding-bottom.
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;

    const update = () => {
      document.documentElement.style.setProperty(
        '--bottom-bar-height',
        `${el.offsetHeight}px`,
      );
    };

    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function isActive(path: string) {
    return path === '/' ? pathname === '/' : pathname.startsWith(path);
  }

  return (
    <div
      ref={barRef}
      style={{
        position: 'fixed', /* bottombar-ok: the one allowed page-chrome fixed element */
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 420,
        zIndex: 100,
      }}
    >
      {/* ── Gradient fade — prevents content showing raw under the pill ── */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: '100%',
          left: 0,
          right: 0,
          height: 40,
          background: 'linear-gradient(to bottom, transparent, #111626)',
          pointerEvents: 'none',
        }}
      />

      {/* ── SOS pill ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          paddingBottom: 8,
          background: '#111626',
        }}
      >
        <Link
          href="/sos"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '11px 22px',
            minHeight: 44,
            background: 'rgba(93,205,165,0.08)',
            border: '1px solid rgba(93,205,165,0.3)',
            borderRadius: 22,
            textDecoration: 'none',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#5DCDA5',
              boxShadow: '0 0 10px rgba(93,205,165,0.8)',
              animation: 'ncBreathe 3.4s ease-in-out infinite',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontWeight: 500,
              color: '#5DCDA5',
              whiteSpace: 'nowrap',
            }}
          >
            لحظة صعبة؟ أنا هنا
          </span>
        </Link>
      </div>

      {/* ── Nav bar ── */}
      <div
        style={{
          background: 'rgba(17,22,38,0.98)',
          borderTop: '1px solid var(--border-soft)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          paddingTop: 6,
          paddingLeft: 4,
          paddingRight: 4,
          paddingBottom: 'calc(6px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* Left two items */}
        {LEFT_ITEMS.map((item) => (
          <NavButton
            key={item.path}
            {...item}
            isActive={isActive(item.path)}
          />
        ))}

        {/* Centre: الرفيق — raised circular button */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            flex: 1,
            position: 'relative',
            top: -12,
          }}
        >
          <Link
            href="/chat"
            aria-label="الرفيق"
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #5DCDA5 0%, #259696 50%, #376EC8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(93,205,165,0.4)',
              textDecoration: 'none',
              border: '2px solid rgba(255,255,255,0.12)',
            }}
          >
            <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="white" width="22" height="22">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </Link>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 10,
              fontWeight: isActive('/chat') ? 700 : 400,
              color: isActive('/chat') ? '#5DCDA5' : 'var(--text-muted)',
              whiteSpace: 'nowrap',
            }}
          >
            الرفيق
          </span>
        </div>

        {/* Right two items */}
        {RIGHT_ITEMS.map((item) => (
          <NavButton
            key={item.path}
            {...item}
            isActive={isActive(item.path)}
          />
        ))}
      </div>
    </div>
  );
}
