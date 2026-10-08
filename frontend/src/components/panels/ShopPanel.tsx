'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import { api, ApiError } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { usePlayerStore } from '@/store/usePlayerStore';
import { CurrencyAmount } from '@/components/ui/CurrencyAmount';
import { Modal } from '@/components/ui/Modal';
import { Check, Compass, Gem, MapPin, Package, ShoppingBag, Sparkles, Tent } from 'lucide-react';

interface ShopItem { id: string; name: string; category: string; priceCoins: number | null; priceCrystals: number | null; rarity: string; assetUrl?: string | null }
interface PendingPurchase { title: string; description: string; amount: number; currency: 'coins' | 'crystals'; busyId: string; confirm: () => Promise<void> }
const PERMANENT_ITEMS = new Set(['Магнит следопыта', 'Фонарь путешественника', 'Компас искателя', 'Палатка уральская', 'Флаг путешественника']);
const REMOVED_SHOP_ITEMS = new Set(['Тёплая куртка "Урал"', 'Рюкзак "Следопыт"', 'Ушанка "Легенда Урала"', 'Питомец: Уральский лис']);
const SHOP_ITEM_ASSETS: Record<string, string> = {
  'Магнит следопыта': '/assets/shop/magnet.png?v=2',
  'Фонарь путешественника': '/assets/shop/flashlight.png?v=2',
  'Компас искателя': '/assets/shop/compass.png?v=2',
  'Палатка уральская': '/assets/shop/tent.png?v=2',
  'Флаг путешественника': '/assets/shop/flag.png?v=2',
};
const CAMP_THEMES = [
    { id: 'zyuratkul', name: 'Зюраткуль', image: 'zyuratkul.webp' },
    { id: 'nurgush', name: 'Нургуш', image: 'nurgush.webp' },
    { id: 'taganay', name: 'Таганай', image: 'taganay.webp' },
    { id: 'ural', name: 'Урал', image: 'ural.webp' },
] as const;

