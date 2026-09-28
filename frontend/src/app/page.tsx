'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Volume2, VolumeX } from 'lucide-react';
import { TopHud } from '@/components/hud/TopHud';
import { QuestsShopLauncher } from '@/components/hud/QuestsShopLauncher';
import { BottomNav } from '@/components/nav/BottomNav';
import { useAuthStore } from '@/store/useAuthStore';

// Экран «Лагерь» — стартовый экран после запуска приложения: атмосферный
// фон с костром + зацикленная фоновая музыка. Дальше сюда добавится
// покупка палатки/украшений лагеря через Магазин.
export default function CampPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [hydrated, setHydrated] = useState(false);
  const [muted, setMuted] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (hydrated && !user) router.replace('/login');
  }, [hydrated, user, router]);

  // Браузеры блокируют автовоспроизведение со звуком без жеста пользователя —
  // поэтому по умолчанию звук выключен, а по тапу на кнопку музыки включаем звук.
  function toggleSound() {
    const audio = audioRef.current;
    if (!audio) return;
    if (muted) {
      audio.muted = false;
      audio.play().catch(() => {});
      setMuted(false);
    } else {
      audio.muted = true;
      setMuted(true);
    }
  }

  if (!hydrated || !user) return null;

  return (
    <main
      className="relative h-full w-full overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: "url('/assets/camp/camp-bg.jpg')" }}
    >
      <audio ref={audioRef} src="/assets/camp/camp-music.mp3" loop autoPlay muted={muted} />

      <div className="absolute inset-0 bg-black/10" />

      <TopHud />
      <QuestsShopLauncher />

      <button
        onClick={toggleSound}
        aria-label={muted ? 'Включить музыку' : 'Выключить музыку'}
        className="absolute right-3 z-20 rounded-full bg-forest/80 p-3 text-parchment shadow-lg backdrop-blur"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      <BottomNav />
    </main>
  );
}
