'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flag, Volume2, VolumeX } from 'lucide-react';
import { TopHud } from '@/components/hud/TopHud';
import { QuestsShopLauncher } from '@/components/hud/QuestsShopLauncher';
import { BottomNav } from '@/components/nav/BottomNav';
import { useAuthStore } from '@/store/useAuthStore';
import { MedalsChestButton } from '@/components/game/MedalsChestButton';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { FlagStudio } from '@/components/game/FlagStudio';
import { Modal } from '@/components/ui/Modal';
import { ApiError } from '@/lib/api';

interface CampStats { visited: number; total: number; percent: number; mountains: number; lakes: number; historic: number; cities: number }

// Экран «Лагерь» — стартовый экран после запуска приложения: атмосферный
// фон с костром + зацикленная фоновая музыка. Дальше сюда добавится
// покупка палатки/украшений лагеря через Магазин.
export default function CampPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [hydrated, setHydrated] = useState(false);
  const [muted, setMuted] = useState(true);
  const [flagStudioOpen, setFlagStudioOpen] = useState(false);
  const [firstCamp, setFirstCamp] = useState<string | null>(null);
  const [savingCamp, setSavingCamp] = useState(false);
  const [campError, setCampError] = useState<string | null>(null);
  const camps: Record<string, { name: string; image: string }> = {
    zyuratkul: { name: 'Зюраткуль', image: '/assets/camp/locations/zyuratkul.png' },
    nurgush: { name: 'Нургуш', image: '/assets/camp/locations/nurgush.png' },
    taganay: { name: 'Таганай', image: '/assets/camp/locations/taganay.png' },
    ural: { name: 'Урал', image: '/assets/camp/locations/ural.jpg' },
  };
  const camp = camps[user?.campThemeId ?? ''] ?? { name: 'Лагерь', image: '/assets/camp/camp-bg.jpg' };
  const { data: campStats } = useQuery<CampStats>({ queryKey: ['game', 'camp-stats'], queryFn: () => api.get<CampStats>('/game/camp/stats'), enabled: !!user });
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

  async function chooseFirstCamp() {
    if (!firstCamp || !user || savingCamp) return;
    setSavingCamp(true); setCampError(null);
    try {
      const result = await api.post<{ campThemeId: string; crystalsBalance: number }>('/game/camp/change', { campThemeId: firstCamp });
      updateUser({ campThemeId: result.campThemeId, wallet: { ...user.wallet, crystalsBalance: result.crystalsBalance } });
    } catch (error) { setCampError(error instanceof ApiError ? error.message : 'Не удалось выбрать лагерь.'); }
    finally { setSavingCamp(false); }
  }

  if (!hydrated || !user) return null;

  return (
    <main
      className="relative h-full w-full overflow-hidden bg-[#080b08]"
    >
      <div className="absolute -inset-x-1 -top-3 bottom-0 bg-cover bg-center" style={{ backgroundImage: `url('${camp.image}')` }} />
      <audio ref={audioRef} src="/assets/camp/camp-music.mp3" loop autoPlay muted={muted} />

      <div className="pointer-events-none absolute inset-0 bg-black/10" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-b from-transparent via-[#0b100c]/75 to-[#080b08]" />

      <TopHud showNotifications={false} />
      <QuestsShopLauncher />
      <MedalsChestButton />
      <button onClick={() => setFlagStudioOpen(true)} className="hud-panel absolute right-3 top-[calc(env(safe-area-inset-top,0px)+158px)] z-20 rounded-xl p-2.5 text-brass shadow-lg" aria-label="Нарисовать флаг"><Flag size={20} /></button>
      <div className="absolute left-1/2 top-[calc(env(safe-area-inset-top,0px)+126px)] z-10 -translate-x-1/2 rounded-full border border-brass/40 bg-black/45 px-4 py-1 text-xs text-parchment shadow-lg">{camp.name}</div>
      {campStats && <div className="absolute inset-x-4 bottom-[calc(7.2rem+env(safe-area-inset-bottom,0px))] z-10 rounded-2xl border border-brass/40 bg-black/60 px-4 py-2 text-center text-[10px] text-parchment shadow-lg backdrop-blur">
        <p className="font-display text-xs text-brass">Доска путешественника</p>
        <p className="mt-1">Горы {campStats.mountains} · Города {campStats.cities} · Озёра {campStats.lakes} · Исторические места {campStats.historic}</p>
        <p className="mt-1 text-parchment/70">Исследовано в Челябинской области: {campStats.percent}% · {campStats.visited}/{campStats.total}</p>
      </div>}

      <button
        onClick={toggleSound}
        aria-label={muted ? 'Включить музыку' : 'Выключить музыку'}
        className="hud-panel absolute right-3 z-20 rounded-full p-3 text-parchment backdrop-blur"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 104px)' }}
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      <BottomNav />
      {flagStudioOpen && <FlagStudio onClose={() => setFlagStudioOpen(false)} />}
      {(!user.campThemeId || user.campThemeId === 'default') && <Modal title="Выбери первый лагерь" onClose={() => {}}>
        <p className="mb-3 text-center text-xs text-parchment/65">Это бесплатный выбор. Сменить лагерь позже можно будет в магазине за 20 бриллиантов.</p>
        <div className="grid grid-cols-2 gap-2">{[
          ['zyuratkul', 'Зюраткуль', '/assets/camp/locations/zyuratkul.png'],
          ['nurgush', 'Нургуш', '/assets/camp/locations/nurgush.png'],
          ['taganay', 'Таганай', '/assets/camp/locations/taganay.png'],
          ['ural', 'Урал', '/assets/camp/locations/ural.jpg'],
        ].map(([id, name, image]) => <button key={id} onClick={() => setFirstCamp(id)} className={`overflow-hidden rounded-xl border-2 ${firstCamp === id ? 'border-brass' : 'border-brass/25'}`}><img src={image} alt="" className="h-24 w-full object-cover" /><span className="block p-2 text-xs text-parchment">{name}</span></button>)}</div>
        {campError && <p className="mt-2 text-center text-xs text-danger">{campError}</p>}
        <button disabled={!firstCamp || savingCamp} onClick={() => void chooseFirstCamp()} className="mt-3 w-full rounded-full bg-moss py-2.5 text-sm text-parchment disabled:opacity-40">{savingCamp ? 'Сохраняем…' : 'Установить лагерь'}</button>
      </Modal>}
    </main>
  );
}
