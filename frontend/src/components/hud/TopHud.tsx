'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Bell, ListChecks, ShoppingBag } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { resolveLevel } from '@/lib/level';
import { api } from '@/lib/api';

export function TopHud() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const { data } = useQuery<{ count: number }>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get<{ count: number }>('/notifications/unread-count'),
    enabled: !!user,
    refetchInterval: 20_000,
  });
  const unreadCount = data?.count ?? 0;

  if (!user) return null;

  const xp = user.progress?.xp ?? 0;
  const { level, currentThreshold, nextThreshold } = resolveLevel(xp);
  const progressPct = nextThreshold
    ? Math.min(100, Math.round(((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100))
    : 100;

  return (
    <>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 px-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}
      >
        <div className="pointer-events-auto min-w-[160px] rounded-full bg-forest/95 px-3 py-2 shadow-lg backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="font-display text-sm text-parchment">Уровень {level}</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/30">
            <div className="h-full rounded-full bg-amber transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="mt-0.5 font-mono text-[10px] text-parchment/70">
            {xp} / {nextThreshold ?? xp}
          </p>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-forest/95 px-3 py-2 shadow-lg backdrop-blur">
            <img src="/assets/icons/coin.png" alt="" className="h-5 w-5" />
            <span className="font-mono text-sm text-parchment">{user.wallet?.coinsBalance ?? 0}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-forest/95 px-3 py-2 shadow-lg backdrop-blur">
            <img src="/assets/icons/diamond.png" alt="" className="h-5 w-5" />
            <span className="font-mono text-sm text-parchment">{user.wallet?.crystalsBalance ?? 0}</span>
          </div>
          <button
            onClick={() => router.push('/social')}
            aria-label="Уведомления"
            className="relative rounded-full bg-forest/95 p-2.5 text-parchment shadow-lg backdrop-blur"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 font-mono text-[9px] text-parchment">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Задания и Магазин — под уровнем в левом верхнем углу */}
      <div
        className="pointer-events-none absolute left-3 z-20 flex flex-col gap-2"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 72px)' }}
      >
        <button
          onClick={() => router.push('/quests')}
          aria-label="Задания"
          className="pointer-events-auto flex flex-col items-center gap-0.5 rounded-2xl bg-forest/95 px-3 py-2 text-parchment shadow-lg backdrop-blur"
        >
          <ListChecks size={20} />
          <span className="text-[9px]">Задания</span>
        </button>
        <button
          onClick={() => router.push('/shop')}
          aria-label="Магазин"
          className="pointer-events-auto flex flex-col items-center gap-0.5 rounded-2xl bg-forest/95 px-3 py-2 text-parchment shadow-lg backdrop-blur"
        >
          <ShoppingBag size={20} />
          <span className="text-[9px]">Магазин</span>
        </button>
      </div>
    </>
  );
}
