'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import { api, ApiError } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Modal } from '@/components/ui/Modal';

interface ShopItem { id: string; name: string; category: string; priceCoins: number | null; priceCrystals: number | null; rarity: string; assetUrl?: string | null }
interface PendingPurchase { title: string; description: string; price: string; busyId: string; confirm: () => Promise<void> }
const PERMANENT_ITEMS = new Set(['Магнит следопыта', 'Фонарь путешественника', 'Компас искателя', 'Палатка уральская', 'Флаг путешественника']);

export function ShopPanel() {
  const router = useRouter();
  const selectPoi = usePlayerStore((state) => state.selectPoi);
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [changingCamp, setChangingCamp] = useState(false);
  const [pendingCamp, setPendingCamp] = useState<{ id: string; name: string } | null>(null);
  const [pendingPurchase, setPendingPurchase] = useState<PendingPurchase | null>(null);
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
      setPendingPurchase(null);
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
      setPendingPurchase(null);
    } catch (e) { setMessage(e instanceof ApiError ? e.message : 'Не удалось купить предмет'); }
    finally { setBuyingId(null); }
  }
  async function changeCamp(campThemeId: string) {
    if (!user || changingCamp || user.campThemeId === campThemeId) return;
    setChangingCamp(true); setMessage(null);
    try {
      const result = await api.post<{ campThemeId: string; ownedCampThemes: string[]; crystalsBalance: number; purchased: boolean }>('/game/camp/change', { campThemeId });
      updateUser({ campThemeId: result.campThemeId, ownedCampThemes: result.ownedCampThemes, wallet: { ...user.wallet, crystalsBalance: result.crystalsBalance } });
      setPendingCamp(null);
      setMessage(result.purchased ? 'Лагерь куплен и выбран. Теперь его можно переключать бесплатно.' : 'Лагерь переключён бесплатно.');
    } catch (e) { setMessage(e instanceof ApiError ? e.message : 'Не удалось сменить лагерь'); }
    finally { setChangingCamp(false); }
  }
  function chooseCamp(id: string, name: string) {
    if (!user || changingCamp || user.campThemeId === id) return;
    const owned = new Set(user.ownedCampThemes ?? (user.campThemeId ? [user.campThemeId] : []));
    if (owned.has(id)) void changeCamp(id);
    else setPendingCamp({ id, name });
  }
  function confirmBeforePurchase(purchase: PendingPurchase) {
    if (!buyingId) setPendingPurchase(purchase);
  }
  async function upgradeMagnet() {
    if (!magnet?.nextUpgrade || !user) return;
    const price = magnet.nextUpgrade.priceCoins; setBuyingId('magnet'); setMessage(null);
    try {
      await api.post('/crystals/magnet/upgrade', {});
      updateUser({ wallet: { ...user.wallet, coinsBalance: user.wallet.coinsBalance - price } });
      await queryClient.invalidateQueries({ queryKey: ['crystals', 'magnet-status'] });
      setPendingPurchase(null);
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
      setPendingPurchase(null);
      setMessage(`Рулетка выбрала: ${result.poi.title}`);
    } catch (e) { setMessage(e instanceof ApiError ? e.message : 'Не удалось купить точку'); }
    finally { setBuyingId(null); }
  }
  return <>
    <p className="mb-4 text-xs text-parchment/65">Улучшения помогают замечать находки дальше и открывать точки, не подходя вплотную.</p>
    {message && <p className="mb-3 rounded-xl border border-brass/25 bg-forest/35 p-2 text-center text-xs text-parchment">{message}</p>}
    <section className="mb-4 rounded-2xl border border-brass/30 bg-panel/80 p-3 shadow-lg"><h3 className="font-display text-sm text-parchment">Случайная находка</h3><p className="my-1 text-[10px] text-parchment/60">Откроем карточку новой точки: памятник, историческое или редкое место.</p><button onClick={() => confirmBeforePurchase({ title: 'Случайная точка', description: 'Открыть случайную новую точку на карте.', price: '20 бриллиантов', busyId: 'random-point', confirm: buyRandomPoint })} disabled={!!buyingId} className="w-full rounded-full border border-brass/50 bg-moss py-2 text-xs text-parchment shadow disabled:opacity-50">Получить случайную точку · 20 💎</button></section>
    {upgradesLoading ? <p className="mb-4 text-xs text-stone">Загружаем улучшения…</p> : upgrades && <div className="mb-5 space-y-3">
      {(['glasses', 'gloves'] as const).map((kind) => {
        const currentLevel = kind === 'glasses' ? upgrades.glassesLevel : upgrades.glovesLevel;
        const currentValue = kind === 'glasses' ? upgrades.glassesRangeM : upgrades.glovesBonusM;
        const title = kind === 'glasses' ? 'Очки следопыта' : 'Перчатки исследователя';
        const description = kind === 'glasses' ? `Сейчас находки видны в радиусе ${currentValue >= 1000 ? `${currentValue / 1000} км` : `${currentValue} м`}.` : `Сейчас можно открывать места и собирать бриллианты ещё на ${currentValue} м дальше.`;
        const next = upgrades.items.find((item) => item.kind === kind && item.level === currentLevel + 1);
        return <section key={kind} className="rounded-2xl border border-brass/30 bg-panel/80 p-3 shadow-lg">
          <div className="flex items-center gap-3"><img src={kind === 'glasses' ? '/assets/shop/glasses.png' : '/assets/shop/gloves.png'} alt="" className="h-14 w-14 rounded-xl object-contain" /><div><h3 className="font-display text-sm text-parchment">{title}</h3><p className="text-[10px] text-parchment/60">{description}</p></div></div>
          {next ? <button onClick={() => confirmBeforePurchase({ title: `${title}: улучшение`, description: `Улучшить до ${kind === 'glasses' ? `${next.meters / 1000} км` : `+${next.meters} м`}.`, price: `${next.price.toLocaleString('ru-RU')} золота`, busyId: `${kind}-${next.level}`, confirm: () => buyUpgrade(kind, next.level, next.price) })} disabled={!!buyingId} className="mt-3 w-full rounded-full border border-brass/50 bg-moss py-2 text-xs text-parchment shadow disabled:opacity-50">Улучшить · {next.price.toLocaleString('ru-RU')} золота</button> : <p className="mt-3 text-center text-[11px] text-brass">Максимальный уровень открыт</p>}
        </section>;
      })}
      <section className="rounded-2xl border border-brass/30 bg-panel/80 p-3 shadow-lg">
        <h3 className="mb-1 font-display text-sm text-parchment">Мои лагеря</h3>
        <p className="mb-2 text-[10px] text-parchment/60">Первый лагерь уже открыт. Новый стоит 20 💎; открытые лагеря можно переключать бесплатно.</p>
        <div className="grid grid-cols-2 gap-2">{[
          ['zyuratkul', 'Зюраткуль'], ['nurgush', 'Нургуш'], ['taganay', 'Таганай'], ['ural', 'Урал'],
        ].map(([id, name]) => {
          const owned = user?.ownedCampThemes?.includes(id) ?? user?.campThemeId === id;
          const selected = user?.campThemeId === id;
          return <button key={id} onClick={() => chooseCamp(id, name)} disabled={changingCamp || selected} className="rounded-xl border border-brass/30 bg-black/20 px-3 py-2 text-xs text-parchment disabled:opacity-50">{selected ? `${name} · выбран` : owned ? `${name} · выбрать бесплатно` : `${name} · купить 20 💎`}</button>;
        })}</div>
      </section>
      {magnet?.owned && <section className="rounded-2xl border border-brass/30 bg-panel/80 p-3 shadow-lg"><h3 className="font-display text-sm text-parchment">Магнит для бриллиантов</h3><p className="mt-1 text-[10px] text-parchment/60">Собирает все видимые бриллианты разом. Перезарядка: {magnet.cooldownMinutes} мин.</p>{magnet.nextUpgrade && <button onClick={() => confirmBeforePurchase({ title: 'Улучшить магнит', description: `Сократить перезарядку до ${magnet.nextUpgrade!.cooldownMinutes} минут.`, price: `${magnet.nextUpgrade.priceCoins.toLocaleString('ru-RU')} золота`, busyId: 'magnet', confirm: upgradeMagnet })} disabled={!!buyingId} className="mt-2 w-full rounded-full border border-brass/50 bg-moss py-2 text-xs text-parchment shadow">Улучшить · {magnet.nextUpgrade.priceCoins.toLocaleString('ru-RU')} золота</button>}</section>}
    </div>}
    <div className="grid grid-cols-2 gap-3">{items.map((item) => { const owned = PERMANENT_ITEMS.has(item.name) && inventory.some((entry) => entry.shopItem.name === item.name); return <div key={item.id} className="rounded-2xl border border-brass/30 bg-panel/80 p-3 shadow-lg">
      <div className="mb-2 flex h-20 items-center justify-center rounded-xl border border-brass/15 bg-black/20">{item.assetUrl ? <img src={item.assetUrl} alt="" className="h-full w-full object-contain p-2" /> : <span className="text-3xl text-brass">✦</span>}</div><p className="mb-1 min-h-8 text-xs text-parchment">{item.name}</p>
      <p className="mb-2 font-mono text-xs text-brass">{item.priceCoins != null ? `Цена: ${item.priceCoins.toLocaleString('ru-RU')} золота` : `Цена: ${item.priceCrystals ?? 0} бриллиантов`}</p>
      <button onClick={() => confirmBeforePurchase({ title: item.name, description: 'Подтвердите покупку этого предмета.', price: item.priceCoins != null ? `${item.priceCoins.toLocaleString('ru-RU')} золота` : `${item.priceCrystals ?? 0} бриллиантов`, busyId: item.id, confirm: () => buy(item) })} disabled={!!buyingId || owned} className="w-full rounded-full border border-brass/50 bg-moss py-1.5 text-[11px] text-parchment shadow disabled:opacity-50">{owned ? 'Уже есть' : 'Купить'}</button>
    </div>; })}{items.length === 0 && <p className="col-span-2 text-sm text-stone">Загрузка…</p>}</div>
    {pendingCamp && <Modal title="Купить новый лагерь?" onClose={() => { if (!changingCamp) setPendingCamp(null); }}>
      <p className="text-sm text-parchment">Открыть лагерь «{pendingCamp.name}» за 20 💎?</p>
      <p className="mt-2 text-xs text-parchment/65">После покупки вы сможете переключаться между всеми открытыми лагерями бесплатно.</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={() => setPendingCamp(null)} disabled={changingCamp} className="rounded-full border border-brass/40 bg-black/25 py-2 text-sm text-parchment disabled:opacity-50">Отмена</button>
        <button onClick={() => void changeCamp(pendingCamp.id)} disabled={changingCamp} className="rounded-full border border-brass/50 bg-moss py-2 text-sm text-parchment disabled:opacity-50">{changingCamp ? 'Покупаем…' : 'Купить за 20 💎'}</button>
      </div>
    </Modal>}
    {pendingPurchase && <Modal title="Подтвердить покупку" onClose={() => { if (!buyingId) setPendingPurchase(null); }}>
      <div className="text-center">
        <p className="font-display text-base text-parchment">{pendingPurchase.title}</p>
        <p className="mt-2 text-sm text-parchment/70">{pendingPurchase.description}</p>
        <p className="mt-4 rounded-xl border border-brass/40 bg-black/25 p-3 text-sm font-semibold text-brass">К оплате: {pendingPurchase.price}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={() => setPendingPurchase(null)} disabled={!!buyingId} className="rounded-full border border-brass/40 bg-black/25 py-2 text-sm text-parchment disabled:opacity-50">Отмена</button>
          <button onClick={() => void pendingPurchase.confirm()} disabled={!!buyingId} className="rounded-full border border-brass/50 bg-moss py-2 text-sm text-parchment disabled:opacity-50">{buyingId === pendingPurchase.busyId ? 'Покупаем…' : `Оплатить ${pendingPurchase.price}`}</button>
        </div>
      </div>
    </Modal>}
  </>;
}
