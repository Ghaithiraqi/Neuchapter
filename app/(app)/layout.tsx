import { BottomNav } from '@/components/shared/BottomNav';
import { NavBar } from '@/components/shared/NavBar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        maxWidth: 420,
        margin: '0 auto',
        minHeight: '100vh',
        background: 'var(--night-deepest)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* وهج خلفي */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse at 50% 0%, rgba(107, 149, 201, 0.05) 0%, transparent 50%),
            radial-gradient(ellipse at 100% 100%, rgba(107, 149, 201, 0.03) 0%, transparent 50%)
          `,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <NavBar />
      <main style={{ position: 'relative', zIndex: 1, paddingBottom: 110 }}>
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
