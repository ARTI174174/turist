'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { Poi } from '@/types';
import { useAuthStore } from '@/store/useAuthStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Modal } from '@/components/ui/Modal';

interface SharedRoute {
  id: string; title: string; description: string | null; status: string; author?: { nickname: string } | null;
  stops: { orderIndex: number; poi: Poi }[]; rating?: number; reviewCount?: number;
  reviews?: { id: string; rating: number; text: string; user: { nickname: string } }[];
}

export function RouteSuggestions() {
  const router = useRouter(); const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user); const selectPoi = usePlayerStore((state) => state.selectPoi);
  const [search, setSearch] = useState(''); const [sort, setSort] = useState<'rating' | 'newest'>('rating');
  const [creating, setCreating] = useState(false); const [title, setTitle] = useState(''); const [description, setDescription] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]); const [error, setError] = useState<string | null>(null); const [notice, setNotice] = useState<string | null>(null);
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, { rating: number; text: string }>>({});
  const { data: routes = [] } = useQuery<SharedRoute[]>({ queryKey: ['routes', search, sort], queryFn: () => api.get(`/routes?search=${encodeURIComponent(search)}&sort=${sort}`) });
  const { data: mine = [] } = useQuery<SharedRoute[]>({ queryKey: ['routes', 'mine'], queryFn: () => api.get('/routes/mine') });
  const { data: catalogue = [] } = useQuery<Poi[]>({ queryKey: ['routes', 'poi-catalogue'], queryFn: () => api.get('/poi') });
  const { data: pending = [] } = useQuery<SharedRoute[]>({ queryKey: ['routes', 'pending'], queryFn: () => api.get('/routes/pending'), enabled: user?.role === 'admin' });
  const catalogueOptions = useMemo(() => catalogue.slice(0, 500), [catalogue]);

  function openPoint(poi: Poi) { selectPoi(poi); router.push('/map'); }
  function togglePoint(id: string) { setSelectedIds((ids) => ids.includes(id) ? ids.filter((current) => current !== id) : ids.length < 10 ? [...ids, id] : ids); }
  async function submitRoute() {
    setError(null);
    try {
      await api.post('/routes', { title, description, poiIds: selectedIds }); setCreating(false); setTitle(''); setDescription(''); setSelectedIds([]); setNotice('Маршрут отправлен на проверку администрации.');
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['routes', 'mine'] }), queryClient.invalidateQueries({ queryKey: ['routes', 'pending'] })]);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Не удалось отправить маршрут'); }
  }
  async function submitReview(routeId: string) {
    const draft = reviewDrafts[routeId]; if (!draft) return;
    try { await api.post(`/routes/${routeId}/reviews`, draft); setNotice('Отзыв опубликован.'); await queryClient.invalidateQueries({ queryKey: ['routes'] }); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Не удалось отправить отзыв'); }
  }
  async function moderate(routeId: string, action: 'approve' | 'delete') {
    try { if (action === 'approve') await api.patch(`/routes/${routeId}/approve`, {}); else await api.delete(`/routes/${routeId}`); await queryClient.invalidateQueries({ queryKey: ['routes'] }); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Не удалось обработать маршрут'); }
  }

  return <section className="adventure-card space-y-3 rounded-2xl p-3">
    <div className="flex items-center justify-between gap-2"><h2 className="font-display text-sm text-parchment">Маршруты участников</h2><button onClick={() => setCreating(true)} className="rounded-full bg-moss px-3 py-1.5 text-[10px] text-parchment">Предложить маршрут</button></div>
    <p className="text-[10px] text-parchment/60">Добавь до 10 точек по порядку. После проверки маршрут станет общим.</p>
    {notice && <p className="rounded-lg bg-moss/15 p-2 text-center text-xs text-parchment">{notice}</p>}{error && <p className="rounded-lg bg-danger/15 p-2 text-center text-xs text-danger">{error}</p>}
    <div className="flex gap-2"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Найти маршрут" className="min-w-0 flex-1 rounded-full border border-brass/30 bg-black/20 px-3 py-2 text-xs text-parchment" /><select value={sort} onChange={(e) => setSort(e.target.value as 'rating' | 'newest')} className="rounded-full border border-brass/30 bg-panel px-2 text-[10px] text-parchment"><option value="rating">По оценке</option><option value="newest">Сначала новые</option></select></div>
    {routes.map((route) => <article key={route.id} className="rounded-xl border border-brass/20 bg-black/15 p-3">
      <div className="flex justify-between gap-2"><h3 className="text-sm font-semibold text-parchment">{route.title}</h3><span className="shrink-0 text-[10px] text-brass">★ {route.rating?.toFixed(1) ?? '—'} · {route.reviewCount ?? 0}</span></div>
      <p className="my-1 text-[10px] text-parchment/65">Автор: {route.author?.nickname ?? 'путешественник'}</p>{route.description && <p className="mb-2 text-xs text-parchment/80">{route.description}</p>}
      <div className="space-y-1">{route.stops.map((stop, index) => <button key={stop.poi.id} onClick={() => openPoint(stop.poi)} className="block w-full truncate text-left text-[11px] text-brass">{index + 1}. {stop.poi.title} →</button>)}</div>
      {route.reviews?.slice(0, 3).map((review) => <p key={review.id} className="mt-2 text-[10px] text-parchment/65">★ {review.rating} · {review.user.nickname}: {review.text}</p>)}
      <div className="mt-2 flex gap-2"><select aria-label="Оценка маршрута" value={reviewDrafts[route.id]?.rating ?? 5} onChange={(e) => setReviewDrafts((current) => ({ ...current, [route.id]: { rating: Number(e.target.value), text: current[route.id]?.text ?? '' } }))} className="rounded-lg bg-panel px-2 text-xs text-parchment">{[5,4,3,2,1].map((value) => <option key={value} value={value}>{value} ★</option>)}</select><input value={reviewDrafts[route.id]?.text ?? ''} onChange={(e) => setReviewDrafts((current) => ({ ...current, [route.id]: { rating: current[route.id]?.rating ?? 5, text: e.target.value } }))} maxLength={500} placeholder="Оставить отзыв" className="min-w-0 flex-1 rounded-lg border border-brass/20 bg-black/20 px-2 text-xs text-parchment" /><button onClick={() => void submitReview(route.id)} className="text-xs text-brass">Отправить</button></div>
    </article>)}
    {routes.length === 0 && <p className="text-center text-xs text-stone">Пока нет опубликованных маршрутов.</p>}
    {mine.length > 0 && <details><summary className="cursor-pointer text-xs text-parchment/70">Мои заявки ({mine.length})</summary>{mine.map((route) => <p key={route.id} className="mt-1 text-[10px] text-stone">{route.title} · {route.status === 'pending' ? 'на проверке' : route.status}</p>)}</details>}
    {pending.length > 0 && <details><summary className="cursor-pointer text-xs text-brass">На проверке ({pending.length})</summary>{pending.map((route) => <div key={route.id} className="mt-2 rounded-lg bg-black/20 p-2"><p className="text-xs text-parchment">{route.title} · {route.author?.nickname}</p><div className="mt-1 flex gap-3"><button onClick={() => void moderate(route.id, 'approve')} className="text-xs text-moss-light">Одобрить</button><button onClick={() => void moderate(route.id, 'delete')} className="text-xs text-danger">Удалить</button></div></div>)}</details>}
    {creating && <Modal title="Предложить экспедицию" onClose={() => setCreating(false)}><div className="space-y-3">
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="Название маршрута" className="w-full rounded-xl border border-brass/30 bg-black/20 p-3 text-sm text-parchment" />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} placeholder="Описание маршрута" className="h-20 w-full rounded-xl border border-brass/30 bg-black/20 p-3 text-sm text-parchment" />
      <p className="text-xs text-parchment/70">Выбери точки по порядку: {selectedIds.length}/10</p>
      <div className="max-h-48 space-y-1 overflow-y-auto">{catalogueOptions.map((poi) => <button key={poi.id} onClick={() => togglePoint(poi.id)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs ${selectedIds.includes(poi.id) ? 'bg-moss/30 text-parchment' : 'bg-black/15 text-parchment/75'}`}><span className="w-5 text-brass">{selectedIds.includes(poi.id) ? selectedIds.indexOf(poi.id) + 1 : '+'}</span><span className="truncate">{poi.title}</span></button>)}</div>
      <button onClick={() => void submitRoute()} disabled={!title.trim() || !selectedIds.length} className="w-full rounded-full bg-moss py-3 text-sm text-parchment disabled:opacity-40">Отправить на проверку</button>
    </div></Modal>}
  </section>;
}
