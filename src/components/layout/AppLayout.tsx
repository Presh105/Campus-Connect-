import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { useAppUpdates } from '@/hooks/useAppUpdates';
import { AssistantBot } from '@/components/AssistantBot';

interface AppLayoutProps { children: ReactNode; }

export function AppLayout({ children }: AppLayoutProps) {
  useAppUpdates();
  return (
    <div className="min-h-screen min-h-[100dvh] bg-background flex flex-col">
      <main className="flex-1 pb-20 overflow-y-auto">{children}</main>
      <BottomNav />
      <AssistantBot />
    </div>
  );
}

