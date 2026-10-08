'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

interface MedalEntry { id: string; medalName: string; claimedAt: string }

export function MedalsChestButton() {
  const [open, setOpen] = useState(false);
  const userId = useAuthStore((state) => state.user?.id);
  const { data = [] } = useQuery<MedalEntry[]>({ queryKey: ['game', 'medals', userId], queryFn: () => api.get('/game/medals'), enabled: !!userId });
  return <>
    <button onClick={() => setOpen(true)} className="hud-panel absolute left-3 z-20 flex items-center gap-2 rounded-2xl px-3 py-2 text-parchment shadow-lg backdrop-blur" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 230px)' }}>
      <img src="/assets/icons/medal-expedition.png" alt="" className="h-6 w-6 shrink-0 object-contain" /><span className="text-[10px]">Ящик медалей{data.length ? ` · ${data.length}` : ''}</span>
    </button>
    {open && <Modal title="Ящик редких медалей" onClose={() => setOpen(false)}>
      <p className="mb-3 text-xs text-parchment/60">Награды за особые путешествия. Друзья тоже видят полученные медали в твоём профиле.</p>
      <div className="space-y-2">{data.map((medal) => <div key={medal.id} className="flex items-center gap-2 rounded-xl border border-brass/25 bg-black/15 p-3"><img src="/assets/icons/medal-expedition.png" alt="" className="h-9 w-9 shrink-0 object-contain" /><div><p className="text-sm text-parchment">{medal.medalName}</p><p className="text-[10px] text-stone">{new Date(medal.claimedAt).toLocaleDateString('ru-RU')}</p></div></div>)}{!data.length && <p className="rounded-xl border border-brass/20 p-4 text-center text-xs text-parchment/60">Пока здесь пусто. Медали будут появляться после особых путешествий.</p>}</div>
    </Modal>}
  </>;
}
