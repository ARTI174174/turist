'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Flame, Backpack, TentTree, PackageCheck, Sparkles } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { useAuthStore } from '@/store/useAuthStore';

type CampKind = 'tent' | 'hearth' | 'backpack';
type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
type CampData = {
  progress: { tentLevel: number; hearthLevel: number; backpackLevel: number; storedCoins: number; tentBonusPercent: number; findChancePercent: number; hearthCoinsPerHour: number; hearthCapacity: number };
  inventory: { quantity: number; totalFound: number; item: { key: string; name: string; category: string; rarity: Rarity; description: string; sellCoins: number; assetUrl: string } }[];
  collections: { code: string; title: string; description: string; rewardCoins: number; found: number; total: number; claimed: boolean }[];
};

const LEVEL_PRICES = [0, 1500, 4500, 9000, 15000, 24000];
const EMPTY_CAMP: CampData = {
  progress: { tentLevel: 0, hearthLevel: 0, backpackLevel: 0, storedCoins: 0, tentBonusPercent: 0, findChancePercent: 0, hearthCoinsPerHour: 0, hearthCapacity: 0 },
  inventory: [],
  collections: [],
};
const LEVEL_LABELS: Record<CampKind, string[]> = {
  tent: ['Пустая площадка', 'Шалаш из веток', 'Тентовый навес', 'Походная палатка', 'Надувной уютный шатёр', 'Уральский бревенчатый дом'],
  hearth: ['Место для очага', 'Сухие ветки', 'Растопка с огоньком', 'Костёр с камнями', 'Походный костёр', 'Каменная печь'],
  backpack: ['Место для рюкзака', 'Узелок на палке', 'Тканевый мешок', 'Старый школьный рюкзак', 'Советский туристический рюкзак', 'Современный походный рюкзак'],
};
const LEVEL_BENEFIT: Record<CampKind, (level: number, camp: CampData['progress']) => string> = {
  tent: (level) => level ? `+${level * 2}% золота за каждое новое подтверждённое место.` : 'Увеличивает золото за новые подтверждённые посещения на 2% за уровень.',
  hearth: (level, camp) => level ? `Накапливает ${camp.hearthCoinsPerHour} золота в час. Вместимость — ${camp.hearthCapacity.toLocaleString('ru-RU')}.` : 'Постепенно копит золото, даже когда игра закрыта.',
  backpack: (level) => level ? `Шанс найти уникальную вещь на новой точке — ${[0, 10, 15, 20, 25, 30][level]}%.` : 'Даёт шанс находить коллекционные вещи на новых посещённых местах.',
};
const ITEM_CATEGORIES: Record<string, string> = { medal: 'Медали', crystal: 'Кристаллы', key: 'Ключи', compass: 'Компасы', artifact: 'Артефакты' };
const RARITY_LABELS: Record<Rarity, string> = { common: 'Обычный', uncommon: 'Необычный', rare: 'Редкий', epic: 'Эпический', legendary: 'Легендарный' };

function Coin({ amount }: { amount: number }) {
  return <span className="inline-flex items-center gap-1.5"><img src="/assets/icons/coin.png" alt="" className="h-4 w-4 object-contain" />{amount.toLocaleString('ru-RU')}</span>;
}

function CollectibleIcon({ src, className = '' }: { src: string; className?: string }) {
  return <span className={`flex shrink-0 items-center justify-center rounded-xl border border-brass/20 bg-black/25 p-1 ${className}`}><img src={src} alt="" loading="lazy" className="h-full w-full object-contain" /></span>;
}

