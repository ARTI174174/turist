'use client';

import { useState } from 'react';
import { ListChecks, ShoppingBag, Trophy } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { Modal } from '@/components/ui/Modal';
import { QuestsPanel } from '@/components/panels/QuestsPanel';
import { ShopPanel } from '@/components/panels/ShopPanel';
import { LeaderboardPanel } from '@/components/panels/LeaderboardPanel';

export function QuestsShopLauncher({ showLeaderboard = false }: { showLeaderboard?: boolean }) {
  const [open, setOpen] = useState<'quests' | 'shop' | 'leaderboard' | null>(null);
  const user = useAuthStore((state) => state.user);
  const { data: quests = [] } = useQuery<{ progress: number; target: number; claimed: boolean }[]>({
    queryKey: ['quests', 'categories'], queryFn: () => api.get('/quests/categories'), enabled: !!user,
  });
  const { data: milestones = [] } = useQuery<{ achieved: boolean; claimed: boolean }[]>({
    queryKey: ['quests', 'milestones'], queryFn: () => api.get('/quests/milestones'), enabled: !!user,
  });
  const hasReward = quests.some((quest) => quest.progress >= quest.target && !quest.claimed) || milestones.some((quest) => quest.achieved && !quest.claimed);
  return (
    <>
      <div className="pointer-events-none absolute left-3 z-20 flex flex-col gap-2" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 108px)' }}>
        <button onClick={() => setOpen('quests')} aria-label={hasReward ? 'Задания — есть награда' : 'Задания'} className="hud-panel pointer-events-auto relative flex flex-col items-center gap-0.5 rounded-2xl px-3 py-2 text-parchment backdrop-blur">
          <ListChecks size={20} /><span className="text-[9px]">Задания</span>
          {hasReward && <span aria-hidden="true" className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-parchment/80 bg-danger text-xs font-bold text-parchment shadow-md">!</span>}
        </button>
        <button onClick={() => setOpen('shop')} aria-label="Магазин" className="hud-panel pointer-events-auto flex flex-col items-center gap-0.5 rounded-2xl px-3 py-2 text-parchment backdrop-blur">
          <ShoppingBag size={20} /><span className="text-[9px]">Магазин</span>
        </button>
        {showLeaderboard && <button onClick={() => setOpen('leaderboard')} aria-label="Топ игроков" className="hud-panel pointer-events-auto flex flex-col items-center gap-0.5 rounded-2xl px-3 py-2 text-parchment backdrop-blur">
          <Trophy size={20} /><span className="text-[9px]">Топ игроков</span>
        </button>}
      </div>
      {open === 'quests' && <Modal title="Задания" onClose={() => setOpen(null)}><QuestsPanel /></Modal>}
      {open === 'shop' && <Modal title="Магазин" onClose={() => setOpen(null)}><ShopPanel /></Modal>}
      {open === 'leaderboard' && <Modal title="Топ игроков" onClose={() => setOpen(null)}><LeaderboardPanel /></Modal>}
    </>
  );
}
