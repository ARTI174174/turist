'use client';

import { useState } from 'react';
import { ListChecks, ShoppingBag } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { QuestsPanel } from '@/components/panels/QuestsPanel';
import { ShopPanel } from '@/components/panels/ShopPanel';

export function QuestsShopLauncher() {
  const [open, setOpen] = useState<'quests' | 'shop' | null>(null);
  return (
    <>
      <div className="pointer-events-none absolute left-3 z-20 flex flex-col gap-2" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 72px)' }}>
        <button onClick={() => setOpen('quests')} aria-label="Задания" className="pointer-events-auto flex flex-col items-center gap-0.5 rounded-2xl bg-forest/95 px-3 py-2 text-parchment shadow-lg backdrop-blur">
          <ListChecks size={20} /><span className="text-[9px]">Задания</span>
        </button>
        <button onClick={() => setOpen('shop')} aria-label="Магазин" className="pointer-events-auto flex flex-col items-center gap-0.5 rounded-2xl bg-forest/95 px-3 py-2 text-parchment shadow-lg backdrop-blur">
          <ShoppingBag size={20} /><span className="text-[9px]">Магазин</span>
        </button>
      </div>
      {open === 'quests' && <Modal title="Задания" onClose={() => setOpen(null)}><QuestsPanel /></Modal>}
      {open === 'shop' && <Modal title="Магазин" onClose={() => setOpen(null)}><ShopPanel /></Modal>}
    </>
  );
}
