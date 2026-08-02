import { StreakProvider } from '@/components/home/StreakCircle';
import { HomeClient } from '@/components/home/HomeClient';

export default function HomePage() {
  return (
    <StreakProvider>
      <HomeClient />
    </StreakProvider>
  );
}
