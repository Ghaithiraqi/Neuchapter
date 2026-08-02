'use client';

import { usePathname } from 'next/navigation';
import { NavBar } from './NavBar';
import { BottomNav } from './BottomNav';

// Routes that get no nav bar and no bottom nav (isolated screens)
const NAVLESS = ['/sos'];

export function ClientLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const navless = NAVLESS.includes(pathname);

  return (
    <div
      style={{
        maxWidth: 420,
        margin: '0 auto',
        minHeight: '100vh',
        background:
          'radial-gradient(700px 500px at 50% 22%, #16203A 0%, #111626 58%, var(--bg-deep) 100%)',
        position: 'relative',
      }}
    >
      {!navless && <NavBar />}
      <main
        style={{
          position: 'relative',
          zIndex: 1,
          // When nav is hidden, just respect safe-area; otherwise track the
          // real bottom-bar height measured by BottomNav's ResizeObserver.
          paddingBottom: navless
            ? 'env(safe-area-inset-bottom, 0px)'
            : 'calc(var(--bottom-bar-height, 140px) + 20px)',
        }}
      >
        {children}
      </main>
      {!navless && <BottomNav />}
    </div>
  );
}
