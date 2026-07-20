'use client';

import { Bell, Gem } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { resolveLevel } from '@/lib/level';

export function TopHud() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;

  const xp = user.progress?.xp ?? 0;
  const { level } = resolveLevel(xp);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 px-3"
      // Сдвигаем HUD вниз на безопасную зону устройства (iPhone "чёлка"/остров) +
      // ещё на высоту самих значков, чтобы они не оказывались под вырезом камеры.
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 52px)' }}
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-forest/95 px-3 py-2 shadow-lg backdrop-blur">
        <div className="passport-stamp h-9 w-9 shrink-0 text-xs font-display">
          {user.nickname.slice(0, 2).toUpperCase()}
        </div>
        <div className="leading-tight">
          <p className="font-display text-sm text-parchment">Уровень {level}</p>
          <p className="font-mono text-[11px] text-parchment/70">{xp} баллов</p>
        </div>
      </div>

      <div className="pointer-events-auto flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-full bg-forest/95 px-3 py-2 shadow-lg backdrop-blur">
          <span className="text-amber">●</span>
          <span className="font-mono text-sm text-parchment">{user.wallet?.coinsBalance ?? 0}</span>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-forest/95 px-3 py-2 shadow-lg backdrop-blur">
          <Gem size={14} className="text-sky-300" />
          <span className="font-mono text-sm text-parchment">{user.wallet?.crystalsBalance ?? 0}</span>
        </div>
        <button
          aria-label="Уведомления"
          className="rounded-full bg-forest/95 p-2.5 text-parchment shadow-lg backdrop-blur"
        >
          <Bell size={18} />
        </button>
      </div>
    </div>
  );
}
