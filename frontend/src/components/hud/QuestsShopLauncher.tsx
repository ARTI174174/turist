'use client';

import { useState } from 'react';
import { ListChecks, ShoppingBag, Trophy } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { QuestsPanel } from '@/components/panels/QuestsPanel';
import { ShopPanel } from '@/components/panels/ShopPanel';
import { LeaderboardPanel } from '@/components/panels/LeaderboardPanel';

export function QuestsShopLauncher({ showLeaderboard = false }: { showLeaderboard?: boolean }) {
  const [open, setOpen] = useState<'quests' | 'shop' | 'leaderboard' | null>(null);
  return (
    <>
      <div className="pointer-events-none absolute left-3 z-20 flex flex-col gap-2" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 108px)' }}>
        <button onClick={() => setOpen('quests')} aria-label="Задания" className="hud-panel pointer-events-auto flex flex-col items-center gap-0.5 rounded-2xl px-3 py-2 text-parchment backdrop-blur">
          <ListChecks size={20} /><span className="text-[9px]">Задания</span>
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
