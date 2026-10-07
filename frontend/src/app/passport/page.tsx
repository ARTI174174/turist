'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TopHud } from '@/components/hud/TopHud';
import { BottomNav } from '@/components/nav/BottomNav';
import { useAuthStore } from '@/store/useAuthStore';
import { resolveLevel } from '@/lib/level';
import { api } from '@/lib/api';
import { Poi } from '@/types';
import { AvatarImage } from '@/components/character/AvatarImage';
import { POICard } from '@/components/map/POICard';
import { BookOpen, Building2, CalendarDays, ChevronDown, ChevronRight, Coins, Gem, Landmark, MapPin, Mountain, NotebookPen, Waves } from 'lucide-react';
import { TravelActivities } from '@/components/panels/TravelActivities';
import { RouteSuggestions } from '@/components/panels/RouteSuggestions';
import { usePlayerStore } from '@/store/usePlayerStore';

interface PassportVisit {
  id: string;
  xpAwarded: number;
  coinsAwarded: number;
  crystalsAwarded: number;
  note: string | null;
  visitedAt: string;
  poi: Poi;
}

const DIFFICULTY_LABEL: Record<string, string> = {
  hard: 'Сложно',
  medium: 'Средне',
  easy: 'Легко',
};

type PlaceFilter = 'all' | 'mountain' | 'city' | 'lake' | 'other';

function visitGroup(code: string): Exclude<PlaceFilter, 'all'> {
  if (code === 'mountain') return 'mountain';
  if (['city', 'township', 'village'].includes(code)) return 'city';
  if (code === 'lake') return 'lake';
  return 'other';
}

function visitWord(count: number) {
  const lastTwo = count % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return 'мест открыто';
  if (count % 10 === 1) return 'место открыто';
  if ([2, 3, 4].includes(count % 10)) return 'места открыто';
  return 'мест открыто';
}