export function CampYard() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const [selected, setSelected] = useState<CampKind | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const query = useQuery({ queryKey: ['game', 'camp'], queryFn: () => api.get<CampData>('/game/camp') });
  const data = query.data ?? EMPTY_CAMP;
  const levelFor = (kind: CampKind) => kind === 'tent' ? data.progress.tentLevel : kind === 'hearth' ? data.progress.hearthLevel : data.progress.backpackLevel;
  const updateCamp = useMutation({
    mutationFn: ({ kind }: { kind: CampKind }) => api.post<CampData>(`/game/camp/upgrade`, { kind }),
    onSuccess: async (camp) => { queryClient.setQueryData(['game', 'camp'], camp); const wallet = await api.get<{ coinsBalance: number; crystalsBalance: number }>('/wallet'); if (user) updateUser({ wallet: { ...user.wallet, ...wallet } }); setSelected(null); setNotice('Улучшение установлено в лагере!'); },
    onError: (error) => setNotice(error instanceof ApiError ? error.message : 'Не удалось обновить предмет.'),
  });
  const collect = useMutation({
    mutationFn: () => api.post<{ camp: CampData; amount: number }>('/game/camp/collect'),
    onSuccess: ({ camp, amount }) => { queryClient.setQueryData(['game', 'camp'], camp); if (user) updateUser({ wallet: { ...user.wallet, coinsBalance: user.wallet.coinsBalance + amount } }); setNotice(`Собрано ${amount.toLocaleString('ru-RU')} золота!`); },
    onError: (error) => setNotice(error instanceof ApiError ? error.message : 'Пока нечего собирать.'),
  });
  const sell = useMutation({
    mutationFn: ({ key, quantity }: { key: string; quantity: number }) => api.post<{ camp: CampData }>(`/game/collectibles/${encodeURIComponent(key)}/sell`, { quantity }),
    onSuccess: async ({ camp }) => { queryClient.setQueryData(['game', 'camp'], camp); const wallet = await api.get<{ coinsBalance: number; crystalsBalance: number }>('/wallet'); if (user) updateUser({ wallet: { ...user.wallet, ...wallet } }); setBusyItem(null); },
    onError: (error) => setNotice(error instanceof ApiError ? error.message : 'Не удалось продать предмет.'),
  });

  const renderObject = (kind: CampKind, label: string, icon: React.ReactNode, style: React.CSSProperties) => {
    const level = levelFor(kind);
    const assetRoot = kind === 'tent' ? '/assets/camp/objects/tent-v3' : kind === 'hearth' ? '/assets/camp/objects/hearth' : '/assets/camp/objects/backpack';
    const assetExtension = kind === 'backpack' ? 'webp' : 'png';
    return <button key={kind} onClick={() => setSelected(kind)} className="pointer-events-auto absolute z-[4] flex items-end justify-center bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass" style={style} aria-label={level ? `Улучшить: ${LEVEL_LABELS[kind][level]}` : `Купить: ${label}`}>
      {level > 0 ? <img src={`${assetRoot}-${level}.${assetExtension}`} alt={LEVEL_LABELS[kind][level]} loading="lazy" className="h-full w-full object-contain object-bottom drop-shadow-[0_6px_8px_rgba(0,0,0,0.55)]" /> : <span className="camp-price-sign relative mb-1 flex min-h-[58px] min-w-[86px] flex-col items-center justify-center rounded-md border border-[#d1ae66]/70 px-2 py-1.5 text-center shadow-[0_5px_10px_#0008]">
        <span className="flex items-center gap-1 text-[10px] font-semibold leading-tight text-[#fff2cf]">{icon}{label}</span><span className="mt-1 flex items-center gap-1 text-[11px] font-bold text-[#ffd274]"><img src="/assets/icons/coin.png" alt="" className="h-3.5 w-3.5" />1 500</span><span className="camp-price-sign-post" />
      </span>}
    </button>;
  };

  return <>
    <div aria-label="Предметы лагеря" className="pointer-events-none absolute inset-0 z-[5]">
      {renderObject('tent', 'Палатка', <TentTree size={12} />, { left: '55%', top: '16%', width: '44%', height: '50%' })}
      {renderObject('hearth', 'Костёр', <Flame size={12} />, { left: '37%', top: '51%', width: '29%', height: '23%' })}
      {renderObject('backpack', 'Рюкзак', <Backpack size={12} />, { left: '2%', top: '72%', width: '16%', height: '17%' })}
    </div>
    {selected && data && (() => {
      const kind = selected;
      const level = levelFor(kind);
      const next = level + 1;
      const maxed = level >= 5;
      const levelName = LEVEL_LABELS[kind][level];
      const description = kind === 'tent'
        ? 'Палатка улучшает награду золотом за новые подтверждённые посещения. Бонус не начисляется повторно за уже открытые точки.'
        : kind === 'hearth'
          ? 'Очаг медленно накапливает золото по серверному времени, даже пока приложение закрыто. Когда накопится запас, забери его здесь.'
          : 'Рюкзак даёт шанс найти одну из уникальных коллекционных вещей при первом подтверждённом посещении новой точки. Находки можно хранить и продавать.';
      return <Modal title={level ? levelName : `Установить: ${LEVEL_LABELS[kind][1]}`} onClose={() => setSelected(null)}>
        <div className="mb-3 rounded-2xl border border-brass/20 bg-black/25 p-3 text-center">
          <img src={`${kind === 'tent' ? '/assets/camp/objects/tent-v3' : kind === 'hearth' ? '/assets/camp/objects/hearth' : '/assets/camp/objects/backpack'}-${level || next}.${kind === 'backpack' ? 'webp' : 'png'}`} alt="" className="mx-auto h-36 w-full object-contain" />
          <p className="mt-1 font-display text-base text-parchment">{levelName}</p>
          <p className="mt-1 text-xs leading-relaxed text-parchment/70">{description}</p>
        </div>
        {kind === 'hearth' && level > 0 && <div className="mb-3 rounded-xl border border-brass/20 bg-black/25 p-3 text-center">
          <p className="text-xs text-parchment/70">Накоплено</p><p className="mt-1 text-lg font-semibold text-parchment"><Coin amount={data.progress.storedCoins} /> <span className="text-xs text-parchment/50">/ {data.progress.hearthCapacity.toLocaleString('ru-RU')}</span></p>
          <p className="mt-1 text-[11px] text-parchment/55">+{data.progress.hearthCoinsPerHour} золота в час</p>
          <button onClick={() => collect.mutate()} disabled={data.progress.storedCoins < 1 || collect.isPending} className="mt-2 w-full rounded-full border border-brass/40 bg-moss/80 py-2 text-xs font-semibold text-parchment disabled:opacity-40">{collect.isPending ? 'Собираем…' : 'Собрать золото'}</button>
        </div>}
        {kind === 'backpack' && <div className="mb-3 space-y-2">
          <div className="rounded-xl border border-brass/20 bg-black/25 p-3"><p className="text-xs text-parchment/70">Шанс находки на новой точке</p><p className="mt-1 text-lg font-semibold text-parchment">{data.progress.findChancePercent}%</p></div>
          {!!data.inventory.length && <div className="rounded-xl border border-brass/20 bg-black/25 p-3">
            <h3 className="mb-2 flex items-center gap-2 text-sm text-parchment"><PackageCheck size={15} className="text-brass" /> Находки</h3>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {data.inventory.map(({ item, quantity, totalFound }) => <div key={item.key} className="flex items-center gap-2 rounded-xl border border-brass/15 bg-black/20 p-2">
                <CollectibleIcon src={item.assetUrl} className="h-12 w-12" />
                <div className="min-w-0 flex-1"><p className="truncate text-xs text-parchment">{item.name}</p><p className="text-[10px] text-parchment/50">{RARITY_LABELS[item.rarity]} · найдено {totalFound}</p><p className="text-[10px] text-parchment/70">В рюкзаке: {quantity}</p></div>
                <button onClick={() => { setBusyItem(item.key); sell.mutate({ key: item.key, quantity: 1 }); }} disabled={sell.isPending && busyItem === item.key} className="rounded-lg border border-brass/25 px-2 py-1.5 text-[10px] text-parchment disabled:opacity-50"><Coin amount={item.sellCoins} /></button>
              </div>)}
            </div>
          </div>}
          <div className="rounded-xl border border-brass/20 bg-black/25 p-3"><h3 className="mb-2 flex items-center gap-2 text-sm text-parchment"><Sparkles size={15} className="text-brass" /> Коллекции</h3><div className="space-y-2">{data.collections.map((collection) => <div key={collection.code} className="rounded-lg border border-brass/15 p-2"><div className="flex justify-between gap-2 text-[11px]"><span className="text-parchment">{collection.title}</span><span className="text-brass">{collection.found}/{collection.total}</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/40"><div className="h-full rounded-full bg-moss-light" style={{ width: `${collection.total ? collection.found / collection.total * 100 : 0}%` }} /></div><p className="mt-1 text-[9px] text-parchment/45">{collection.claimed ? 'Награда получена' : `${collection.description} Награда: ${collection.rewardCoins.toLocaleString('ru-RU')} золота.`}</p></div>)}</div></div>
        </div>}
        <div className="rounded-xl border border-brass/20 bg-black/20 p-3 text-xs text-parchment/70"><p>Текущий уровень: <span className="text-parchment">{level}/5</span></p><p className="mt-1">{LEVEL_BENEFIT[kind](level, data.progress)}</p>{!maxed && <p className="mt-1">Следующий уровень: <span className="text-parchment">{LEVEL_LABELS[kind][next]}</span>. {kind === 'tent' ? `Бонус станет +${next * 2}%.` : kind === 'hearth' ? `Скорость: ${[0, 10, 20, 35, 50, 75][next]} в час, вместимость ${[0, 100, 250, 500, 1000, 2000][next]}.` : `Шанс находки: ${[0, 10, 15, 20, 25, 30][next]}%.`}</p>}</div>
        {!maxed ? <button onClick={() => updateCamp.mutate({ kind })} disabled={updateCamp.isPending} className="shop-buy-button mt-3">{updateCamp.isPending ? 'Устанавливаем…' : <><span>{level ? 'Подтвердить улучшение' : 'Подтвердить покупку'}</span><span>·</span><Coin amount={LEVEL_PRICES[next]} /></>}</button> : <p className="mt-3 rounded-full border border-brass/30 bg-moss/40 py-2 text-center text-xs text-parchment">Максимальный уровень</p>}
      </Modal>;
    })()}
    {notice && <Modal title="Лагерь" onClose={() => setNotice(null)}><p className="text-center text-sm text-parchment">{notice}</p><button onClick={() => setNotice(null)} className="shop-buy-button mt-4">Понятно</button></Modal>}
  </>;
}
