'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

export function AdminNewsPanel() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (user?.role !== 'admin') return null;

  async function publish() {
    setBusy(true); setMessage(null);
    try {
      await api.post('/game/news', { title, body });
      setTitle(''); setBody('');
      await queryClient.invalidateQueries({ queryKey: ['game', 'news', 'unread'] });
      setMessage('Новость опубликована. Игроки увидят её при следующем запуске.');
    } catch (error) { setMessage(error instanceof ApiError ? error.message : 'Не удалось опубликовать новость'); }
    finally { setBusy(false); }
  }

  return <section className="adventure-card mb-4 rounded-2xl p-4">
    <h2 className="mb-2 font-display text-sm text-parchment">Новости для игроков</h2>
    <p className="mb-3 text-[11px] text-parchment/60">Каждый игрок увидит публикацию один раз. Можно сообщать об обновлениях и событиях.</p>
    <input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder="Заголовок новости" className="mb-2 w-full rounded-xl border border-brass/25 bg-black/20 px-3 py-2 text-sm text-parchment placeholder:text-parchment/35 outline-none" />
    <textarea value={body} maxLength={5000} onChange={(event) => setBody(event.target.value)} rows={4} placeholder="Текст новости" className="w-full resize-y rounded-xl border border-brass/25 bg-black/20 px-3 py-2 text-xs text-parchment placeholder:text-parchment/35 outline-none" />
    {message && <p className="mt-2 text-[11px] text-brass">{message}</p>}
    <button onClick={() => void publish()} disabled={busy || !title.trim() || !body.trim()} className="mt-3 w-full rounded-full bg-moss py-2.5 text-xs text-parchment disabled:opacity-50">{busy ? 'Публикуем…' : 'Опубликовать для всех'}</button>
  </section>;
}
