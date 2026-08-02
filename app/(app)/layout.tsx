import { ClientLayoutShell } from '@/components/shared/ClientLayoutShell';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <ClientLayoutShell>{children}</ClientLayoutShell>;
}
