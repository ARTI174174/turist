'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { announceAchievement } from '@/lib/achievement-notice';
import { CurrencyAmount } from '@/components/ui/CurrencyAmount';

interface Quest { code: string; title: string; description: string; target: number; progress: number; coins: number; crystals: number; claimed: boolean }

export function CategoryQuests() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const client = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data = [], isLoading, isError, refetch } = useQuery<Quest[]>({ queryKey: ['quests', 'categories'], queryFn: () => api.get('/quests/categories'), enabled: !!user });

  async function claim(quest: Quest) {
    if (busy || !user) return;
    setBusy(quest.code); setError(null);
    try {
      const result = await api.post<{ coins: number; crystals: number; wallet: { coinsBalance: number; crystalsBalance: number } }>(`/quests/categories/${quest.code}/claim`, {});
      updateUser({ wallet: { ...user.wallet, ...result.wallet } });
      announceAchievement({ title: 'Задание выполнено!', description: quest.title, reward: `+${result.coins.toLocaleString('ru-RU')} золота · +${result.crystals} бриллиантов` });
      await client.invalidateQueries({ queryKey: ['quests', 'categories'] });
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Не удалось получить награду. Попробуйте ещё раз.'); }
    finally { setBusy(null); }
  }

  return <section className="mb-5 space-y-3" aria-label="Задания исследователя">
    <p className="text-xs leading-relaxed text-parchment/70">Открывай места и забирай награды. Уже посещённые места учитываются; каждую награду можно получить один раз.</p>
    {isLoading && <p role="status" className="text-sm text-parchment/70">Загружаем задания…</p>}
    {isError && <button onClick={() => void refetch()} className="adventure-secondary min-h-11 w-full rounded-xl text-sm">Не удалось загрузить задания. Повторить</button>}
    {data.map((quest) => <article key={quest.code} className="adventure-card rounded-2xl p-3">
      <div className="flex items-center justify-between gap-2"><h3 className="font-display text-sm text-parchment">{quest.title}</h3>{quest.claimed && <CheckCircle2 size={18} className="shrink-0 text-moss-light" aria-label="Награда получена" />}</div>
      <p className="mt-1 text-xs text-parchment/65">{quest.description}</p>
      <div className="my-3 flex items-center gap-3 text-sm text-amber-light"><CurrencyAmount amount={quest.coins} currency="coins" /><CurrencyAmount amount={quest.crystals} currency="crystals" /></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-black/30" role="progressbar" aria-label={quest.title} aria-valuemin={0} aria-valuemax={quest.target} aria-valuenow={quest.progress}><div className="h-full rounded-full bg-moss-light" style={{ width: `${quest.progress / quest.target * 100}%` }} /></div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs"><span className="text-parchment/70">{quest.progress} / {quest.target}</span>{quest.claimed ? <span className="text-moss-light">Награда получена</span> : quest.progress >= quest.target ? <button onClick={() => void claim(quest)} disabled={!!busy} className="adventure-primary min-h-11 rounded-full px-4 disabled:opacity-50">{busy === quest.code ? 'Получаем…' : 'Забрать награду'}</button> : <span className="text-parchment/50">В процессе</span>}</div>
    </article>)}
    {error && <p role="alert" className="text-xs text-danger">{error}</p>}
  </section>;
}
