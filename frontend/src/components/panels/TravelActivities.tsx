'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Compass, Sparkles } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Poi } from '@/types';
import { useAuthStore } from '@/store/useAuthStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Modal } from '@/components/ui/Modal';
import { announceAchievement } from '@/lib/achievement-notice';

interface ExpeditionStage { category: string; title: string; target: number; completed: number; locked: boolean; point: Poi | null }
interface Expedition { endsAt?: string; stages?: ExpeditionStage[]; active: boolean; title: string; message?: string; stageIndex?: number; points?: (Poi & { completed: boolean; locked?: boolean })[]; readyToClaim?: boolean; claimed?: boolean; medal?: string }
interface Roulette { available: boolean; remaining: number; used: number; challenge: null | { id: string; spinIndex: number; status: string; expiresAt: string; poi: Poi | null; rewardCoins: number; rewardCrystals: number } }

export function TravelActivities() {
  const router = useRouter();
  const selectPoi = usePlayerStore((state) => state.selectPoi);
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const queryClient = useQueryClient();
  const [confirmRoulette, setConfirmRoulette] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { data: expedition } = useQuery<Expedition>({ queryKey: ['game', 'expedition'], queryFn: () => api.get('/game/expedition'), refetchInterval: 60_000 });
  const { data: roulette } = useQuery<Roulette>({ queryKey: ['game', 'roulette'], queryFn: () => api.get('/game/roulette'), refetchInterval: 30_000 });

  async function claimExpedition() {
    setBusy(true); setMessage(null);
    try {
      const result = await api.post<{ coins: number; crystals: number; medal: string }>('/game/expedition/claim', {});
      if (user) updateUser({ wallet: { ...user.wallet, coinsBalance: user.wallet.coinsBalance + result.coins, crystalsBalance: user.wallet.crystalsBalance + result.crystals } });
      setMessage(`Получена редкая медаль «${result.medal}» и награда!`);
      announceAchievement({ title: 'Великое путешествие завершено!', description: `Получена редкая медаль «${result.medal}».`, reward: `+${result.coins.toLocaleString('ru-RU')} золота · +${result.crystals} 💎` });
      await queryClient.invalidateQueries({ queryKey: ['game', 'expedition'] });
      await queryClient.invalidateQueries({ queryKey: ['game', 'leaderboard'] });
    } catch (error) { setMessage(error instanceof ApiError ? error.message : 'Не удалось получить награду'); }
    finally { setBusy(false); }
  }

  async function startRoulette() {
    setBusy(true); setMessage(null);
    try {
      const coords = await new Promise<GeolocationCoordinates>((resolve, reject) => navigator.geolocation.getCurrentPosition((position) => resolve(position.coords), () => reject(new Error('Разрешите доступ к геолокации, чтобы выбрать точку в пределах 20 км.')), { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }));
      const result = await api.post<{ poi: Poi | null; rewardCoins: number; rewardCrystals: number }>('/game/roulette', { lat: coords.latitude, lng: coords.longitude });
      if (user) updateUser({ wallet: { ...user.wallet, coinsBalance: Math.max(0, user.wallet.coinsBalance - 200 + result.rewardCoins), crystalsBalance: user.wallet.crystalsBalance + result.rewardCrystals } });
      setMessage(result.poi ? `Рулетка выбрала: ${result.poi.title}` : `Выпал приз: ${result.rewardCoins ? `${result.rewardCoins} золота` : `${result.rewardCrystals} бриллиантов`}`);
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
        <p className="mb-3 text-xs leading-relaxed text-parchment/70">Пройди по очереди 7 городов, 7 озёр и 7 гор. После каждого открытия здесь появится следующее место. Уже исследованные точки засчитываются автоматически.</p>
        <p className="mb-3 text-[11px] text-brass">Награда: медаль, 50 000 золота и 50 бриллиантов. Новый маршрут — 1-го числа каждого месяца.</p>
        {expedition.endsAt && <p className="mb-3 text-[10px] text-parchment/55">Этот маршрут доступен до {new Date(expedition.endsAt).toLocaleDateString('ru-RU', { timeZone: 'Asia/Yekaterinburg' })}, 00:00 по Екатеринбургу.</p>}
        <div className="space-y-2">{expedition.stages?.map((stage, index) => <div key={stage.category} className={`rounded-xl border border-brass/25 bg-black/15 p-3 ${stage.locked ? 'opacity-50' : ''}`}>
          <div className="flex items-center justify-between gap-2 text-sm"><span className="font-display text-parchment">{index + 1}. {stage.title}</span><span className="text-brass">{stage.completed}/{stage.target}</span></div>
          <div className="mt-2 flex gap-1" aria-label={`${stage.completed} из ${stage.target}`}>{Array.from({ length: stage.target }, (_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i < stage.completed ? 'bg-moss-light' : 'bg-parchment/15'}`} />)}</div>
          {stage.locked ? <p className="mt-2 text-xs text-parchment/60">Откроется после предыдущего этапа</p> : stage.point ? <button onClick={() => openPoint(stage.point!)} className="mt-2 flex min-h-11 w-full items-center justify-between gap-2 text-left text-xs text-brass"><span>{stage.point.title}</span><span aria-hidden="true">→</span></button> : <p className="mt-2 text-xs text-moss-light">Все 7 мест исследованы ✓</p>}
        </div>)}</div>
        {expedition.claimed ? <p className="mt-2 flex items-center gap-1 text-xs text-brass"><img src="/assets/icons/medal-expedition.png" alt="" className="h-6 w-6 shrink-0 object-contain" /> Медаль получена: {expedition.medal}</p> : expedition.readyToClaim && <button onClick={() => void claimExpedition()} disabled={busy} className="mt-3 w-full rounded-full bg-moss py-2 text-xs text-parchment disabled:opacity-50">{busy ? 'Засчитываем…' : 'Получить награду'}</button>}
      </> : <p className="text-xs text-parchment/60">{expedition?.message ?? 'Маршрут готовится. Загляни сюда позже.'}</p>}
    </div>

    <div className="adventure-card rounded-2xl p-3">
      <div className="mb-2 flex items-center gap-2"><Sparkles size={18} className="text-brass" /><h2 className="font-display text-sm text-parchment">Рулетка путешественника</h2></div>
      <p className="mb-2 text-[11px] text-parchment/65">200 золота за попытку · до 10 раз за календарный день. Обычно выпадает новая точка в радиусе 20 км: успей исследовать её за 24 часа и получи +1 бриллиант и +1000 золота сверху обычной награды за точку. Иногда вместо точки выпадает денежный приз.</p>
      {!roulette ? <p className="text-xs text-stone">Загружаем…</p> : <>
        {roulette.challenge && <div className="mb-2 rounded-xl border border-brass/20 bg-black/15 p-2">
          <p className="text-[10px] text-brass">Попытка {roulette.challenge.spinIndex}</p>
          {roulette.challenge.poi ? <><p className="text-xs text-parchment">{roulette.challenge.poi.title}</p><p className="mt-1 text-[10px] text-parchment/60">{roulette.challenge.status === 'completed' ? 'Точка открыта · +1 бриллиант и +1000 золота плюс награда точки' : roulette.challenge.status === 'expired' ? 'Срок вышел' : `Успей до ${new Date(roulette.challenge.expiresAt).toLocaleString('ru-RU')}`}</p>{roulette.challenge.status === 'active' && <button onClick={() => openPoint(roulette.challenge!.poi!)} className="mt-2 text-xs text-brass">Показать точку на карте →</button>}</> : <p className="text-xs text-parchment">{roulette.challenge.rewardCoins ? `Приз: ${roulette.challenge.rewardCoins.toLocaleString('ru-RU')} золота` : `Приз: ${roulette.challenge.rewardCrystals} 💎`}</p>}
        </div>}
        {roulette.available ? <button onClick={() => setConfirmRoulette(true)} className="w-full rounded-full border border-brass/50 py-2 text-xs text-brass">Крутить за 200 золота · осталось {roulette.remaining}</button> : <p className="text-xs text-stone">Попытки на сегодня закончились.</p>}
      </>}
    </div>
    {message && <p className="rounded-xl bg-moss/15 p-2 text-center text-xs text-parchment">{message}</p>}
    {confirmRoulette && <Modal title="Рулетка путешественника" onClose={() => setConfirmRoulette(false)}><div className="text-center">
      <Sparkles size={32} className="mx-auto mb-2 text-brass" />
      <p className="text-sm text-parchment">Исследуй предложенную точку в течение 24 часов и получи 1000 золота, 1 бриллиант и награду за саму точку. Также есть шанс выиграть золото.</p>
      <p className="mt-2 text-xs text-parchment/60">Одна попытка стоит 200 золота. Можно крутить до 10 раз в день.</p>
      <button onClick={() => void startRoulette()} disabled={busy} className="mt-4 w-full rounded-full bg-moss py-3 text-sm text-parchment">{busy ? 'Запускаем…' : 'Крутим за 200 золота'}</button>
    </div></Modal>}
  </section>;
}
