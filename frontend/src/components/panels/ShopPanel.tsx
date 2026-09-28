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
    <p className="mb-4 text-sm text-stone">Только косметика — никакого влияния на прогресс</p>
    {message && <p className="mb-3 rounded-xl bg-forest/10 p-2 text-center text-xs text-forest">{message}</p>}
    <div className="grid grid-cols-2 gap-3">{items.map((item) => <div key={item.id} className="rounded-2xl bg-white/50 p-3">
      <div className="mb-2 h-16 rounded-xl bg-gradient-to-br from-moss to-forest" /><p className="mb-1 text-xs text-ink">{item.name}</p>
      <p className="mb-2 font-mono text-xs text-amber-dark">{item.priceCoins != null ? `● ${item.priceCoins}` : `◆ ${item.priceCrystals}`}</p>
      <button onClick={() => buy(item)} disabled={buyingId === item.id} className="w-full rounded-full bg-forest py-1.5 text-[11px] text-parchment disabled:opacity-50">{buyingId === item.id ? '…' : 'Купить'}</button>
    </div>)}{items.length === 0 && <p className="col-span-2 text-sm text-stone">Загрузка…</p>}</div>
  </>;
}
