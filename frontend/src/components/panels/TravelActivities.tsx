'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Compass, Medal, Sparkles } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Poi } from '@/types';
import { useAuthStore } from '@/store/useAuthStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Modal } from '@/components/ui/Modal';

interface Expedition { active: boolean; title: string; message?: string; points?: (Poi & { completed: boolean })[]; readyToClaim?: boolean; claimed?: boolean; medal?: string }
interface Roulette { available: boolean; challenge: null | { id: string; status: string; expiresAt: string; poi: Poi } }

export function TravelActivities() {
  const router = useRouter();
  const selectPoi = usePlayerStore((state) => state.selectPoi);
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const queryClient = useQueryClient();
  const [confirmRoulette, setConfirmRoulette] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { data: expedition } = useQuery<Expedition>({ queryKey: ['game', 'expedition'], queryFn: () => api.get('/game/expedition') });
  const { data: roulette } = useQuery<Roulette>({ queryKey: ['game', 'roulette'], queryFn: () => api.get('/game/roulette'), refetchInterval: 30_000 });

  async function claimExpedition() {
    setBusy(true); setMessage(null);
    try {
      const result = await api.post<{ coins: number; crystals: number; medal: string }>('/game/expedition/claim', {});
      if (user) updateUser({ wallet: { ...user.wallet, coinsBalance: user.wallet.coinsBalance + result.coins, crystalsBalance: user.wallet.crystalsBalance + result.crystals } });
      setMessage(`Получена редкая медаль «${result.medal}» и награда!`);
      await queryClient.invalidateQueries({ queryKey: ['game', 'expedition'] });
      await queryClient.invalidateQueries({ queryKey: ['game', 'leaderboard'] });
    } catch (error) { setMessage(error instanceof ApiError ? error.message : 'Не удалось получить награду'); }
    finally { setBusy(false); }
  }

  async function startRoulette() {
    setBusy(true); setMessage(null);
    try {
      await api.post('/game/roulette', {});
      if (user) updateUser({ wallet: { ...user.wallet, coinsBalance: Math.max(0, user.wallet.coinsBalance - 1000) } });
      await queryClient.invalidateQueries({ queryKey: ['game', 'roulette'] });
      setConfirmRoulette(false);
    } catch (error) { setMessage(error instanceof ApiError ? error.message : 'Не удалось запустить рулетку'); }
    finally { setBusy(false); }
  }

  function openPoint(point: Poi) { selectPoi(point); router.push('/map'); }

  return <section className="mb-5 space-y-3">
    <div className="adventure-card rounded-2xl p-3">
      <div className="mb-2 flex items-center gap-2"><Compass size={18} className="text-brass" /><h2 className="font-display text-sm text-parchment">Великое путешествие</h2></div>
      {expedition?.active ? <>
        <p className="mb-2 text-[11px] text-parchment/65">Открой точки маршрута до конца месяца и получи редкую медаль, 10 000 золота и 100 бриллиантов.</p>
        <div className="space-y-1.5">{expedition.points?.map((point) => <button key={point.id} onClick={() => openPoint(point)} className="flex w-full items-center gap-2 rounded-lg border border-brass/20 bg-black/15 px-2 py-1.5 text-left"><span className="flex-1 truncate text-xs text-parchment">{point.title}</span><span className={point.completed ? 'text-xs text-moss-light' : 'text-[10px] text-stone'}>{point.completed ? '✓ открыто' : 'на карте →'}</span></button>)}</div>
        {expedition.claimed ? <p className="mt-2 flex items-center gap-1 text-xs text-brass"><Medal size={15} /> Медаль получена: {expedition.medal}</p> : expedition.readyToClaim && <button onClick={() => void claimExpedition()} disabled={busy} className="mt-3 w-full rounded-full bg-moss py-2 text-xs text-parchment disabled:opacity-50">{busy ? 'Засчитываем…' : 'Получить награду'}</button>}
      </> : <p className="text-xs text-parchment/60">{expedition?.message ?? 'Маршрут готовится. Загляни сюда позже.'}</p>}
    </div>

    <div className="adventure-card rounded-2xl p-3">
      <div className="mb-2 flex items-center gap-2"><Sparkles size={18} className="text-brass" /><h2 className="font-display text-sm text-parchment">Рулетка путешественника</h2></div>
      <p className="mb-2 text-[11px] text-parchment/65">Заплати 1 000 золота, получи случайную точку и посети её за 24 часа. Успех принесёт 10 000 золота. Попытка доступна раз в день.</p>
      {!roulette ? <p className="text-xs text-stone">Загружаем…</p> : roulette.challenge ? <div className="rounded-xl border border-brass/20 bg-black/15 p-2">
        <p className="text-xs text-parchment">{roulette.challenge.poi.title}</p>
        <p className="mt-1 text-[10px] text-parchment/60">{roulette.challenge.status === 'completed' ? 'Пройдено — награда получена' : roulette.challenge.status === 'expired' ? 'Срок вышел — золото не возвращается' : `Успей до ${new Date(roulette.challenge.expiresAt).toLocaleString('ru-RU')}`}</p>
        {roulette.challenge.status === 'active' && <button onClick={() => openPoint(roulette.challenge!.poi)} className="mt-2 text-xs text-brass">Показать точку на карте →</button>}
      </div> : roulette.available ? <button onClick={() => setConfirmRoulette(true)} className="w-full rounded-full border border-brass/50 py-2 text-xs text-brass">Запустить за 1 000 золота</button> : <p className="text-xs text-stone">Рулетка сегодня уже использована.</p>}
    </div>
    {message && <p className="rounded-xl bg-moss/15 p-2 text-center text-xs text-parchment">{message}</p>}
    {confirmRoulette && <Modal title="Рулетка путешественника" onClose={() => setConfirmRoulette(false)}><div className="text-center">
      <Sparkles size={32} className="mx-auto mb-2 text-brass" />
      <p className="text-sm text-parchment">Суперигра путешественника: получи случайную точку на карте. Посети её в течение 24 часов и выиграй 10 000 золота.</p>
      <p className="mt-2 text-xs text-parchment/60">Вход стоит 1 000 золота. Если не успеешь, золото сгорит. Играть можно раз в день.</p>
      <button onClick={() => void startRoulette()} disabled={busy} className="mt-4 w-full rounded-full bg-moss py-3 text-sm text-parchment">{busy ? 'Запускаем…' : 'Крутим за 1 000 золота'}</button>
    </div></Modal>}
  </section>;
}
