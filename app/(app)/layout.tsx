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
      <main style={{ position: 'relative', zIndex: 1, paddingBottom: 110 }}>
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
