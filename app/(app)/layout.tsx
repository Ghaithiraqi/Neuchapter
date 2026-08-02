import { BottomNav } from '@/components/shared/BottomNav';
import { NavBar } from '@/components/shared/NavBar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        maxWidth: 420,
        margin: '0 auto',
        minHeight: '100vh',
        background:
          'radial-gradient(700px 500px at 50% 22%, #16203A 0%, #111626 58%, var(--bg-deep) 100%)',
        position: 'relative',
        // no overflow here — html/body in globals.css provides overflow-x: hidden
      }}
    >
      <NavBar />
      {/* paddingBottom tracks the real measured height of the fixed bottom bar via --bottom-bar-height,
          set by BottomNav's ResizeObserver. Falls back to 140px if JS hasn't run yet. */}
      <main style={{ position: 'relative', zIndex: 1, paddingBottom: 'calc(var(--bottom-bar-height, 140px) + 20px)' }}>
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
