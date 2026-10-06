'use client';

import { useEffect, useState } from 'react';
import { Check, Sparkles, X } from 'lucide-react';
import { AchievementNotice as Notice, subscribeToAchievementNotices } from '@/lib/achievement-notice';

interface ActiveNotice extends Notice { id: number }

export function AchievementNotice() {
  const [notice, setNotice] = useState<ActiveNotice | null>(null);

  useEffect(() => subscribeToAchievementNotices((next) => {
    setNotice({ ...next, id: Date.now() });
  }), []);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 8000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  if (!notice) return null;

  return (
    <>
    <div aria-hidden="true" className="fixed inset-0 z-[80] bg-black/35 backdrop-blur-[1px]" />
    <div className="pointer-events-none fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+6.5rem)] z-[90] flex justify-center sm:bottom-6">
      <section key={notice.id} role="status" aria-live="polite" className="pointer-events-auto w-full max-w-sm rounded-2xl border border-brass/70 bg-panel/95 p-4 text-parchment shadow-2xl backdrop-blur-md">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-brass/60 bg-moss/30 text-brass"><Sparkles size={21} /></span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-base text-brass">Поздравляем!</p>
            <p className="mt-0.5 text-sm font-semibold text-parchment">{notice.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-parchment/75">{notice.description}</p>
            {notice.reward && <p className="mt-2 text-xs font-medium text-moss-light">{notice.reward}</p>}
          </div>
          <button type="button" onClick={() => setNotice(null)} aria-label="Закрыть поздравление" className="rounded-full p-1 text-parchment/60 hover:bg-white/10 hover:text-parchment"><X size={17} /></button>
        </div>
        <button type="button" onClick={() => setNotice(null)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-brass/40 bg-moss/25 py-2 text-xs font-semibold text-parchment hover:bg-moss/40"><Check size={15} /> Отлично!</button>
      </section>
    </div>
    </>
  );
}
