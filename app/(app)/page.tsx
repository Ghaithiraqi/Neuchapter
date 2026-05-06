import Link from 'next/link';
import { WelcomeHero } from '@/components/home/WelcomeHero';
import { StreakCircle } from '@/components/home/StreakCircle';
import { JournalList } from '@/components/home/JournalList';
import { EmergencyCard } from '@/components/home/EmergencyCard';
import { ReportCard } from '@/components/home/ReportCard';

export default function HomePage() {
  return (
    <div style={{ padding: '0 20px' }}>
      <WelcomeHero />
      <StreakCircle />

      {/* روابط سريعة */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
        {[
          { href: '/chat', icon: '💬', label: 'ابدأ محادثة', color: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.25)' },
          { href: '/entry', icon: '🎙️', label: 'سجّل مذكرة', color: 'var(--gold-faint)', border: 'var(--border-mid)' },
          { href: '/analysis', icon: '📊', label: 'تقاريرك', color: 'rgba(127,168,140,0.12)', border: 'rgba(127,168,140,0.25)' },
        ].map(({ href, icon, label, color, border }) => (
          <Link
            key={href}
            href={href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              padding: '14px 8px',
              background: color,
              border: `1px solid ${border}`,
              borderRadius: 16,
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ fontSize: 22 }}>{icon}</span>
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 11,
                color: 'var(--text-secondary)',
                textAlign: 'center',
                lineHeight: 1.3,
              }}
            >
              {label}
            </span>
          </Link>
        ))}
      </div>

      <JournalList />
      <EmergencyCard />
      <ReportCard />
    </div>
  );
}
