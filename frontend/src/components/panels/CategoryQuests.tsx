'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { announceAchievement } from '@/lib/achievement-notice';
import { CurrencyAmount } from '@/components/ui/CurrencyAmount';

interface CategoryQuest { code: string; title: string; description: string; target: number; progress: number; coins: number; crystals: number; claimed: boolean }
interface VisitMilestone { count: number; reward: number; crystalReward: number; achieved: boolean; claimed: boolean; progress: number }
interface QuestCardData { key: string; kind: 'category' | 'milestone'; title: string; description: string; target: number; progress: number; coins: number; crystals: number; xp: number; claimed: boolean; milestoneCount?: number }

export function CategoryQuests() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const client = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const categoriesQuery = useQuery<CategoryQuest[]>({ queryKey: ['quests', 'categories'], queryFn: () => api.get('/quests/categories'), enabled: !!user });
  const milestonesQuery = useQuery<VisitMilestone[]>({ queryKey: ['quests', 'milestones'], queryFn: () => api.get('/quests/milestones'), enabled: !!user });
  const cards: QuestCardData[] = [
    ...(categoriesQuery.data ?? []).map((quest) => ({ key: quest.code, kind: 'category' as const, title: quest.title, description: quest.description, target: quest.target, progress: quest.progress, coins: quest.coins, crystals: quest.crystals, xp: 0, claimed: quest.claimed })),
    ...(milestonesQuery.data ?? []).map((quest) => ({ key: `visit-${quest.count}`, kind: 'milestone' as const, title: `Посетить ${quest.count} мест`, description: `Открывай новые места и забирай награду за исследование.`, target: quest.count, progress: quest.progress, coins: 0, crystals: quest.crystalReward, xp: quest.reward, claimed: quest.claimed, milestoneCount: quest.count })),
  ].sort((a, b) => {
    const aReady = a.progress >= a.target && !a.claimed;
    const bReady = b.progress >= b.target && !b.claimed;
    if (aReady !== bReady) return Number(bReady) - Number(aReady);
    if (a.claimed !== b.claimed) return Number(a.claimed) - Number(b.claimed);
    return a.title.localeCompare(b.title, 'ru');
  });
  const loading = categoriesQuery.isLoading || milestonesQuery.isLoading;
  const failed = categoriesQuery.isError || milestonesQuery.isError;

  async function claim(quest: QuestCardData) {
    if (busy || !user) return;
    setBusy(quest.key); setError(null);
    try {
      if (quest.kind === 'category') {
        const result = await api.post<{ coins: number; crystals: number; wallet: { coinsBalance: number; crystalsBalance: number } }>(`/quests/categories/${quest.key}/claim`, {});
        updateUser({ wallet: { ...user.wallet, ...result.wallet } });
        announceAchievement({ title: 'Задание выполнено!', description: quest.title, reward: `+${result.coins.toLocaleString('ru-RU')} золота · +${result.crystals} бриллиантов` });
      } else {
        const result = await api.post<{ xp: number; reward: number; crystalReward: number; wallet: { crystalsBalance: number } }>(`/quests/milestones/${quest.milestoneCount}/claim`, {});
        updateUser({ progress: { ...user.progress, xp: result.xp }, wallet: { ...user.wallet, crystalsBalance: result.wallet.crystalsBalance } });
        announceAchievement({ title: 'Награда за достижение получена!', description: quest.title, reward: `+${result.reward.toLocaleString('ru-RU')} XP · +${result.crystalReward} бриллиантов` });
      }
      await Promise.all([
        client.invalidateQueries({ queryKey: ['quests', 'categories'] }),
        client.invalidateQueries({ queryKey: ['quests', 'milestones'] }),
        client.invalidateQueries({ queryKey: ['game', 'leaderboard'] }),
      ]);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Не удалось получить награду. Попробуйте ещё раз.'); }
    finally { setBusy(null); }
  }

  return <section className="mb-5 space-y-3" aria-label="Задания исследователя">
    <p className="text-xs leading-relaxed text-parchment/70">Выполненные задания с наградой появляются сверху. Посещённые места учитываются, каждую награду можно получить один раз.</p>
    {loading && <p role="status" className="text-sm text-parchment/70">Загружаем задания…</p>}
    {failed && <button onClick={() => { void categoriesQuery.refetch(); void milestonesQuery.refetch(); }} className="adventure-secondary min-h-11 w-full rounded-xl text-sm">Не удалось загрузить задания. Повторить</button>}
    {cards.map((quest) => {
      const ready = quest.progress >= quest.target && !quest.claimed;
      const percent = Math.min(100, quest.progress / quest.target * 100);
      return <article key={quest.key} className={`adventure-card rounded-2xl border p-3 ${ready ? 'border-amber-light/70 shadow-[0_0_16px_rgba(226,189,120,0.14)]' : 'border-brass/20'}`}>
        <div className="flex items-center justify-between gap-2"><h3 className="font-display text-sm text-parchment">{quest.title}</h3>{quest.claimed ? <CheckCircle2 size={18} className="shrink-0 text-moss-light" aria-label="Награда получена" /> : ready && <span className="shrink-0 rounded-full bg-amber-light px-2 py-1 text-[10px] font-bold text-forest-dark">НАГРАДА ГОТОВА</span>}</div>
        <p className="mt-1 text-xs text-parchment/65">{quest.description}</p>
        <div className="my-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-amber-light">
          {quest.xp > 0 && <span>+{quest.xp.toLocaleString('ru-RU')} XP</span>}
          {quest.coins > 0 && <CurrencyAmount amount={quest.coins} currency="coins" />}
          {quest.crystals > 0 && <CurrencyAmount amount={quest.crystals} currency="crystals" />}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-black/30" role="progressbar" aria-label={quest.title} aria-valuemin={0} aria-valuemax={quest.target} aria-valuenow={quest.progress}><div className="h-full rounded-full bg-moss-light transition-[width] duration-500" style={{ width: `${percent}%` }} /></div>
        <div className="mt-2 flex items-center justify-between gap-2 text-xs"><span className="text-parchment/70">{quest.progress} / {quest.target}</span>{quest.claimed ? <span className="text-moss-light">Награда получена</span> : ready ? <button onClick={() => void claim(quest)} disabled={!!busy} className="adventure-primary min-h-11 rounded-full px-4 disabled:opacity-50">{busy === quest.key ? 'Получаем…' : 'Забрать награду'}</button> : <span className="text-parchment/50">В процессе</span>}</div>
      </article>;
    })}
    {error && <p role="alert" className="text-xs text-danger">{error}</p>}
  </section>;
}
