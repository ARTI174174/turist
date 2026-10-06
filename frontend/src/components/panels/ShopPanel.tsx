'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import { api, ApiError } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { usePlayerStore } from '@/store/usePlayerStore';

interface ShopItem { id: string; name: string; category: string; priceCoins: number | null; priceCrystals: number | null; rarity: string }
const PERMANENT_ITEMS = new Set(['Магнит следопыта', 'Фонарь путешественника', 'Компас искателя', 'Палатка уральская', 'Флаг путешественника']);

export function ShopPanel() {
  const router = useRouter();
  const selectPoi = usePlayerStore((state) => state.selectPoi);
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [changingCamp, setChangingCamp] = useState(false);
  const queryClient = useQueryClient();
  const { data: items = [] } = useQuery<ShopItem[]>({ queryKey: ['shop', 'items'], queryFn: () => api.get<ShopItem[]>('/shop/items') });
  const { data: inventory = [] } = useQuery<{ shopItem: { name: string } }[]>({ queryKey: ['inventory'], queryFn: () => api.get('/inventory') });
  const { data: upgrades, isLoading: upgradesLoading } = useQuery<{ glassesLevel: number; glassesRangeM: number; glovesLevel: number; glovesBonusM: number; items: { kind: 'glasses' | 'gloves'; level: number; meters: number; price: number; image: string }[] }>({ queryKey: ['game', 'shop-upgrades'], queryFn: () => api.get('/game/shop-upgrades') });
  const { data: magnet } = useQuery<{ owned: boolean; level: number; cooldownMinutes: number; nextUpgrade: null | { level: number; cooldownMinutes: number; priceCoins: number } }>({ queryKey: ['crystals', 'magnet-status'], queryFn: () => api.get('/crystals/magnet/status') });
  async function buyUpgrade(kind: 'glasses' | 'gloves', level: number, price: number) {
    const id = `${kind}-${level}`; setBuyingId(id); setMessage(null);
    try {
      await api.post('/game/shop-upgrades', { kind, level });
      await queryClient.invalidateQueries({ queryKey: ['game', 'shop-upgrades'] });
      await queryClient.invalidateQueries({ queryKey: ['poi', 'list'] });
      await queryClient.invalidateQueries({ queryKey: ['game', 'secrets', 'nearby'] });
      await queryClient.invalidateQueries({ queryKey: ['crystals', 'nearby'] });
      if (user) updateUser({ wallet: { ...user.wallet, coinsBalance: user.wallet.coinsBalance - price } });
      setMessage('Улучшение куплено');
    } catch (e) { setMessage(e instanceof ApiError ? e.message : 'Не удалось купить улучшение'); }
    finally { setBuyingId(null); }
  }
  async function buy(item: ShopItem) {
    setBuyingId(item.id); setMessage(null);
    try {
      await api.post('/shop/purchase', { shopItemId: item.id });
      setMessage(`Куплено: ${item.name}`); queryClient.invalidateQueries({ queryKey: ['inventory'] });
      if (user) updateUser({ wallet: { ...user.wallet, coinsBalance: user.wallet.coinsBalance - (item.priceCoins ?? 0), crystalsBalance: user.wallet.crystalsBalance - (item.priceCrystals ?? 0) } });
    } catch (e) { setMessage(e instanceof ApiError ? e.message : 'Не удалось купить предмет'); }
    finally { setBuyingId(null); }
  }
  async function changeCamp(campThemeId: string) {
    if (!user || changingCamp || user.campThemeId === campThemeId) return;
    setChangingCamp(true); setMessage(null);
    try {
      const result = await api.post<{ campThemeId: string; crystalsBalance: number }>('/game/camp/change', { campThemeId });
      updateUser({ campThemeId: result.campThemeId, wallet: { ...user.wallet, crystalsBalance: result.crystalsBalance } });
      setMessage('Лагерь изменён');
    } catch (e) { setMessage(e instanceof ApiError ? e.message : 'Не удалось сменить лагерь'); }
    finally { setChangingCamp(false); }
  }
  async function upgradeMagnet() {
    if (!magnet?.nextUpgrade || !user) return;
    const price = magnet.nextUpgrade.priceCoins; setBuyingId('magnet'); setMessage(null);
    try {
      await api.post('/crystals/magnet/upgrade', {});
      updateUser({ wallet: { ...user.wallet, coinsBalance: user.wallet.coinsBalance - price } });
      await queryClient.invalidateQueries({ queryKey: ['crystals', 'magnet-status'] });
      setMessage('Магнит стал перезаряжаться быстрее.');
    } catch (e) { setMessage(e instanceof ApiError ? e.message : 'Не удалось улучшить магнит'); }
    finally { setBuyingId(null); }
  }
  async function buyRandomPoint() {
    if (!user || buyingId) return;
    setBuyingId('random-point'); setMessage(null);
    try {
      const result = await api.post<{ poi: import('@/types').Poi; crystalsBalance: number }>('/game/shop/random-point', {});
      updateUser({ wallet: { ...user.wallet, crystalsBalance: result.crystalsBalance } });
      selectPoi(result.poi); router.push('/map');
      setMessage(`Рулетка выбрала: ${result.poi.title}`);
    } catch (e) { setMessage(e instanceof ApiError ? e.message : 'Не удалось купить точку'); }
    finally { setBuyingId(null); }
  }
  return <>
    <p className="mb-4 text-xs text-parchment/65">Улучшения помогают замечать находки дальше и открывать точки, не подходя вплотную.</p>
    {message && <p className="mb-3 rounded-xl bg-forest/10 p-2 text-center text-xs text-forest">{message}</p>}
    <section className="mb-4 rounded-2xl border border-brass/30 bg-black/20 p-3"><h3 className="font-display text-sm text-parchment">Случайная находка</h3><p className="my-1 text-[10px] text-parchment/60">Откроем карточку новой точки: памятник, историческое или редкое место.</p><button onClick={() => void buyRandomPoint()} disabled={!!buyingId} className="w-full rounded-full bg-moss py-2 text-xs text-parchment disabled:opacity-50">{buyingId === 'random-point' ? 'Ищем…' : 'Получить случайную точку · 20 💎'}</button></section>
    {upgradesLoading ? <p className="mb-4 text-xs text-stone">Загружаем улучшения…</p> : upgrades && <div className="mb-5 space-y-3">
      {(['glasses', 'gloves'] as const).map((kind) => {
        const currentLevel = kind === 'glasses' ? upgrades.glassesLevel : upgrades.glovesLevel;
        const currentValue = kind === 'glasses' ? upgrades.glassesRangeM : upgrades.glovesBonusM;
        const title = kind === 'glasses' ? 'Очки следопыта' : 'Перчатки исследователя';
        const description = kind === 'glasses' ? `Сейчас находки видны в радиусе ${currentValue >= 1000 ? `${currentValue / 1000} км` : `${currentValue} м`}.` : `Сейчас можно открывать места и собирать бриллианты ещё на ${currentValue} м дальше.`;
        const next = upgrades.items.find((item) => item.kind === kind && item.level === currentLevel + 1);
        return <section key={kind} className="rounded-2xl border border-brass/30 bg-black/20 p-3">
          <div className="flex items-center gap-3"><img src={kind === 'glasses' ? '/assets/shop/glasses.png' : '/assets/shop/gloves.png'} alt="" className="h-14 w-14 rounded-xl object-contain" /><div><h3 className="font-display text-sm text-parchment">{title}</h3><p className="text-[10px] text-parchment/60">{description}</p></div></div>
          {next ? <button onClick={() => void buyUpgrade(kind, next.level, next.price)} disabled={buyingId === `${kind}-${next.level}`} className="mt-3 w-full rounded-full bg-moss py-2 text-xs text-parchment disabled:opacity-50">{buyingId === `${kind}-${next.level}` ? 'Покупаем…' : `Улучшить до ${kind === 'glasses' ? `${next.meters / 1000} км` : `+${next.meters} м`} · ${next.price.toLocaleString('ru-RU')} золота`}</button> : <p className="mt-3 text-center text-[11px] text-brass">Максимальный уровень открыт</p>}
        </section>;
      })}
      <section className="rounded-2xl border border-brass/30 bg-black/20 p-3">
        <h3 className="mb-1 font-display text-sm text-parchment">Лагерь · 20 💎</h3>
        <p className="mb-2 text-[10px] text-parchment/60">Смена места лагеря стоит 20 бриллиантов.</p>
        <div className="grid grid-cols-2 gap-2">{[
          ['zyuratkul', 'Зюраткуль'], ['nurgush', 'Нургуш'], ['taganay', 'Таганай'], ['ural', 'Урал'],
        ].map(([id, name]) => <button key={id} onClick={() => void changeCamp(id)} disabled={changingCamp || user?.campThemeId === id} className="rounded-full border border-brass/30 px-3 py-2 text-xs text-parchment disabled:opacity-40">{user?.campThemeId === id ? `${name} · выбран` : name}</button>)}</div>
      </section>
      {magnet?.owned && <section className="rounded-2xl border border-brass/30 bg-black/20 p-3"><h3 className="font-display text-sm text-parchment">Магнит для бриллиантов</h3><p className="mt-1 text-[10px] text-parchment/60">Собирает все видимые бриллианты разом. Перезарядка: {magnet.cooldownMinutes} мин.</p>{magnet.nextUpgrade && <button onClick={() => void upgradeMagnet()} disabled={buyingId === 'magnet'} className="mt-2 w-full rounded-full bg-moss py-2 text-xs text-parchment">Улучшить до {magnet.nextUpgrade.cooldownMinutes} мин. · {magnet.nextUpgrade.priceCoins.toLocaleString('ru-RU')} золота</button>}</section>}
    </div>}
    <div className="grid grid-cols-2 gap-3">{items.map((item) => { const owned = PERMANENT_ITEMS.has(item.name) && inventory.some((entry) => entry.shopItem.name === item.name); return <div key={item.id} className="rounded-2xl bg-white/50 p-3">
      <div className="mb-2 h-16 rounded-xl bg-gradient-to-br from-moss to-forest" /><p className="mb-1 text-xs text-ink">{item.name}</p>
      <p className="mb-2 font-mono text-xs text-amber-dark">{item.priceCoins != null ? `● ${item.priceCoins}` : `◆ ${item.priceCrystals}`}</p>
      <button onClick={() => void buy(item)} disabled={buyingId === item.id || owned} className="w-full rounded-full bg-forest py-1.5 text-[11px] text-parchment disabled:opacity-50">{buyingId === item.id ? '…' : owned ? 'Уже есть' : 'Купить'}</button>
    </div>; })}{items.length === 0 && <p className="col-span-2 text-sm text-stone">Загрузка…</p>}</div>
  </>;
}
