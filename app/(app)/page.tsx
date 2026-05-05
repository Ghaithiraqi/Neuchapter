import { WelcomeHero } from '@/components/home/WelcomeHero';
import { StreakCircle } from '@/components/home/StreakCircle';
import { UnifiedSection } from '@/components/home/UnifiedSection';
import { JournalList } from '@/components/home/JournalList';
import { EmergencyCard } from '@/components/home/EmergencyCard';
import { ReportCard } from '@/components/home/ReportCard';

export default function HomePage() {
  return (
    <div style={{ padding: '0 20px' }}>
      <WelcomeHero />
      <StreakCircle />
      <UnifiedSection />
      <JournalList />
      <EmergencyCard />
      <ReportCard />
    </div>
  );
}
