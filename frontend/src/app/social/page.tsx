'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { TopHud } from '@/components/hud/TopHud';
import { BottomNav } from '@/components/nav/BottomNav';
import { useAuthStore } from '@/store/useAuthStore';

// Друзья/чат — в разработке (следующий крупный шаг: поиск по нику,
// заявки в друзья, уведомления, чат в реальном времени, аватары-смайлики).
export default function SocialPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    if (hydrated && !user) router.replace('/login');
  }, [hydrated, user, router]);

  if (!hydrated || !user) return null;

  return (
    <main className="relative h-[100dvh] w-screen overflow-hidden bg-forest-dark">
      <TopHud />
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-topo px-6 text-center">
        <Users size={36} className="text-stone" />
        <p className="font-display text-lg text-ink">Друзья скоро здесь</p>
        <p className="max-w-xs text-sm text-stone">
          Поиск по нику, заявки в друзья и чат появятся в следующем обновлении
        </p>
      </div>
      <BottomNav />
    </main>
  );
}
