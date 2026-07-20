'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tent, Music2, ShoppingBag } from 'lucide-react';
import { TopHud } from '@/components/hud/TopHud';
import { BottomNav } from '@/components/nav/BottomNav';
import { useAuthStore } from '@/store/useAuthStore';

// Экран «Лагерь» — стартовый экран после запуска приложения.
// Сейчас простая атмосферная заглушка; дальше сюда добавится
// покупка палатки/одежды персонажа, музыка у костра и т.д. (см. магазин).
export default function CampPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (hydrated && !user) router.replace('/login');
  }, [hydrated, user, router]);

  if (!hydrated || !user) return null;

  return (
    <main className="relative h-[100dvh] w-screen overflow-hidden bg-gradient-to-b from-forest-dark via-forest to-forest-dark">
      <TopHud />

      <div
        className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center"
        style={{ paddingBottom: 90 }}
      >
        {/* Простая сцена костра — эмодзи-заглушка, later заменится на 3D-сцену лагеря */}
        <div className="relative">
          <div className="text-7xl">🏕️</div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-4xl animate-pulse">🔥</div>
        </div>

        <div>
          <h1 className="font-display text-2xl text-parchment">Твой лагерь</h1>
          <p className="mt-1 max-w-xs text-sm text-parchment/60">
            Здесь появится твоя стоянка — обустраивай её между походами
          </p>
        </div>

        <div className="grid w-full max-w-xs grid-cols-3 gap-3">
          <FeatureTeaser icon={<Tent size={22} />} label="Палатка" />
          <FeatureTeaser icon={<ShoppingBag size={22} />} label="Снаряжение" />
          <FeatureTeaser icon={<Music2 size={22} />} label="Музыка" />
        </div>

        <p className="text-xs text-parchment/40">Скоро можно будет обустроить лагерь через Магазин</p>
      </div>

      <BottomNav />
    </main>
  );
}

function FeatureTeaser({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-parchment/10 py-4 text-parchment/70">
      {icon}
      <span className="text-[11px]">{label}</span>
    </div>
  );
}
