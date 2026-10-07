'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopHud } from '@/components/hud/TopHud';
import { BottomNav } from '@/components/nav/BottomNav';
import { ShopPanel } from '@/components/panels/ShopPanel';
import { useAuthStore } from '@/store/useAuthStore';

export default function ShopPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  useEffect(() => { if (hydrated && !user) router.replace('/login'); }, [hydrated, user, router]);
  if (!hydrated || !user) return null;
  return <main className="relative h-full w-full overflow-hidden bg-forest-dark">
    <TopHud />
    <div className="bg-adventure scrollbar-hidden h-full overflow-y-auto px-4 pb-[calc(10rem+env(safe-area-inset-bottom,0px))]" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 56px)' }}>
      <h1 className="mb-1 font-display text-xl text-ink">Магазин</h1>
      <ShopPanel />
    </div>
    <BottomNav />
  </main>;
}