export default function PassportPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const selectMapPoi = usePlayerStore((s) => s.selectPoi);
  const [hydrated, setHydrated] = useState(false);
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);
  const [placeFilter, setPlaceFilter] = useState<PlaceFilter>('all');

  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    if (hydrated && !user) router.replace('/login');
  }, [hydrated, user, router]);

  const { data: visits = [], isLoading: visitsLoading, isError: visitsError, refetch: refetchVisits } = useQuery<PassportVisit[]>({
    queryKey: ['passport'],
    queryFn: () => api.get<PassportVisit[]>('/visits/passport'),
    enabled: !!user,
  });

  if (!hydrated || !user) return null;

  const xp = user.progress?.xp ?? 0;
  const { level } = resolveLevel(xp);
  const progress = resolveLevel(xp);
  const xpInLevel = Math.max(0, xp - progress.currentThreshold);
  const xpForLevel = progress.nextThreshold == null ? null : progress.nextThreshold - progress.currentThreshold;
  const levelPercent = xpForLevel ? Math.min(100, Math.round((xpInLevel / xpForLevel) * 100)) : 100;
  const visitCounts: Record<PlaceFilter, number> = {
    all: visits.length,
    mountain: visits.filter(({ poi }) => visitGroup(poi.category?.code ?? '') === 'mountain').length,
    city: visits.filter(({ poi }) => visitGroup(poi.category?.code ?? '') === 'city').length,
    lake: visits.filter(({ poi }) => visitGroup(poi.category?.code ?? '') === 'lake').length,
    other: visits.filter(({ poi }) => visitGroup(poi.category?.code ?? '') === 'other').length,
  };
  const filteredVisits = visits.filter(({ poi }) => placeFilter === 'all' || visitGroup(poi.category?.code ?? '') === placeFilter);
  const filters: { id: PlaceFilter; label: string; icon: typeof MapPin }[] = [
    { id: 'all', label: 'Все места', icon: MapPin },
    { id: 'mountain', label: 'Горы', icon: Mountain },
    { id: 'city', label: 'Города', icon: Building2 },
    { id: 'lake', label: 'Озёра', icon: Waves },
    { id: 'other', label: 'Другие', icon: Landmark },
  ];

  return (
    <main className="relative h-full w-full overflow-hidden bg-forest-dark">
      <TopHud />

      <div
        className="bg-adventure h-full overflow-y-auto px-4 pb-[calc(10rem+env(safe-area-inset-bottom,0px))]"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 118px)' }}
      >
        <section className="adventure-card mb-5 overflow-hidden rounded-[26px] p-4" aria-labelledby="passport-heading">
          <div className="flex items-center gap-3">
            <AvatarImage value={user.character?.avatarEmoji} className="avatar-portrait h-[60px] w-[60px] shrink-0 rounded-full border-2 border-brass p-0.5 text-xl" imageClassName="rounded-full" />
            <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-parchment/70">Паспорт путешественника</p><h1 id="passport-heading" className="truncate font-display text-xl text-parchment">{user.nickname}</h1><p className="mt-0.5 text-xs text-parchment/80">Уровень {level}</p></div>
            <div className="passport-stamp h-[68px] w-[68px] shrink-0 flex-col"><span className="font-display text-xl leading-none">{visits.length}</span><span className="mt-1 text-[9px]">мест</span></div>
          </div>
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-xs"><span className="text-parchment/80">Опыт до следующего уровня</span><span className="font-semibold text-amber-light">{progress.nextThreshold == null ? 'Максимум' : `${xpInLevel.toLocaleString('ru-RU')} / ${xpForLevel?.toLocaleString('ru-RU')} XP`}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-black/35" role="progressbar" aria-label="Прогресс уровня" aria-valuemin={0} aria-valuemax={100} aria-valuenow={levelPercent}><div className="h-full rounded-full bg-gradient-to-r from-moss-light to-brass transition-[width] duration-500" style={{ width: `${levelPercent}%` }} /></div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2 border-t border-brass/20 pt-3">
            {filters.slice(1).map(({ id, label, icon: Icon }) => <div key={id} className="min-w-0 text-center"><Icon size={16} className="mx-auto mb-1 text-amber-light" aria-hidden="true" /><p className="truncate text-[10px] text-parchment/70">{label}</p><p className="font-display text-base text-parchment">{visitCounts[id]}</p></div>)}
          </div>
        </section>

        <details className="adventure-card mb-3 rounded-2xl p-3">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-1 text-sm font-semibold text-parchment focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-light [&::-webkit-details-marker]:hidden"><span className="flex items-center gap-2"><BookOpen size={17} className="text-amber-light" aria-hidden="true" />Экспедиции и маршруты</span><ChevronDown size={17} className="shrink-0 text-amber-light transition-transform" aria-hidden="true" /></summary>
          <div className="mt-3 space-y-4 border-t border-brass/20 pt-3"><TravelActivities /><RouteSuggestions /></div>
        </details>

        <section aria-labelledby="visited-heading" className="mb-5">
          <div className="mb-3 flex items-end justify-between gap-3"><div><h2 id="visited-heading" className="font-display text-lg text-parchment">Мои открытия</h2><p className="mt-0.5 text-xs text-parchment/70">Каждое место — часть твоего пути</p></div><span className="whitespace-nowrap text-xs text-amber-light">{visits.length} {visitWord(visits.length)}</span></div>
          <div role="group" aria-label="Фильтр посещённых мест" className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {filters.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-pressed={placeFilter === id} onClick={() => setPlaceFilter(id)} className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-light ${placeFilter === id ? 'border-brass bg-moss text-parchment shadow-md' : 'border-brass/30 bg-panel/70 text-parchment/80'}`}><Icon size={15} aria-hidden="true" />{label}<span className="text-[10px] opacity-80">{visitCounts[id]}</span></button>)}
          </div>
          {visitsError ? <div role="alert" className="adventure-card rounded-2xl p-4 text-center"><p className="text-sm text-parchment">Не удалось загрузить паспорт.</p><button onClick={() => void refetchVisits()} className="adventure-secondary mt-3 min-h-11 rounded-full px-4 text-sm">Попробовать ещё раз</button></div> : visitsLoading ? <div role="status" className="adventure-card rounded-2xl p-4 text-sm text-parchment/75">Загружаем твои открытия…</div> : <div className="space-y-3">
            {filteredVisits.map((v) => <VisitCard key={v.id} visit={v} onOpen={() => setSelectedPoi(v.poi)} />)}
            {filteredVisits.length === 0 && <div className="adventure-card rounded-2xl p-5 text-center"><span className="passport-stamp mx-auto mb-3 h-12 w-12"><MapPin size={20} aria-hidden="true" /></span><p className="font-display text-base text-parchment">{visits.length === 0 ? 'Здесь начнётся твой путь' : 'Пока нет мест в этой группе'}</p><p className="mt-1 text-sm text-parchment/70">{visits.length === 0 ? 'Исследуй первую точку — она появится в паспорте.' : 'Открой точку этой категории, и она добавится сюда.'}</p>{visits.length === 0 && <button onClick={() => router.push('/map')} className="adventure-primary mt-4 min-h-11 rounded-full px-5 text-sm font-semibold">Найти первую точку</button>}</div>}
          </div>}
        </section>

      </div>

      {selectedPoi && <POICard poi={selectedPoi} position={null} hideExplore onClose={() => setSelectedPoi(null)} onShowOnMap={() => { selectMapPoi(selectedPoi); router.push('/map'); }} />}
      <BottomNav />
    </main>
  );
}

function VisitCard({ visit, onOpen }: { visit: PassportVisit; onOpen: () => void }) {
  const [note, setNote] = useState(visit.note ?? '');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  async function saveNote() {
    setSaving(true);
    setNoteError(null);
    try {
      await api.patch(`/visits/${visit.id}/note`, { note: note.slice(0, 50) });
      await queryClient.invalidateQueries({ queryKey: ['passport'] });
      setEditing(false);
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : 'Не удалось сохранить заметку. Попробуй ещё раз.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="adventure-card overflow-hidden rounded-2xl">
      <button onClick={onOpen} aria-label={`Открыть карточку места ${visit.poi.title} и комментарии`} className="flex min-h-[104px] w-full items-center gap-3 p-3 text-left transition-colors hover:bg-white/[0.025] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-light">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 bg-black/20" style={{ borderColor: visit.poi.category?.colorHex ?? '#c68a3a', color: visit.poi.category?.colorHex ?? '#c68a3a' }}><MapPin size={22} aria-hidden="true" /></span>
        <span className="min-w-0 flex-1">
          <span className="mb-1 flex flex-wrap items-center gap-1.5"><span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-forest-dark" style={{ backgroundColor: visit.poi.category?.colorHex ?? '#c68a3a' }}>{visit.poi.category?.title ?? 'Место'}</span><span className="text-[10px] text-parchment/75">{DIFFICULTY_LABEL[visit.poi.difficulty] ?? visit.poi.difficulty}</span></span>
          <span className="block truncate font-display text-base leading-snug text-parchment">{visit.poi.title}</span>
          <span className="mt-1 flex items-center gap-1 text-xs text-parchment/70"><CalendarDays size={13} aria-hidden="true" />{new Date(visit.visitedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-amber-light" aria-hidden="true" />
      </button>

      <div className="flex flex-wrap gap-2 border-t border-brass/20 px-3 py-2.5" aria-label="Награды за посещение">
        <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-brass/25 bg-black/20 px-2.5 text-xs font-semibold text-parchment"><span className="text-amber-light">+{visit.xpAwarded.toLocaleString('ru-RU')}</span> XP</span>
        {visit.coinsAwarded > 0 && <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-brass/25 bg-black/20 px-2.5 text-xs font-semibold text-parchment"><Coins size={14} className="text-amber-light" aria-hidden="true" />+{visit.coinsAwarded.toLocaleString('ru-RU')}</span>}
        {visit.crystalsAwarded > 0 && <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-brass/25 bg-black/20 px-2.5 text-xs font-semibold text-parchment"><Gem size={14} className="text-sky-300" aria-hidden="true" />+{visit.crystalsAwarded.toLocaleString('ru-RU')}</span>}
      </div>

      {editing ? (
        <div className="border-t border-brass/15 px-3 py-2.5">
          <label htmlFor={`visit-note-${visit.id}`} className="mb-1 block text-xs font-medium text-parchment/80">Заметка для воспоминаний</label>
          <input
            id={`visit-note-${visit.id}`}
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 50))}
            placeholder="Что запомнилось?"
            className="min-h-11 w-full rounded-xl border border-brass/30 bg-black/25 px-3 text-sm text-parchment outline-none placeholder:text-parchment/50 focus:border-brass focus-visible:ring-2 focus-visible:ring-brass/40"
          />
          {noteError && <p role="alert" className="mt-1 text-xs text-amber-light">{noteError}</p>}
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-xs text-parchment/65">{note.length}/50</span>
            <div className="flex gap-2">
              <button onClick={() => { setNote(visit.note ?? ''); setNoteError(null); setEditing(false); }} className="adventure-secondary min-h-10 rounded-full px-3 text-xs">
                Отмена
              </button>
              <button onClick={() => void saveNote()} disabled={saving} className="adventure-primary min-h-10 rounded-full px-4 text-xs font-semibold disabled:opacity-50">
                {saving ? 'Сохраняем…' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} aria-label={note ? `Изменить заметку: ${note}` : `Добавить заметку о месте ${visit.poi.title}`} className="flex min-h-11 w-full items-center gap-2 border-t border-brass/15 px-3 text-left text-sm text-parchment/75 transition-colors hover:bg-white/[0.025] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass">
          <NotebookPen size={15} className="shrink-0 text-amber-light" aria-hidden="true" />
          <span className="truncate">{note || 'Добавить заметку о поездке'}</span>
        </button>
      )}

      <PlaceFlagButton poiId={visit.poi.id} />
    </article>
  );
}

function PlaceFlagButton({ poiId }: { poiId: string }) {
  const queryClient = useQueryClient(); const { data } = useQuery<{ owned: boolean; placedPoiId: string | null }>({ queryKey: ['flags', 'design'], queryFn: () => api.get('/flags/design') });
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState<string | null>(null);
  if (!data?.owned) return null;
  const current = data;
  async function toggle() {
    setBusy(true); setMessage(null);
    try {
      if (current.placedPoiId === poiId) await api.delete(`/flags/${poiId}`);
      else await api.post(`/flags/${poiId}`, {});
      await queryClient.invalidateQueries({ queryKey: ['flags', 'design'] });
      await queryClient.invalidateQueries({ queryKey: ['poi', 'list'] });
      setMessage(current.placedPoiId === poiId ? 'Флаг вернулся в лагерь.' : 'Флаг оставлен на точке до её посещения другим игроком.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Не удалось разместить флаг'); }
    finally { setBusy(false); }
  }
  return <div className="flex items-center justify-between gap-2 border-t border-brass/15 px-3 py-1"><button onClick={() => void toggle()} disabled={busy} className="min-h-11 px-1 text-left text-xs font-medium text-amber-light transition-colors hover:text-parchment focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-light disabled:opacity-50">{busy ? 'Обновляем флаг…' : current.placedPoiId === poiId ? 'Забрать флаг в лагерь' : 'Оставить свой флаг'}</button>{message && <span role="status" className="text-right text-xs text-parchment/75">{message}</span>}</div>;
}