type ShopSection = 'upgrades' | 'camp' | 'gear';

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
  const [activeSection, setActiveSection] = useState<ShopSection>('upgrades');
  const queryClient = useQueryClient();
  const { data: items = [], isLoading: itemsLoading, isError: itemsError } = useQuery<ShopItem[]>({ queryKey: ['shop', 'items'], queryFn: () => api.get<ShopItem[]>('/shop/items') });
  const visibleItems = items.filter((item) => !REMOVED_SHOP_ITEMS.has(item.name));
  const { data: inventory = [] } = useQuery<{ shopItem: { name: string } }[]>({ queryKey: ['inventory'], queryFn: () => api.get('/inventory') });
  const { data: upgrades, isLoading: upgradesLoading } = useQuery<{ glassesLevel: number; glassesRangeM: number; glovesLevel: number; glovesBonusM: number; items: { kind: 'glasses' | 'gloves'; level: number; meters: number; price: number; image: string }[] }>({ queryKey: ['game', 'shop-upgrades'], queryFn: () => api.get('/game/shop-upgrades') });
  const { data: magnet } = useQuery<{ owned: boolean; level: number; cooldownMinutes: number; nextUpgrade: null | { level: number; cooldownMinutes: number; priceCoins: number } }>({ queryKey: ['crystals', 'magnet-status'], queryFn: () => api.get('/crystals/magnet/status') });
  const magnetUpgrade = magnet?.nextUpgrade;
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
  const sections: { id: ShopSection; title: string; icon: typeof Compass }[] = [
    { id: 'upgrades', title: 'Улучшения', icon: Compass },
    { id: 'camp', title: 'Лагеря', icon: Tent },
    { id: 'gear', title: 'Снаряжение', icon: ShoppingBag },
  ];

  return <>
    <section className="adventure-card mb-4 rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <span className="passport-stamp h-12 w-12 shrink-0"><Compass size={23} aria-hidden="true" /></span>
        <div><p className="font-display text-base text-parchment">Всё для похода</p><p className="mt-0.5 text-xs leading-relaxed text-parchment/75">Улучшай снаряжение, выбирай лагерь и готовься к новым открытиям.</p></div>
      </div>
    </section>
    {message && <p role="status" aria-live="polite" className="adventure-card mb-3 rounded-xl px-3 py-2.5 text-sm text-parchment">{message}</p>}

    <div role="group" aria-label="Разделы магазина" className="mb-3 grid grid-cols-3 gap-1.5">
      {sections.map(({ id, title, icon: Icon }) => <button key={id} type="button" aria-pressed={activeSection === id} onClick={() => setActiveSection(id)} className={`flex min-h-10 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border px-1 text-[10px] leading-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-light ${activeSection === id ? 'border-brass bg-moss text-parchment shadow-md' : 'border-brass/35 bg-panel/70 text-parchment/80'}`}>
        <Icon size={13} aria-hidden="true" /><span className="whitespace-nowrap">{title}</span>
      </button>)}
    </div>

    {activeSection === 'upgrades' && <div className="space-y-3">
      <section className="adventure-card rounded-2xl p-3">
        <div className="mb-3 flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brass/25 bg-black/20 text-amber-light"><MapPin size={21} aria-hidden="true" /></span><div><h2 className="font-display text-base text-parchment">Случайная находка</h2><p className="mt-1 text-sm leading-relaxed text-parchment/75">Откроем новую точку на карте: памятник, историческое или редкое место.</p></div></div>
        <button onClick={() => confirmBeforePurchase({ title: 'Случайная точка', description: 'Открыть случайную новую точку на карте.', amount: 20, currency: 'crystals', busyId: 'random-point', confirm: buyRandomPoint })} disabled={!!buyingId} className="shop-buy-button">Случайная точка · <CurrencyAmount amount={20} currency="crystals" /></button>
      </section>

      {upgradesLoading ? <p role="status" className="adventure-card rounded-2xl p-3 text-sm text-parchment/80">Загружаем улучшения…</p> : upgrades && <>
        {(['glasses', 'gloves'] as const).map((kind) => {
          const currentLevel = kind === 'glasses' ? upgrades.glassesLevel : upgrades.glovesLevel;
          const currentValue = kind === 'glasses' ? upgrades.glassesRangeM : upgrades.glovesBonusM;
          const title = kind === 'glasses' ? 'Очки следопыта' : 'Перчатки исследователя';
          const description = kind === 'glasses' ? `Находки видны в радиусе ${currentValue >= 1000 ? `${currentValue / 1000} км` : `${currentValue} м`}.` : `Точки открываются ещё на ${currentValue} м дальше.`;
          const next = upgrades.items.find((item) => item.kind === kind && item.level === currentLevel + 1);
          return <section key={kind} className="adventure-card rounded-2xl p-3">
            <div className="flex items-center gap-3"><span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl border border-brass/25 bg-black/20"><img src={kind === 'glasses' ? '/assets/shop/glasses.png?v=2' : '/assets/shop/gloves.png?v=2'} alt="" className="h-14 w-14 object-contain" /></span><div className="min-w-0"><h2 className="font-display text-base text-parchment">{title}</h2><p className="mt-1 text-sm leading-relaxed text-parchment/75">{description}</p></div></div>
            {next ? <button onClick={() => confirmBeforePurchase({ title: `${title}: улучшение`, description: `Улучшить до ${kind === 'glasses' ? `${next.meters / 1000} км` : `+${next.meters} м`}.`, amount: next.price, currency: 'coins', busyId: `${kind}-${next.level}`, confirm: () => buyUpgrade(kind, next.level, next.price) })} disabled={!!buyingId} className="shop-buy-button mt-3">Улучшить · <CurrencyAmount amount={next.price} currency="coins" /></button> : <p className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-brass/25 bg-black/15 py-3 text-sm text-amber-light"><Check size={16} aria-hidden="true" />Максимальный уровень открыт</p>}
          </section>;
        })}
        {magnet?.owned && <section className="adventure-card rounded-2xl p-3"><div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brass/25 bg-black/20 text-amber-light"><Gem size={20} aria-hidden="true" /></span><div><h2 className="font-display text-base text-parchment">Магнит для бриллиантов</h2><p className="mt-1 text-sm leading-relaxed text-parchment/75">Собирает видимые бриллианты разом. Перезарядка: {magnet.cooldownMinutes} мин.</p></div></div>{magnetUpgrade && <button onClick={() => confirmBeforePurchase({ title: 'Улучшить магнит', description: `Сократить перезарядку до ${magnetUpgrade.cooldownMinutes} минут.`, amount: magnetUpgrade.priceCoins, currency: 'coins', busyId: 'magnet', confirm: upgradeMagnet })} disabled={!!buyingId} className="shop-buy-button mt-3">Улучшить · <CurrencyAmount amount={magnetUpgrade.priceCoins} currency="coins" /></button>}</section>}
      </>}
    </div>}

    {activeSection === 'camp' && <section aria-label="Мои лагеря" className="space-y-3">
      <div className="adventure-card rounded-2xl p-3"><h2 className="font-display text-base text-parchment">Мои лагеря</h2><p className="mt-1 text-xs leading-relaxed text-parchment/75">Первый лагерь уже открыт. Новый стоит <CurrencyAmount amount={20} currency="crystals" />, а между купленными можно переключаться бесплатно.</p></div>
      <div className="grid grid-cols-2 gap-3">{CAMP_THEMES.map(({ id, name, image }) => {
        const owned = user?.ownedCampThemes?.includes(id) ?? user?.campThemeId === id;
        const selected = user?.campThemeId === id;
        return <article key={id} className="adventure-card overflow-hidden rounded-2xl">
          <div className="relative h-24 bg-black/25"><img src={`/assets/camp/locations/${image}`} alt={`Лагерь ${name}`} className="h-full w-full object-cover" /><span className={`absolute right-2 top-2 rounded-full border px-2 py-1 text-[10px] font-semibold ${selected ? 'border-brass bg-forest text-parchment' : owned ? 'border-moss-light/60 bg-forest/90 text-parchment' : 'border-parchment/25 bg-black/75 text-parchment/85'}`}>{selected ? 'Выбран' : owned ? 'Открыт' : 'Не открыт'}</span></div>
          <div className="p-3"><h3 className="font-display text-sm text-parchment">{name}</h3><button type="button" aria-label={selected ? `Лагерь ${name} выбран` : owned ? `Переключиться на лагерь ${name} бесплатно` : `Купить лагерь ${name} за 20 бриллиантов`} onClick={() => chooseCamp(id, name)} disabled={changingCamp || selected} className="shop-buy-button mt-2">{selected ? <><Check size={14} aria-hidden="true" />Выбран</> : owned ? 'Переключить бесплатно' : <>Купить · <CurrencyAmount amount={20} currency="crystals" /></>}</button></div>
        </article>;
      })}</div>
    </section>}

    {activeSection === 'gear' && <section aria-label="Предметы магазина">
      {itemsLoading ? <p role="status" className="adventure-card rounded-2xl p-3 text-sm text-parchment/80">Собираем снаряжение…</p> : itemsError ? <div role="alert" className="adventure-card rounded-2xl p-3 text-sm text-parchment">Не удалось загрузить снаряжение. Обновите страницу и попробуйте ещё раз.</div> : visibleItems.length === 0 ? <div className="adventure-card rounded-2xl p-6 text-center"><Package size={24} className="mx-auto mb-2 text-brass" aria-hidden="true" /><p className="text-sm text-parchment">Пока нет предметов в продаже.</p></div> : <div className="grid grid-cols-2 gap-3">{visibleItems.map((item) => {
        const owned = PERMANENT_ITEMS.has(item.name) && inventory.some((entry) => entry.shopItem.name === item.name);
        const amount = item.priceCoins ?? item.priceCrystals ?? 0;
        const currency = item.priceCoins != null ? 'coins' as const : 'crystals' as const;
        const category = ({ clothing: 'Одежда', backpack: 'Рюкзаки', headwear: 'Головные уборы', pet: 'Спутники', equipment: 'Снаряжение', camp: 'Для лагеря' } as Record<string, string>)[item.category] ?? 'Для путешествия';
        const assetUrl = SHOP_ITEM_ASSETS[item.name] ?? item.assetUrl;
        return <article key={item.id} className="adventure-card flex min-w-0 flex-col rounded-2xl p-3">
          <div className="mb-3 flex aspect-square max-h-36 items-center justify-center overflow-hidden rounded-xl border border-brass/20 bg-black/20">{assetUrl ? <img src={assetUrl} alt={item.name} className="h-full w-full object-contain p-3" /> : <Package size={35} className="text-brass/80" aria-hidden="true" />}</div>
          <p className="mb-1 min-h-10 text-sm font-semibold leading-snug text-parchment">{item.name}</p><p className="mb-2 text-xs text-parchment/70">{category}</p>
          <button onClick={() => confirmBeforePurchase({ title: item.name, description: 'Подтвердите покупку этого предмета.', amount, currency, busyId: item.id, confirm: () => buy(item) })} disabled={!!buyingId || owned} className="shop-buy-button mt-auto">{owned ? <><Check size={15} aria-hidden="true" />Уже есть</> : <><CurrencyAmount amount={amount} currency={currency} /> · Купить</>}</button>
        </article>;
      })}</div>}
    </section>}
    {pendingCamp && <Modal title="Купить новый лагерь?" onClose={() => { if (!changingCamp) setPendingCamp(null); }}>
      <p className="flex items-center gap-1 text-sm text-parchment">Открыть лагерь «{pendingCamp.name}» за <CurrencyAmount amount={20} currency="crystals" />?</p>
      <p className="mt-2 text-xs text-parchment/65">После покупки вы сможете переключаться между всеми открытыми лагерями бесплатно.</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={() => setPendingCamp(null)} disabled={changingCamp} className="adventure-secondary min-h-11 rounded-full px-3 text-sm disabled:opacity-50">Отмена</button>
        <button onClick={() => void changeCamp(pendingCamp.id)} disabled={changingCamp} className="shop-buy-button">{changingCamp ? 'Покупаем…' : <><CurrencyAmount amount={20} currency="crystals" /> · Купить</>}</button>
      </div>
    </Modal>}
    {pendingPurchase && <Modal title="Подтвердить покупку" onClose={() => { if (!buyingId) setPendingPurchase(null); }}>
      <div className="text-center">
        <p className="font-display text-base text-parchment">{pendingPurchase.title}</p>
        <p className="mt-2 text-sm text-parchment/70">{pendingPurchase.description}</p>
        <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-brass/40 bg-black/25 p-3 text-sm font-semibold text-brass"><span>К оплате:</span><CurrencyAmount amount={pendingPurchase.amount} currency={pendingPurchase.currency} /></div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={() => setPendingPurchase(null)} disabled={!!buyingId} className="adventure-secondary min-h-11 rounded-full px-3 text-sm disabled:opacity-50">Отмена</button>
          <button onClick={() => void pendingPurchase.confirm()} disabled={!!buyingId} className="shop-buy-button">{buyingId === pendingPurchase.busyId ? 'Покупаем…' : <>Оплатить <CurrencyAmount amount={pendingPurchase.amount} currency={pendingPurchase.currency} /></>}</button>
        </div>
      </div>
    </Modal>}
  </>;
}
