'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import { api, ApiError } from '@/lib/api';

interface ShopItem { id: string; name: string; category: string; priceCoins: number | null; priceCrystals: number | null; rarity: string }

export function ShopPanel() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { data: items = [] } = useQuery<ShopItem[]>({ queryKey: ['shop', 'items'], queryFn: () => api.get<ShopItem[]>('/shop/items') });
  const { data: upgrades, isLoading: upgradesLoading } = useQuery<{ glassesLevel: number; glassesRangeM: number; glovesLevel: number; glovesBonusM: number; items: { kind: 'glasses' | 'gloves'; level: number; meters: number; price: number; image: string }[] }>({ queryKey: ['game', 'shop-upgrades'], queryFn: () => api.get('/game/shop-upgrades') });
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
  return <>
    <p className="mb-4 text-xs text-parchment/65">Улучшения помогают замечать находки дальше и открывать точки, не подходя вплотную.</p>
    {message && <p className="mb-3 rounded-xl bg-forest/10 p-2 text-center text-xs text-forest">{message}</p>}
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
      <div className="rounded-xl border border-dashed border-brass/25 p-3 text-xs text-parchment/60">Выбор другого лагеря появится после загрузки изображений лагерей.</div>
    </div>}
    <div className="grid grid-cols-2 gap-3">{items.map((item) => <div key={item.id} className="rounded-2xl bg-white/50 p-3">
      <div className="mb-2 h-16 rounded-xl bg-gradient-to-br from-moss to-forest" /><p className="mb-1 text-xs text-ink">{item.name}</p>
      <p className="mb-2 font-mono text-xs text-amber-dark">{item.priceCoins != null ? `● ${item.priceCoins}` : `◆ ${item.priceCrystals}`}</p>
      <button onClick={() => buy(item)} disabled={buyingId === item.id} className="w-full rounded-full bg-forest py-1.5 text-[11px] text-parchment disabled:opacity-50">{buyingId === item.id ? '…' : 'Купить'}</button>
    </div>)}{items.length === 0 && <p className="col-span-2 text-sm text-stone">Загрузка…</p>}</div>
  </>;
}
