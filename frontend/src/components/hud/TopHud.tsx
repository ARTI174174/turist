'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { resolveLevel } from '@/lib/level';
import { api } from '@/lib/api';

export function TopHud({ showNotifications = true }: { showNotifications?: boolean }) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const { data } = useQuery<{ count: number }>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get<{ count: number }>('/notifications/unread-count'),
    enabled: !!user && showNotifications,
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
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-48 bg-gradient-to-b from-[#080b08]/95 via-[#080b08]/55 to-transparent" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-1.5 px-2.5"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}
      >
        <div className="hud-panel pointer-events-auto min-w-[112px] flex-1 rounded-full px-2.5 py-1.5 shadow-lg backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="hud-level-mark">{level}</span>
            <span className="truncate font-display text-xs text-parchment">УРОВЕНЬ</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/30">
            <div className="h-full rounded-full bg-amber transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="mt-0.5 font-mono text-[10px] text-parchment/70">
            {xp} / {nextThreshold ?? xp}
          </p>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <div className="hud-panel flex items-center gap-1 rounded-full px-2 py-1.5 shadow-lg backdrop-blur">
            <img src="/assets/icons/coin.png" alt="" className="h-4 w-4" />
            <span className="font-mono text-xs text-parchment">{user.wallet?.coinsBalance ?? 0}</span>
          </div>
          <div className="hud-panel flex items-center gap-1 rounded-full px-2 py-1.5 shadow-lg backdrop-blur">
            <img src="/assets/icons/diamond.png" alt="" className="h-4 w-4" />
            <span className="font-mono text-xs text-parchment">{user.wallet?.crystalsBalance ?? 0}</span>
          </div>
          {showNotifications && <button
            onClick={() => router.push('/social')}
            aria-label="Уведомления"
            className="hud-panel relative rounded-full p-2 text-parchment shadow-lg backdrop-blur"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 font-mono text-[9px] text-parchment">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>}
        </div>
      </div>

      {/* Задания и Магазин — под уровнем в левом верхнем углу */}
    </>
  );
}
